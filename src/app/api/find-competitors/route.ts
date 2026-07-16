import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

interface PricingInfo {
  hasPricingPage: boolean;
  tiers: string[];
  details: string;
}

interface CompetitorDetail {
  domain: string;
  niche: string;
  seoScore: number;
  pricing: PricingInfo;
  strengths: string[];
  weaknesses: string[];
}

interface YourWebsiteDetail {
  domain: string;
  niche: string;
  pricing: PricingInfo;
}

// Normalizes domain/URL input
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

// Free DuckDuckGo Scraper
async function scrapeDuckDuckGo(promptText: string): Promise<string[]> {
  try {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(promptText)}`;
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      next: { revalidate: 0 }
    });

    if (!response.ok) return [];

    const html = await response.text();
    const $ = cheerio.load(html);
    const links: string[] = [];

    $('.result__a').each((_, el) => {
      const href = $(el).attr('href');
      if (href) {
        try {
          if (href.startsWith('//')) {
            const absoluteUrl = new URL(`https:${href}`);
            const uddg = absoluteUrl.searchParams.get('uddg');
            if (uddg) links.push(decodeURIComponent(uddg));
          } else if (href.startsWith('/l/?')) {
            const absoluteUrl = new URL(href, 'https://html.duckduckgo.com');
            const uddg = absoluteUrl.searchParams.get('uddg');
            if (uddg) links.push(decodeURIComponent(uddg));
          } else {
            links.push(href);
          }
        } catch {
          // Ignore
        }
      }
    });

    return links;
  } catch (err: any) {
    console.error(`DuckDuckGo fail in findCompetitors:`, err.message);
    return [];
  }
}

// Crawler helper to fetch multiple pages of a website
async function crawlSitePages(startUrl: string, maxPages = 5): Promise<{ title: string; description: string; combinedText: string; pricingLinksFound: string[] }> {
  const cleanStart = cleanUrl(startUrl);
  const hostname = getDomainHostname(cleanStart);
  
  const visited = new Set<string>();
  const queue: string[] = [cleanStart];
  const pricingLinksFound: string[] = [];
  
  let combinedText = '';
  let title = '';
  let description = '';

  while (queue.length > 0 && visited.size < maxPages) {
    const current = queue.shift();
    if (!current) continue;
    
    let normalized = current;
    try {
      const urlObj = new URL(current);
      urlObj.hash = '';
      if (urlObj.pathname.endsWith('/')) {
        urlObj.pathname = urlObj.pathname.slice(0, -1);
      }
      normalized = urlObj.toString();
    } catch {
      continue;
    }

    if (visited.has(normalized)) continue;
    visited.add(normalized);

    try {
      const response = await fetch(normalized, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        next: { revalidate: 3600 }
      });

      if (!response.ok) continue;

      const html = await response.text();
      const $ = cheerio.load(html);

      if (normalized === cleanStart) {
        title = $('title').text().trim() || '';
        description = $('meta[name="description"]').attr('content')?.trim() || '';
      }

      $('script, style, iframe, nav, header, footer').remove();
      const pageText = $('body').text().replace(/\s+/g, ' ').trim();
      combinedText += `\n--- PAGE: ${normalized} ---\n${pageText.substring(0, 1500)}\n`;

      $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        if (href) {
          try {
            const absoluteUrl = new URL(href, normalized).toString();
            const linkHost = getDomainHostname(absoluteUrl);
            const pathLower = absoluteUrl.toLowerCase();

            if (linkHost === hostname) {
              if (pathLower.includes('pricing') || pathLower.includes('price') || pathLower.includes('subscription') || pathLower.includes('plan') || pathLower.includes('cost')) {
                if (!pricingLinksFound.includes(absoluteUrl)) {
                  pricingLinksFound.push(absoluteUrl);
                }
              }

              if (!visited.has(absoluteUrl) && !queue.includes(absoluteUrl) && queue.length < 10) {
                if (pathLower.includes('about') || pathLower.includes('pricing') || pathLower.includes('services')) {
                  queue.unshift(absoluteUrl);
                } else {
                  queue.push(absoluteUrl);
                }
              }
            }
          } catch {
            // Ignore
          }
        }
      });
    } catch (err: any) {
      console.warn(`Crawler failed for page ${normalized}: ${err.message}`);
    }
  }

  return {
    title,
    description,
    combinedText: combinedText.substring(0, 5000),
    pricingLinksFound
  };
}

// Analyzes competitor SEO metadata structure
function evaluateSeoScore($: cheerio.CheerioAPI): number {
  let score = 0;
  if ($('title').text().trim()) score += 20;
  if ($('meta[name="description"]').attr('content')?.trim()) score += 20;
  if ($('h1').length > 0) score += 20;
  if ($('link[rel="canonical"]').attr('href')) score += 20;
  
  $('script, style, iframe, nav, header, footer').remove();
  const words = $('body').text().split(/\s+/).filter(Boolean).length;
  if (words > 400) {
    score += 20;
  } else if (words > 150) {
    score += 10;
  }

  return score;
}

// DeepSeek API Helper (deepseek-chat)
async function queryDeepSeek(prompt: string, jsonFormat = true): Promise<any> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey || apiKey.includes('YOUR_KEY')) {
    throw new Error('DeepSeek API Key is not set in .env.local');
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
      temperature: 0.1,
      response_format: jsonFormat ? { type: 'json_object' } : undefined
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`DeepSeek API status ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('Empty response from DeepSeek');

  return jsonFormat ? JSON.parse(text.trim()) : text;
}

