import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { getBrowser } from '@/lib/puppeteerBrowser';

interface AuditedClaim {
  claim: string;
  status: 'Verified' | 'Needs Citation' | 'Factual Alert';
  suggestion: string;
}

interface CredibilityReport {
  credibilityIndex: number;
  eeatRating: 'Excellent' | 'Good' | 'Needs Improvement' | 'Critical Risk';
  citationsFound: number;
  statisticsDensity: 'High' | 'Medium' | 'Low';
  privacyPageFound: boolean;
  contactPageFound: boolean;
  authorPresenceFound: boolean;
  schemasDetected: string[];
  aiGroundingIndex: number;
  copyToneProfile: 'Balanced & Informational' | 'Moderately Salesy' | 'Overly Hypey';
  socialProofRating: 'High' | 'Medium' | 'Low' | 'Not Found';
  claims: AuditedClaim[];
  trustCopySuggestions: string[];
}

function cleanUrl(input: string): string {
  let clean = input.trim();
  if (!/^https?:\/\//i.test(clean)) {
    clean = `https://${clean}`;
  }
  return clean;
}

function getDomainHostname(urlStr: string): string {
  try {
    let clean = urlStr.trim().toLowerCase();
    if (!/^https?:\/\//i.test(clean)) {
      clean = `http://${clean}`;
    }
    const host = new URL(clean).hostname;
    return host.replace(/^www\./i, '');
  } catch {
    return urlStr.replace(/^www\./i, '').trim().toLowerCase();
  }
}

async function scrapePageForTrust(targetUrl: string) {
  try {
    const clean = cleanUrl(targetUrl);
    let html = '';
    let finalUrl = clean;

    try {
      const res = await fetch(clean, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        next: { revalidate: 3600 }
      });
      if (res.ok) {
        html = await res.text();
        finalUrl = res.url;
      }
    } catch (fetchErr) {
      console.warn(`Standard fetch failed for ${targetUrl}:`, fetchErr);
    }

    if (!html) {
      try {
        console.log(`Attempting Puppeteer crawl fallback for ${targetUrl}...`);
        const browser = await getBrowser();
        const page = await browser.newPage();
        await page.setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
        await page.setViewport({ width: 1280, height: 800 });
        
        await page.goto(clean, { waitUntil: 'domcontentloaded', timeout: 20000 });
        html = await page.content();
        finalUrl = page.url();
        await page.close();
      } catch (puppeteerErr) {
        console.error("Puppeteer crawl fallback failed:", puppeteerErr);
        return null;
      }
    }

    if (!html) return null;
    const $ = cheerio.load(html);

    const title = $('title').text().trim() || '';
    const description = $('meta[name="description"]').attr('content')?.trim() || '';

    // Check for JSON-LD schemas BEFORE deleting script tags
    const schemasDetected: string[] = [];
    $('script[type="application/ld+json"]').each((_, elem) => {
      try {
        const text = $(elem).html()?.trim();
        if (text) {
          const parsed = JSON.parse(text);
          if (parsed['@type']) {
            schemasDetected.push(parsed['@type']);
          } else if (Array.isArray(parsed)) {
            parsed.forEach(item => {
              if (item['@type']) schemasDetected.push(item['@type']);
            });
          }
        }
      } catch {}
    });

    // Check for core trust pages links
    let privacyPageFound = false;
    let contactPageFound = false;
    let outboundCitationsCount = 0;

    $('a').each((_, elem) => {
      const href = $(elem).attr('href') || '';
      const linkText = $(elem).text().toLowerCase();

      if (/privacy/i.test(href) || /privacy/i.test(linkText)) privacyPageFound = true;
      if (/contact/i.test(href) || /contact/i.test(linkText) || /support/i.test(href)) contactPageFound = true;

      // check if link goes outside target domain
      if (/^https?:\/\//i.test(href)) {
        try {
          const host = new URL(href).hostname;
          const rootHost = new URL(clean).hostname;
          if (host !== rootHost && !host.includes(rootHost.replace('www.', ''))) {
            outboundCitationsCount++;
          }
        } catch {}
      }
    });

    $('script, style, iframe, nav, header, footer').remove();
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim().substring(0, 3000);

    // Look for basic author tags
    const authorPresenceFound = /author|by\s+[A-Z][a-z]+(\s+[A-Z][a-z]+)?|written\s+by/i.test(bodyText);

    return {
      title,
      description,
      bodyText,
      privacyPageFound,
      contactPageFound,
      outboundCitationsCount,
      authorPresenceFound,
      schemasDetected
    };
  } catch {
    return null;
  }
}

