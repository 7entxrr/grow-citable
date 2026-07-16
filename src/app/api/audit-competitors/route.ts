import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

interface AuditData {
  domain: string;
  entities: string;
  authority: string;
  topics: string[];
  citations: string;
  schema: string;
  brandMentions: string;
  promptWins: string;
  contentDepth: string;
  aiTrustScore: number;
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

// Scrape helper for simple page crawl
async function scrapePage(targetUrl: string): Promise<string> {
  try {
    const clean = cleanUrl(targetUrl);
    const res = await fetch(clean, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      next: { revalidate: 3600 }
    });
    if (!res.ok) return '';
    const html = await res.text();
    const $ = cheerio.load(html);
    $('script, style, iframe, nav, header, footer').remove();
    return $('body').text().replace(/\s+/g, ' ').trim().substring(0, 2000);
  } catch {
    return '';
  }
}

// DuckDuckGo Scraper for competitor discovery
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
    console.error(`DuckDuckGo fail in audit competitors discovery:`, err.message);
    return [];
  }
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
  let requestUrl = '';

  try {
    const { url, competitors = '', niche = '' } = await req.json();
    requestUrl = url;

    if (!url) {
      return NextResponse.json({ error: 'Your Website URL is required' }, { status: 400 });
    }

    const cleanSeed = cleanUrl(url);
    domainName = getDomainHostname(cleanSeed);

    // Crawl target site homepage context
    console.log(`Phase 4 Crawl target site: ${domainName}`);
    const seedText = await scrapePage(cleanSeed);

    // Dynamic Mock Fallback checks
    const isTechRelated = /tech|support|service|printer|help|repair|pc|computer|server|system|network|soft/i.test(domainName) || /tech|support|server|help/i.test(niche);

    const mockYourWebsite: AuditData = isTechRelated ? {
      domain: domainName,
      entities: 'Primary Entity in Printer Diagnostics & Consumer IT Systems',
      authority: '8.4 / 10 (High localized authority for device setups)',
      topics: ['Printer Wireless Hookups', 'Driver Diagnostics', 'Registry Fixes'],
      citations: 'Cited frequently in troubleshooting directories and regional support indexes.',
      schema: 'Valid LocalBusiness Schema with hardware service schema attributes.',
      brandMentions: 'Strong presence on hardware QA platforms, community technical groups, and Yelp.',
      promptWins: 'Won 11 / 15 generic transactional prompts searched.',
      contentDepth: 'Deep index of troubleshooting guides, device manuals, and configuration logs.',
      aiTrustScore: 86
    } : {
      domain: domainName,
      entities: 'Recognized Retail Entity in Performance Athletic Footwear & Apparel',
      authority: '9.5 / 10 (Dominant global retail index brand authority)',
      topics: ['Sustainable Cushioning', 'Carbon-fiber Plates', 'Athletic Lifestyle Wear'],
      citations: 'Highly cited in product buying guides, athletic gear roundups, and LLM shopping suggestions.',
      schema: 'Robust Product Schema, FAQ Schema, and Organization Graph Schema.',
      brandMentions: 'Massive citation density on sneaker blogs, GQ, fashion boards, and Reddit.',
      promptWins: 'Won 13 / 15 generic transactional prompts searched.',
      contentDepth: 'Granular details regarding shoe specs, foam density, cushioning wear, and sizing fit.',
      aiTrustScore: 94
    };

    const mockCompetitors: AuditData[] = isTechRelated ? [
      {
        domain: 'geeksquad.com',
        entities: 'Dominant Entity in Electronics Installation & Smart Home Support',
        authority: '9.6 / 10 (Massive retail-backed authority)',
        topics: ['Smart Home Installation', 'In-home Appliance Repairs', 'Computer Maintenance'],
        citations: 'Primary reference brand for consumer tech repairs in LLM recommendations.',
        schema: 'Robust Service & Organization Schemas integrated with Best Buy APIs.',
        brandMentions: 'Highly mentioned in major tech journals, Best Buy directories, and retail news.',
        promptWins: 'Won 14 / 15 generic transactional prompts searched.',
        contentDepth: 'Comprehensive coverage of smart appliance fixes, device diagnostics, and pricing tiers.',
        aiTrustScore: 92
      },
      {
        domain: 'support.com',
        entities: 'Major Provider of Remote IT Solutions & SaaS Maintenance',
        authority: '7.8 / 10 (Moderate domain-wide authority)',
        topics: ['Remote Registry Diagnostics', 'Malware Clears', 'Corporate Subscriptions'],
        citations: 'Often suggested by AI models for remote system repairs and remote work setups.',
        schema: 'Standard Organization markup, missing granular service item details.',
        brandMentions: 'Frequent mentions on corporate IT forums, career blogs, and tech resources.',
        promptWins: 'Won 8 / 15 generic transactional prompts searched.',
        contentDepth: 'Focuses on remote connectivity manuals, subscription packages, and client portals.',
        aiTrustScore: 78
      }
    ] : [
      {
        domain: 'nike.com',
        entities: 'Dominant Global Entity in Sports Footwear, Apparel, & Sport Tech',
        authority: '9.8 / 10 (Absolute peak authority index)',
        topics: ['Responsive Foams', 'Performance Athletic Cleats', 'Digital Sport Accessories'],
        citations: 'Gold standard brand suggestion in all active sportswear and footwear prompts.',
        schema: 'Peak-level implementation of nested Product, AggregateRating, and Breadcrumb Schemas.',
        brandMentions: 'Extremely high volume of mentions across all global news outlets, athletic platforms, and social networks.',
        promptWins: 'Won 14 / 15 generic transactional prompts searched.',
        contentDepth: 'Exhaustive product descriptions, materials tracking, athletics R&D papers, and sizing details.',
        aiTrustScore: 96
      },
      {
        domain: 'puma.com',
        entities: 'Secondary Entity in Athletic Footwear & Casual Lifestyle Apparel',
        authority: '8.8 / 10 (Strong mid-tier authority)',
        topics: ['Motorsports Partnerships', 'Lifestyle Sneakers', 'Performance Activewear'],
        citations: 'Frequently cited by AI search models for stylish and affordable footwear options.',
        schema: 'Valid Product and Breadcrumb markup, minor warnings in video schema.',
        brandMentions: 'Solid citation volume in streetwear magazines, designer collaborations, and retail catalogs.',
        promptWins: 'Won 9 / 15 generic transactional prompts searched.',
        contentDepth: 'Good coverage of styling options and design inspirations, less technical foam engineering detail.',
        aiTrustScore: 85
      }
    ];

    if (isMock) {
      console.log('Groq API key missing. Returning mock competitor AI audit matrix...');
      const targetCompetitorCount = competitors ? competitors.split(',').length : 2;
      return NextResponse.json({
        yourWebsite: mockYourWebsite,
        competitors: mockCompetitors.slice(0, targetCompetitorCount),
        detectedNiche: isTechRelated ? 'Managed Tech Support & IT Repair' : 'Performance Sportswear & Retail Apparel',
        simulated: true
      });
    }

    // Algorithm: Determine Business Niche / Keywords using Llama 3.3
    let detectedNiche = niche.trim();
    if (!detectedNiche) {
      console.log(`Auto-detecting business niche/keywords for: ${domainName}`);
      const nichePrompt = `
Analyze this website homepage context to extract its precise industry niche and core keywords.
Domain: ${domainName}
Content: ${seedText.substring(0, 1500)}

Return a single concise summary phrase (e.g. "E-commerce retail fashion & apparel" or "Residential printer installation and remote computer troubleshooting support").
Format your output strictly as a JSON object with a single key "niche". Do not include markdown codeblocks or extra text.
Example format:
{
  "niche": "Managed IT Services & Cyber Security Solutions"
}
`;
      try {
        const nicheRes = await queryDeepSeek(nichePrompt, true);
        detectedNiche = nicheRes.niche || (isTechRelated ? 'Managed Tech Support & IT Repair' : 'Retail Store & E-commerce');
      } catch (e: any) {
        console.warn('Llama niche detection failed:', e.message);
        detectedNiche = isTechRelated ? 'Managed Tech Support & IT Repair' : 'Retail Store & E-commerce';
      }
    }

    // Algorithm: Competitor Auto-Discovery
    let selectedCompetitors: string[] = [];
    const overrideCompetitors = competitors.split(',').map((c: string) => getDomainHostname(c.trim())).filter(Boolean);

    if (overrideCompetitors.length > 0) {
      selectedCompetitors = overrideCompetitors;
    } else {
      console.log(`No competitors supplied. Running competitor discovery searches for: ${domainName}`);
      const searchQueries = [
        `${domainName} competitors`,
        `${domainName} alternatives`
      ];

      // DuckDuckGo Scrapes in parallel
      const searchResults: string[] = [];
      const queriesResults = await Promise.all(
        searchQueries.map(async (q) => await scrapeDuckDuckGo(q))
      );
      queriesResults.forEach(urls => searchResults.push(...urls));

      const uniqueCompetitorHosts = Array.from(
        new Set(
          searchResults
            .map(url => getDomainHostname(url))
            .filter(host => host && host !== domainName)
        )
      ).slice(0, 20);

      if (uniqueCompetitorHosts.length > 0) {
        const filterPrompt = `
You are an expert Market Intelligence Analyst.
Original Website: ${domainName}
Candidate domains found: ${JSON.stringify(uniqueCompetitorHosts)}

We want to find direct business competitors to "${domainName}".
Avoid selecting:
1. Search engines (e.g. google.com, bing.com, duckduckgo.com, yahoo.com)
2. Social media networks (e.g. facebook.com, linkedin.com, twitter.com, instagram.com, reddit.com, quora.com, youtube.com, pinterest.com, tiktok.com)
3. Information portals, wikis, and code repositories (e.g. wikipedia.org, github.com, medium.com)
4. Business directories, reviews databases, and profiling tools (e.g. craft.co, owler.com, semrush.com, similarweb.com, zoominfo.com, statista.com, yelp.com, g2.com, trustpilot.com, capterra.com, crunchbase.com, glassdoor.com, indeed.com)
5. App stores or generic online tools (e.g. play.google.com, apps.apple.com, shopify.com)
6. Generic giant marketplaces (e.g. amazon.com, ebay.com) UNLESS the original site itself (${domainName}) is a direct major online retail marketplace (like Flipkart, eBay, etc.) where they directly compete.

Only select actual business competitors selling similar products/services to ${domainName}.

Select the top 3 most direct business competitors from the candidates list.
Format the response strictly as a JSON object with a single key "competitors" containing the array of selected domains.
Example format:
{
  "competitors": ["competitor1.com", "competitor2.com"]
}
`;

        try {
          const filterRes = await queryDeepSeek(filterPrompt, true);
          if (Array.isArray(filterRes.competitors)) {
            selectedCompetitors = filterRes.competitors.slice(0, 3);
          }
        } catch (e: any) {
          console.warn('DeepSeek competitor filter in audit failed:', e.message);
        }
      }

      // If search returns 0 candidates, fallback to Llama zero-shot suggestions
      if (selectedCompetitors.length === 0) {
        console.log('Search returned no candidates. Guessing competitors using Llama 3.3...');
        const guessPrompt = `
You are an expert Market Intelligence Analyst.
We searched Google for competitors to the website "${domainName}" but found no results.
Website Brand details: ${domainName} - ${detectedNiche}

Suggest the top 3 most direct business competitors to "${domainName}" based on its brand name and niche.
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
            selectedCompetitors = guessRes.competitors.slice(0, 3);
          }
        } catch (e: any) {
          console.warn('Llama zero-shot competitor guess failed:', e.message);
        }
      }

      // Ultimate hardcoded safety block if everything fails
      if (selectedCompetitors.length === 0) {
        selectedCompetitors = isTechRelated 
          ? ['geeksquad.com', 'support.com', 'hellotech.com']
          : ['nike.com', 'puma.com', 'reebok.com'];
      }
    }

    // Step 3: Crawl competitors in parallel
    console.log(`Phase 4 Scrape starting for discovered competitors: ${JSON.stringify(selectedCompetitors)}`);
    const scrapes = await Promise.all(
      [cleanSeed, ...selectedCompetitors.map(c => `https://${c}`)].map(async (urlStr: string) => {
        const text = await scrapePage(urlStr);
        return {
          domain: getDomainHostname(urlStr),
          copy: text || 'No text scraped from homepage.'
        };
      })
    );

    // Step 4: Query Groq Llama 3.3 in a single bulk transaction
    const seedScrape = scrapes[0];
    const competitorScrapes = scrapes.slice(1);

    const prompt = `
You are an expert AI Search Engine Optimization (AEO/GEO) Analyst.
We need to audit and compare the original website against its competitors on AI-first ranking metrics instead of traditional SEO.

Original Website Domain: ${domainName}
Crawled Original Copy: ${seedScrape.copy}

Competitors to audit:
${competitorScrapes.map(cs => `
Competitor Domain: ${cs.domain}
Crawled Competitor Copy: ${cs.copy}
`).join('\n---NEXT COMPETITOR---\n')}

Niche / Keyword focus: ${detectedNiche}

Tasks:
For the original website and each competitor, analyze and compare these 9 AI-first criteria:
1. Entities: How are they recognized in the entity graph? (e.g. "Primary Entity in...", "Secondary Entity in...")
2. Authority: Domain/Topic authority estimation. (Format as "Score / 10 (details)")
3. Topics: List exactly 3 key topics they cover.
4. Citations: AI recommendation frequency and citation rates.
5. Schema: Quality of structured data and schemas.
6. Brand Mentions: External web mentions density.
7. Prompt Wins: Estimated transactional prompts won (out of 15 queries).
8. Content Depth: Semantic rich-text depth.
9. AI Trust Score: Score from 0 to 100 based on alignment and AI model verification.

Format the response strictly as a JSON object with these keys:
{
  "yourWebsite": {
    "domain": "${domainName}",
    "entities": "description",
    "authority": "description",
    "topics": ["topic 1", "topic 2", "topic 3"],
    "citations": "description",
    "schema": "description",
    "brandMentions": "description",
    "promptWins": "description",
    "contentDepth": "description",
    "aiTrustScore": 90
  },
  "competitors": [
    {
      "domain": "competitor domain hostname",
      "entities": "description",
      "authority": "description",
      "topics": ["topic 1", "topic 2", "topic 3"],
      "citations": "description",
      "schema": "description",
      "brandMentions": "description",
      "promptWins": "description",
      "contentDepth": "description",
      "aiTrustScore": 85
    }
  ]
}
Do not write markdown codeblocks or extra conversational text.
`;

    const parsedAudit = await queryDeepSeek(prompt, true);

    return NextResponse.json({
      yourWebsite: parsedAudit.yourWebsite,
      competitors: parsedAudit.competitors,
      detectedNiche,
      simulated: false
    });

  } catch (err: any) {
    console.error('DeepSeek competitor AI audit failed:', err.message);
    let errorMessage = 'Failed to find competitors. Please check your network and try again.';
    
    if (err.message.includes('429')) {
      errorMessage = 'DeepSeek API Rate Limit exceeded (429). Please wait 1 minute before trying again.';
    } else if (err.message.includes('fetch failed') || err.message.includes('status')) {
      errorMessage = `The target website (${requestUrl}) blocked our scraper or returned an error. Please test another domain.`;
    } else {
      errorMessage = err.message;
    }
    
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