export async function POST(req: Request) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const isMock = !apiKey || apiKey.includes('YOUR_KEY');
  let domainName = '';
  let parsedLimit = 3;
  let mockYourWebsite: any = null;
  let mockCompetitors: any[] = [];
  let requestUrl = '';

  try {
    const { url, engine = 'duckduckgo', limit = 3, simulated = false } = await req.json();
    requestUrl = url;
    parsedLimit = Math.min(5, Math.max(1, limit));

    if (!url) {
      return NextResponse.json({ error: 'Your Website URL is required' }, { status: 400 });
    }

    const targetUrl = cleanUrl(url);
    domainName = getDomainHostname(targetUrl);

    // Dynamic Mock Fallback selection based on domain name keyword mapping
    const isTechRelated = /tech|support|service|printer|help|repair|pc|computer|server|system|network|soft/i.test(domainName);

    mockYourWebsite = isTechRelated ? {
      domain: domainName,
      niche: 'Managed Tech Support & Printer Setup Services',
      pricing: {
        hasPricingPage: false,
        tiers: ['Quote-based / Custom pricing only'],
        details: 'Pricing is custom calculated depending on business support requirements or device count.'
      }
    } : {
      domain: domainName,
      niche: 'Apparel & Shoe Retail Store',
      pricing: {
        hasPricingPage: true,
        tiers: ['Sneakers: $50 - $220', 'Apparel: $25 - $120'],
        details: 'Standard direct-to-consumer apparel pricing model with seasonal discount campaigns.'
      }
    };

    mockCompetitors = isTechRelated ? [
      {
        domain: 'geeksquad.com',
        niche: 'Consumer Electronics Support & Retail Repair Services',
        seoScore: 90,
        pricing: {
          hasPricingPage: true,
          tiers: ['Single Fix: $49 - $149', 'Annual Support Membership: $199.99/yr'],
          details: 'Standard consumer billing structure, supported by physical Best Buy retail locations.'
        },
        strengths: ['Physical retail coverage', 'High national brand trust'],
        weaknesses: ['Premium price points', 'Lacks custom B2B enterprise models']
      },
      {
        domain: 'support.com',
        niche: 'Remote IT Support & Software Troubleshooting Agents',
        seoScore: 80,
        pricing: {
          hasPricingPage: true,
          tiers: ['One-time Tech Fix: $99.99', 'Monthly Subscription Plan: $24.99/mo'],
          details: 'Requires subscription for recurring discounts, standard remote agent support model.'
        },
        strengths: ['24/7 online agent availability', 'No physical scheduling delays'],
        weaknesses: ['No physical hardware drop-offs', 'Upsells software utilities']
      },
      {
        domain: 'hellotech.com',
        niche: 'On-Demand In-Home Smart Home Setup & Technical Support',
        seoScore: 85,
        pricing: {
          hasPricingPage: true,
          tiers: ['Smart TV Setup: $79', 'Wifi Troubleshooting: $99', 'HelloTech Home: $19.99/mo'],
          details: 'Offers localized contractor matching, pricing depends on specific smart home task.'
        },
        strengths: ['Large network of local field technicians', 'Easy app-based scheduling'],
        weaknesses: ['Quality varies by contractor', 'Limited complex enterprise coverage']
      }
    ] : [
      {
        domain: 'nike.com',
        niche: 'Global Sports Apparel, Footwear, & Athletic Equipment',
        seoScore: 95,
        pricing: {
          hasPricingPage: true,
          tiers: ['Running Shoes: $60 - $250', 'Sportswear: $30 - $150'],
          details: 'Direct-to-consumer (DTC) retail and third-party wholesale model.'
        },
        strengths: ['Massive brand equity', 'Global retail distribution footprint'],
        weaknesses: ['Premium price points', 'High dependency on third-party supply chain']
      },
      {
        domain: 'puma.com',
        niche: 'Athletic and Casual Footwear, Apparel & Accessories',
        seoScore: 88,
        pricing: {
          hasPricingPage: true,
          tiers: ['Sneakers: $45 - $180', 'Activewear: $20 - $100'],
          details: 'Sells casual lifestyle and sports equipment through online and retail outlets.'
        },
        strengths: ['Strong casual fashion appeal', 'Collaborations with top designers'],
        weaknesses: ['Lower market share than Nike', 'Smaller R&D budget for athletic tech']
      }
    ];

    if (isMock || simulated) {
      console.log('Mock competitor benchmarking matrix active...');
      return NextResponse.json({
        competitors: mockCompetitors.slice(0, parsedLimit),
        yourWebsite: mockYourWebsite,
        simulated: true
      });
    }

    // Step 1: Crawl the seed website (up to 5 pages) to get deep context
    console.log(`Crawl competitor finder context from seed site: ${domainName}`);
    const seedData = await crawlSitePages(targetUrl, 5);

    // Step 2: Formulate competitor search queries heuristically (uses 0 Gemini/Groq calls!)
    const searchQueries = [
      `${domainName} competitors`,
      `${domainName} alternatives`
    ];

    // Step 3: Run web search queries in parallel (uses 0 Gemini/Groq calls!)
    const searchResults: string[] = [];
    const serperKey = process.env.SERPER_API_KEY;
    const hasSerperKey = serperKey && !serperKey.includes('YOUR_KEY');
    const useSerper = engine === 'google' && hasSerperKey;

    const searchPromises = searchQueries.map(async (query: string) => {
      try {
        if (useSerper) {
          const res = await fetch('https://google.serper.dev/search', {
            method: 'POST',
            headers: { 'X-API-KEY': serperKey as string, 'Content-Type': 'application/json' },
            body: JSON.stringify({ q: query, num: 10 }),
            next: { revalidate: 0 }
          });
          if (res.ok) {
            const data = await res.json();
            return (data.organic || []).map((o: any) => o.link);
          }
        }
        return await scrapeDuckDuckGo(query);
      } catch {
        return await scrapeDuckDuckGo(query);
      }
    });

    const queriesResults = await Promise.all(searchPromises);
    queriesResults.forEach(urls => searchResults.push(...urls));

    // Step 4: Extract candidate competitor domains (no hardcoded blacklist!)
    const uniqueCompetitorHosts = Array.from(
      new Set(
        searchResults
          .map(url => getDomainHostname(url))
          .filter(host => host && host !== domainName)
      )
    ).slice(0, 20);

    let selectedCompetitors: string[] = [];

    if (uniqueCompetitorHosts.length === 0) {
      console.log('Search queries returned no competitor links. Requesting Groq to suggest competitors based on domain name...');
      const guessPrompt = `
You are an expert Market Intelligence Analyst.
We searched Google for competitors to the website "${domainName}" but found no results.
Crawled website title/meta details: ${seedData.title} - ${seedData.description}

Suggest the top ${parsedLimit} most direct business competitors to "${domainName}" based on its brand name, title, and description.
Avoid selecting directory pages (e.g. craft.co, owler.com, semrush.com).
Select active, well-known business competitor websites.

Format the response strictly as a JSON object with a single key "competitors" containing the array of competitor domains.
Example format:
{
  "competitors": ["competitor1.com", "competitor2.com"]
}
`;

      try {
        const guessRes = await queryDeepSeek(guessPrompt, true);
        if (Array.isArray(guessRes.competitors) && guessRes.competitors.length > 0) {
          selectedCompetitors = guessRes.competitors.slice(0, parsedLimit);
        }
      } catch (e: any) {
        console.warn('DeepSeek guess competitors failed:', e.message);
      }
    } else {
      // Use DeepSeek to select actual direct competitors from candidates (bypassing craft.co, semrush.com, etc.)
      const filterPrompt = `
You are an expert Market Intelligence Analyst.
Original Website: ${domainName}
Candidate domains found: ${JSON.stringify(uniqueCompetitorHosts)}

We want to find direct business competitors to "${domainName}".
Avoid selecting directories, corporate profiles databases, review boards, search engines, or SEO utility sites (e.g. craft.co, owler.com, semrush.com, similarweb.com, zoominfo.com, statista.com, wikipedia).
Only select actual business competitors selling similar products/services to ${domainName}.

Select the top ${parsedLimit} most direct business competitors from the candidates list.
Format the response strictly as a JSON object with a single key "competitors" containing the array of selected domains.
Example format:
{
  "competitors": ["competitor1.com", "competitor2.com"]
}
`;

      try {
        const filterRes = await queryDeepSeek(filterPrompt, true);
        if (Array.isArray(filterRes.competitors)) {
          selectedCompetitors = filterRes.competitors.slice(0, parsedLimit);
        }
      } catch (e: any) {
        console.warn('DeepSeek competitor filter failed, fallback to heuristic slice:', e.message);
        selectedCompetitors = uniqueCompetitorHosts.slice(0, parsedLimit);
      }
    }

    if (selectedCompetitors.length === 0) {
      // Ultimate static fallback based on niche
      const isTechRelated = /tech|support|service|printer|help|repair|pc|computer|server|system|network|soft/i.test(domainName);
      selectedCompetitors = isTechRelated 
        ? ['geeksquad.com', 'support.com', 'hellotech.com'].slice(0, parsedLimit)
        : ['nike.com', 'puma.com', 'reebok.com'].slice(0, parsedLimit);
    }

    // Step 5: Scrape competitors in parallel (does 0 Gemini/Groq calls!)
    const competitorScrapes = await Promise.all(
      selectedCompetitors.map(async (cDomain: string) => {
        let seoScore = 70;
        let combinedText = '';
        const competitorUrl = `https://${cDomain}`;

        try {
          const response = await fetch(competitorUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
            next: { revalidate: 3600 }
          });

          if (response.ok) {
            const html = await response.text();
            const $ = cheerio.load(html);
            seoScore = evaluateSeoScore($);

            combinedText += `\n--- HOME COPY ---\n` + $('body').text().replace(/\s+/g, ' ').substring(0, 1500);

            let pricingLink = '';
            $('a[href]').each((_, el) => {
              const href = $(el).attr('href');
              if (href && !pricingLink) {
                try {
                  const absLink = new URL(href, competitorUrl).toString();
                  const pathLower = absLink.toLowerCase();
                  if (pathLower.includes('pricing') || pathLower.includes('price') || pathLower.includes('plan') || pathLower.includes('subscription')) {
                    pricingLink = absLink;
                  }
                } catch {}
              }
            });

            if (pricingLink) {
              const pricingRes = await fetch(pricingLink, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
                next: { revalidate: 3600 }
              });
              if (pricingRes.ok) {
                const pricingHtml = await pricingRes.text();
                const p$ = cheerio.load(pricingHtml);
                p$('script, style, iframe, nav, header, footer').remove();
                combinedText += `\n--- PRICING COPY ---\n` + p$('body').text().replace(/\s+/g, ' ').substring(0, 1500);
              }
            }
          }
        } catch (e: any) {
          console.warn(`Scrape failed for competitor ${cDomain}: ${e.message}`);
        }

        return {
          domain: cDomain,
          seoScore,
          scrapedText: combinedText.substring(0, 2500)
        };
      })
    );

    // Step 6: Single Bulk Benchmarking Request to DeepSeek (Only 1 API call for everything!)
    const bulkAuditPrompt = `
You are an expert Market Intelligence Analyst.
Original Website: ${domainName}
Crawled Original Website copy: ${seedData.combinedText.substring(0, 3000)}

Perform a direct competitor benchmarking matrix analysis against these ${competitorScrapes.length} competitors:
${competitorScrapes.map(cs => `
Competitor Domain: ${cs.domain}
Scraped Competitor Copy: ${cs.scrapedText}
`).join('\n---NEXT COMPETITOR---\n')}

Benchmarking analysis tasks:
1. Identify the exact niche/focus of the original website (${domainName}) and each competitor.
2. Check if the original website and each competitor has a clear pricing/plans page (True or False).
3. List the pricing tiers (e.g. "Shoes: $50-$150", "Basic: $19/mo", "Enterprise: Custom").
4. Provide a 2-sentence summary detailing pricing models or how each charges.
5. List 2 key business strengths and 2 key business weaknesses for each competitor.

Format the response strictly as a JSON object with these keys:
{
  "yourWebsite": {
    "domain": "${domainName}",
    "niche": "niche description",
    "pricing": {
      "hasPricingPage": true/false,
      "tiers": ["tier 1", "tier 2"],
      "details": "pricing strategy details"
    }
  },
  "competitors": [
    {
      "domain": "competitor domain hostname matching the list",
      "niche": "their focus niche",
      "pricing": {
        "hasPricingPage": true/false,
        "tiers": ["tier 1", "tier 2"],
        "details": "summary of billing details"
      },
      "strengths": ["strength 1", "strength 2"],
      "weaknesses": ["weakness 1", "weakness 2"]
    }
  ]
}
Do not write markdown codeblocks or extra conversational text.
`;

    const parsedAudit = await queryDeepSeek(bulkAuditPrompt, true);

    // Map calculated SEO scores back to the JSON payload
    const auditedCompetitors = (parsedAudit.competitors || []).map((comp: any) => {
      const match = competitorScrapes.find(cs => cs.domain === comp.domain);
      return {
        ...comp,
        seoScore: match ? match.seoScore : 70
      };
    });

    return NextResponse.json({
      yourWebsite: parsedAudit.yourWebsite,
      competitors: auditedCompetitors,
      simulated: false
    });

  } catch (err: any) {
    console.error('Groq competitor finder failed:', err.message);
    let errorMessage = 'Failed to find competitors. Please check your network and try again.';
    
    if (err.message.includes('429')) {
      errorMessage = 'Groq API Rate Limit exceeded (429). Please wait 1 minute before trying again.';
    } else if (err.message.includes('fetch failed') || err.message.includes('status')) {
      errorMessage = `The target website (${requestUrl}) blocked our scraper or returned an error. Please test another domain.`;
    } else {
      errorMessage = err.message;
    }
    
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