async function queryDeepSeek(prompt: string): Promise<any> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey || apiKey.includes('YOUR_KEY')) {
    throw new Error('DeepSeek API Key is not set in env');
  }

  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      response_format: { type: 'json_object' }
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`DeepSeek status ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('Empty response');
  return JSON.parse(text.trim());
}

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    if (!url) {
      return NextResponse.json({ error: 'Website URL is required' }, { status: 400 });
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey || apiKey.includes('YOUR_KEY')) {
      return NextResponse.json({ 
        error: 'DeepSeek API Key is unconfigured. Please configure DEEPSEEK_API_KEY in your .env.local file to run live source audits.' 
      }, { status: 400 });
    }

    const cleanSeed = cleanUrl(url);
    const domainName = getDomainHostname(cleanSeed);

    const scrapResult = await scrapePageForTrust(cleanSeed);
    if (!scrapResult) {
      return NextResponse.json({ error: 'Failed to crawl website page. Verify the URL is public and try again.' }, { status: 400 });
    }

    // Determine stats density on server-side
    const numbersCount = (scrapResult.bodyText.match(/\b\d+(\.\d+)?%?\b/g) || []).length;
    const statisticsDensity = numbersCount > 8 ? 'High' : numbersCount > 3 ? 'Medium' : 'Low';

    const prompt = `
You are an expert AI Generative Search Optimization (GEO) and EEAT credibility auditor. Analyze the following crawled landing page text context:
Domain: "${domainName}"
Scraped Title: "${scrapResult.title}"
Scraped Description: "${scrapResult.description}"
Scraped Page Text: "${scrapResult.bodyText}"

Core checks performed by crawler:
- Outbound verification links found: ${scrapResult.outboundCitationsCount}
- Basic Author signature present: ${scrapResult.authorPresenceFound}
- Privacy policy page detected: ${scrapResult.privacyPageFound}
- Contact / support links detected: ${scrapResult.contactPageFound}
- Numeric/Statistics density: ${statisticsDensity} (${numbersCount} numbers found)
- Detected JSON-LD Structured Data: [${scrapResult.schemasDetected.join(', ')}]

Evaluate the credibility, factuality, and authority of this copy.
1. Factual Claims Audit: Find 4 major assertions or claims in the text (e.g. "we are the best", "our products reduce energy by 40%", "founded in 1999"). For each, assign a status:
   - "Verified": if backed by statistics or clear context.
   - "Needs Citation": if the claim is useful but requires a specific outbound link or reference to prove it.
   - "Factual Alert": if it is a generic, unverified bold claim that AI engines might ignore or flag as marketing hype.
   Provide a brief, concrete optimization suggestion for each claim.
2. Determine an overall "credibilityIndex" (0 to 100) based on link backing, fact check status, and core trust pages.
3. Classify "eeatRating": "Excellent" | "Good" | "Needs Improvement" | "Critical Risk".
4. Evaluate "aiGroundingIndex" (0 to 100): How easily an LLM can parse and map facts from the copy layout (bullet points count, headings, clear statements).
5. Assess "copyToneProfile": "Balanced & Informational" | "Moderately Salesy" | "Overly Hypey".
6. Assess "socialProofRating": "High" | "Medium" | "Low" | "Not Found" based on customer testimonials, Trustpilot references, or client logos in text.
7. Generate 3 specific "trustCopySuggestions" (GEO trust injection modifications) to paste directly onto the site to solve the gaps.

Return ONLY strict valid JSON matching this layout:
{
  "credibilityIndex": number,
  "eeatRating": "Excellent" | "Good" | "Needs Improvement" | "Critical Risk",
  "aiGroundingIndex": number,
  "copyToneProfile": "Balanced & Informational" | "Moderately Salesy" | "Overly Hypey",
  "socialProofRating": "High" | "Medium" | "Low" | "Not Found",
  "claims": [
    {
      "claim": "string",
      "status": "Verified" | "Needs Citation" | "Factual Alert",
      "suggestion": "string"
    }
  ],
  "trustCopySuggestions": ["string"]
}
`;

    const report = await queryDeepSeek(prompt);
    
    // Merge scraped data back into report response
    const finalReport: CredibilityReport = {
      credibilityIndex: report.credibilityIndex || 60,
      eeatRating: report.eeatRating || 'Needs Improvement',
      citationsFound: scrapResult.outboundCitationsCount,
      statisticsDensity: statisticsDensity,
      privacyPageFound: scrapResult.privacyPageFound,
      contactPageFound: scrapResult.contactPageFound,
      authorPresenceFound: scrapResult.authorPresenceFound,
      schemasDetected: scrapResult.schemasDetected,
      aiGroundingIndex: report.aiGroundingIndex || 50,
      copyToneProfile: report.copyToneProfile || 'Moderately Salesy',
      socialProofRating: report.socialProofRating || 'Low',
      claims: report.claims || [],
      trustCopySuggestions: report.trustCopySuggestions || []
    };

    return NextResponse.json(finalReport);

  } catch (error: any) {
    console.error('Source Credibility API error:', error);
    return NextResponse.json({ error: error.message || 'Failed to complete Source Credibility audit.' }, { status: 500 });
  }
}
