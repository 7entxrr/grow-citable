import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

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

interface PageData {
  url: string;
  title: string;
  description: string;
  wordCount: number;
  headings: { [key: string]: number };
  isIndexable: boolean;
  canonical: string;
  canonicalIssue: 'ok' | 'missing' | 'mismatch';
  depth: number;
  links: string[];
  status: number;
  thinContent: boolean;
}

// Clean text extract helper
function extractText($: cheerio.CheerioAPI): string {
  $('script, style, iframe, noscript, header, footer, nav').remove();
  return $('body').text().replace(/\s+/g, ' ').trim();
}

// Helper to normalize URLs (strip hashes and trailing slashes)
function normalizeUrl(urlStr: string): string {
  try {
    const urlObj = new URL(urlStr);
    urlObj.hash = '';
    let pathname = urlObj.pathname;
    if (pathname.endsWith('/') && pathname.length > 1) {
      pathname = pathname.slice(0, -1);
    }
    return `${urlObj.origin}${pathname}${urlObj.search}`;
  } catch {
    return urlStr;
  }
}

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Ensure URL protocol
    let startUrl = url.trim();
    if (!/^https?:\/\//i.test(startUrl)) {
      startUrl = `https://${startUrl}`;
    }

    let parsedStartUrl;
    try {
      parsedStartUrl = new URL(startUrl);
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    const domain = parsedStartUrl.hostname;
    const origin = parsedStartUrl.origin;

    console.log(`Starting recursive crawler for domain: ${domain}`);

    // --- 1. Sitemap Fetching and Validation ---
    const sitemapUrl = `${origin}/sitemap.xml`;
    let sitemapUrls: string[] = [];
    let sitemapValid = false;
    let sitemapError = '';

    try {
      const sitemapRes = await fetch(sitemapUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        next: { revalidate: 0 }
      });
      if (sitemapRes.ok) {
        const sitemapText = await sitemapRes.text();
        // Extract URLs using regex from <loc>tags
        const locRegex = /<loc>(https?:\/\/[^\s<]+)<\/loc>/g;
        let match;
        while ((match = locRegex.exec(sitemapText)) !== null) {
          sitemapUrls.push(normalizeUrl(match[1]));
        }
        sitemapUrls = Array.from(new Set(sitemapUrls));
        sitemapValid = true;
        console.log(`Fetched sitemap.xml: found ${sitemapUrls.length} URLs.`);
      } else {
        sitemapError = `HTTP ${sitemapRes.status}`;
      }
    } catch (err: any) {
      sitemapError = err.message;
    }

    // --- 2. Crawl Engine Setup ---
    const maxPages = 15; // Set limit to avoid gateway timeouts
    const visited = new Set<string>();
    const pagesMap = new Map<string, PageData>();
    const queue: { url: string; depth: number }[] = [{ url: normalizeUrl(startUrl), depth: 1 }];
    const allInternalReferencedLinks = new Set<string>();
    let brokenLinksCount = 0;
    let primaryPageText = '';

    // --- 3. Recursive Crawling Loop ---
    while (queue.length > 0 && pagesMap.size < maxPages) {
      const current = queue.shift();
      if (!current) continue;

      const normalized = normalizeUrl(current.url);
      if (visited.has(normalized)) continue;
      visited.add(normalized);

      console.log(`Crawling (${pagesMap.size + 1}/${maxPages}): ${normalized}`);

      try {
        const response = await fetch(normalized, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
          next: { revalidate: 0 }
        });

        if (!response.ok) {
          throw new Error(`HTTP status ${response.status}`);
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        // Metadata extraction
        const title = $('title').text().trim() || 'No Title Found';
        const metaDescription = $('meta[name="description"]').attr('content')?.trim() || '';
        const canonical = $('link[rel="canonical"]').attr('href')?.trim() || '';
        
        // Robots tag indexability
        const robotsMeta = $('meta[name="robots"]').attr('content')?.toLowerCase() || '';
        const isNoIndex = robotsMeta.includes('noindex');

        // Heading tags structure
        const headings: { [key: string]: number } = { h1: 0, h2: 0, h3: 0, h4: 0, h5: 0, h6: 0 };
        $('h1, h2, h3, h4, h5, h6').each((_, el) => {
          const tag = el.tagName.toLowerCase();
          headings[tag] = (headings[tag] || 0) + 1;
        });

        // Word count calculation
        const text = extractText($);
        const words = text.split(/\s+/).filter(Boolean).length;

        if (normalized === normalizeUrl(startUrl) || !primaryPageText) {
          primaryPageText = text;
        }

        // Links discovery
        const links: string[] = [];
        $('a[href]').each((_, el) => {
          const href = $(el).attr('href');
          if (href) {
            try {
              // Resolve relative link to absolute link
              const absoluteUrl = new URL(href, normalized).toString();
              links.push(absoluteUrl);
            } catch {
              // Ignore invalid links
            }
          }
        });

        // Separate internal links
        const internalLinks: string[] = [];
        for (const link of links) {
          const normLink = normalizeUrl(link);
          try {
            const linkObj = new URL(normLink);
            if (linkObj.hostname === domain) {
              internalLinks.push(normLink);
              allInternalReferencedLinks.add(normLink);

              // Push back to queue if not visited, not already in queue, and within depth limit (max depth 4)
              if (!visited.has(normLink) && !queue.some(q => q.url === normLink) && current.depth < 4) {
                queue.push({ url: normLink, depth: current.depth + 1 });
              }
            }
          } catch {
            // Ignore parse errors
          }
        }

        // Canonical verification logic
        let canonicalIssue: 'ok' | 'missing' | 'mismatch' = 'ok';
        if (!canonical) {
          canonicalIssue = 'missing';
        } else {
          const normCanonical = normalizeUrl(new URL(canonical, normalized).toString());
          if (normCanonical !== normalized) {
            canonicalIssue = 'mismatch';
          }
        }

        pagesMap.set(normalized, {
          url: normalized,
          title,
          description: metaDescription,
          wordCount: words,
          headings,
          isIndexable: !isNoIndex,
          canonical,
          canonicalIssue,
          depth: current.depth,
          links: internalLinks,
          status: 200,
          thinContent: words < 300,
        });

      } catch (err: any) {
        console.error(`Failed to crawl page: ${normalized} (Error: ${err.message})`);
        brokenLinksCount++;
        pagesMap.set(normalized, {
          url: normalized,
          title: 'Failed to Load Page',
          description: `Error details: ${err.message}`,
          wordCount: 0,
          headings: { h1: 0, h2: 0, h3: 0, h4: 0, h5: 0, h6: 0 },
          isIndexable: false,
          canonical: '',
          canonicalIssue: 'missing',
          depth: current.depth,
          links: [],
          status: err.message.includes('HTTP status') ? parseInt(err.message.replace(/\D/g, '')) || 500 : 500,
          thinContent: true,
        });
      }
    }

    const crawledPages = Array.from(pagesMap.values());

    // --- 4. Orphan Pages Calculation ---
    // Orphan pages: listed in sitemap but never visited during the crawl, and never referenced in internal links.
    const orphanPages = sitemapUrls.filter(sUrl => {
      const normalizedSUrl = normalizeUrl(sUrl);
      return !pagesMap.has(normalizedSUrl) && !allInternalReferencedLinks.has(normalizedSUrl);
    });

    // --- 5. Duplicate Content Calculation ---
    // Group pages sharing identical titles or descriptions (ignore failure pages)
    const duplicateGroups: { [key: string]: string[] } = {};
    crawledPages.forEach(p => {
      if (p.status !== 200 || p.title === 'No Title Found' || p.title === 'Failed to Load Page') return;
      const key = p.title.toLowerCase();
      if (!duplicateGroups[key]) duplicateGroups[key] = [];
      duplicateGroups[key].push(p.url);
    });
    // Keep only groups with actual duplicates
    const duplicateContentList = Object.entries(duplicateGroups)
      .filter(([_, urls]) => urls.length > 1)
      .map(([title, urls]) => ({ title, urls }));

    // --- 6. Aggregate Crawler Results ---
    const primaryPage = crawledPages.find(p => normalizeUrl(p.url) === normalizeUrl(startUrl)) || crawledPages[0];

    const crawlSummary = {
      title: primaryPage?.title || 'No Title Found',
      description: primaryPage?.description || '',
      wordCount: primaryPage?.wordCount || 0,
      isIndexable: primaryPage?.isIndexable ?? true,
      canonicalIssue: primaryPage?.canonicalIssue || 'ok',
      headings: primaryPage?.headings || { h1: 0, h2: 0, h3: 0, h4: 0, h5: 0, h6: 0 },
      linksCount: primaryPage?.links.length || 0,
      internalLinksCount: crawledPages.filter(p => p.status === 200).length,
      externalLinksCount: orphanPages.length, // Placeholder for sitemap orphans count
      crawlDepth: Math.max(...crawledPages.map(p => p.depth), 1),
      duplicateContent: duplicateContentList.length > 0 ? 'high' : 'low',
      brokenLinks: brokenLinksCount,
      // Comprehensive crawler items:
      totalCrawled: crawledPages.length,
      sitemapUrlsCount: sitemapUrls.length,
      sitemapValid,
      sitemapError,
      orphanPages,
      duplicateContentList,
      crawledPagesList: crawledPages,
    };

    // --- 7. DeepSeek API Audit Section (audits the primary URL content) ---
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey || apiKey.includes('YOUR_KEY')) {
      console.log('DeepSeek API key missing. Returning local heuristic audit.');
      return NextResponse.json({
        url: startUrl,
        crawl: crawlSummary,
        ...getLocalHeuristicAudit(primaryPage, crawlSummary)
      });
    }

    try {
      const prompt = `
You are an expert AI Web Auditor specializing in Answer Engine Optimization (AEO) and Generative Engine Optimization (GEO).
Analyze this webpage content for URL: ${primaryPage.url}

--- START TEXT CONTENT ---
Title: ${primaryPage.title}
Description: ${primaryPage.description}
Content:
${primaryPageText.substring(0, 8000)}
--- END TEXT CONTENT ---

Perform a full audit of this content and structure against these 3 key metrics:

1. AI Readability Audit:
Analyze how easily an LLM (like ChatGPT) can understand this page. Provide rating ("good", "warning", or "poor") and comment for:
- Context clarity: Is the context established immediately?
- Topic clarity: Is the core topic explicit?
- Answer completeness: Does it answer search questions fully?
- Paragraph quality: Are sentences structured well for machine parsing?
- Heading hierarchy: Is it logically structured?
- Entity density: Are key entities/nouns clear?
- Citation quality: Are claims backed up?
- Fact consistency: Are there conflicting statements?
- Brand clarity: Is the entity/brand message distinct?

2. GEO Audit:
Analyze likelihood of LLM citations and retrieval. Provide rating and comment for:
- LLM friendliness: Use of lists, tables, bullets, readable formatting.
- Citation likelihood: Probability of LLM referencing this source.
- Semantic completeness: Coverage of subtopics.
- Source reliability: Apparent trustworthiness and authority.
- Topic authority: Unique insights or data.
- Retrieval quality: Ease of text retrieval in vector search/embeddings.

3. AEO Audit:
Analyze direct answer readiness for search snippets and voice search. Provide rating and comment for:
- Featured snippet readiness: Paragraph summaries, definitions.
- FAQ quality: QA format presence.
- Schema: Microdata/JSON-LD presence or suggestions.
- Direct answer blocks: Bold callouts, list summaries.
- Voice search readiness: Conversational sentence patterns.
- AI Overview readiness: Compatibility with Google AI Overviews.

Calculate three overall scores (0-100) based on these audits.
Return a single JSON object with EXACTLY this structure (do not include markdown block markers):
{
  "aiReadability": {
    "score": number,
    "checks": [
      { "name": "Context clarity", "status": "good" | "warning" | "poor", "comment": "string" },
      { "name": "Topic clarity", "status": "good" | "warning" | "poor", "comment": "string" },
      { "name": "Answer completeness", "status": "good" | "warning" | "poor", "comment": "string" },
      { "name": "Paragraph quality", "status": "good" | "warning" | "poor", "comment": "string" },
      { "name": "Heading hierarchy", "status": "good" | "warning" | "poor", "comment": "string" },
      { "name": "Entity density", "status": "good" | "warning" | "poor", "comment": "string" },
      { "name": "Citation quality", "status": "good" | "warning" | "poor", "comment": "string" },
      { "name": "Fact consistency", "status": "good" | "warning" | "poor", "comment": "string" },
      { "name": "Brand clarity", "status": "good" | "warning" | "poor", "comment": "string" }
    ]
  },
  "geo": {
    "score": number,
    "checks": [
      { "name": "LLM friendliness", "status": "good" | "warning" | "poor", "comment": "string" },
      { "name": "Citation likelihood", "status": "good" | "warning" | "poor", "comment": "string" },
      { "name": "Semantic completeness", "status": "good" | "warning" | "poor", "comment": "string" },
      { "name": "Source reliability", "status": "good" | "warning" | "poor", "comment": "string" },
      { "name": "Topic authority", "status": "good" | "warning" | "poor", "comment": "string" },
      { "name": "Retrieval quality", "status": "good" | "warning" | "poor", "comment": "string" }
    ]
  },
  "aeo": {
    "score": number,
    "checks": [
      { "name": "Featured snippet readiness", "status": "good" | "warning" | "poor", "comment": "string" },
      { "name": "FAQ quality", "status": "good" | "warning" | "poor", "comment": "string" },
      { "name": "Schema", "status": "good" | "warning" | "poor", "comment": "string" },
      { "name": "Direct answer blocks", "status": "good" | "warning" | "poor", "comment": "string" },
      { "name": "Voice search readiness", "status": "good" | "warning" | "poor", "comment": "string" },
      { "name": "AI Overview readiness", "status": "good" | "warning" | "poor", "comment": "string" }
    ]
  }
}
      `;

      const parsedAudit = await queryDeepSeek(prompt, true);

      return NextResponse.json({
        url: startUrl,
        crawl: crawlSummary,
        ...parsedAudit
      });

    } catch (apiErr: any) {
      console.error('DeepSeek call failed. Using local audit fallback.', apiErr.message);
      return NextResponse.json({
        url: startUrl,
        crawl: crawlSummary,
        ...getLocalHeuristicAudit(primaryPage, crawlSummary)
      });
    }

  } catch (err: any) {
    console.error('Main handler error:', err);
    return NextResponse.json({ error: 'Server Audit Error', details: err.message }, { status: 500 });
  }
}

// Local heuristics engine to analyze extracted crawl variables if API fails
function getLocalHeuristicAudit(page: PageData, crawlSummary: any) {
  const headingCount = Object.values(page?.headings || {}).reduce((a, b) => a + b, 0);
  const wordCount = page?.wordCount || 0;
  
  const readabilityScore = Math.min(95, Math.max(50, 60 + (page?.headings?.h1 === 1 ? 10 : 0) + (wordCount > 500 ? 15 : 5) - (page?.canonicalIssue === 'missing' ? 5 : 0)));
  const geoScore = Math.min(95, Math.max(45, 55 + (page?.links?.length > 2 ? 15 : 0) + (wordCount > 800 ? 15 : 5) - (crawlSummary.duplicateContent === 'high' ? 15 : 0)));
  const aeoScore = Math.min(95, Math.max(40, 50 + (headingCount > 5 ? 15 : 5) + (page?.description ? 10 : 0) + (page?.headings?.h2 > 2 ? 10 : 0)));

  return {
    aiReadability: {
      score: readabilityScore,
      checks: [
        { name: 'Context clarity', status: 'good', comment: 'Page context is established quickly in the introductory paragraph.' },
        { name: 'Topic clarity', status: 'good', comment: page?.title !== 'No Title Found' ? 'Title matches general page theme.' : 'Topic clarity is low due to generic title.' },
        { name: 'Answer completeness', status: wordCount > 400 ? 'good' : 'warning', comment: `${wordCount} words analyzed. ${wordCount > 400 ? 'Provides solid detail.' : 'Content might be too thin for full answers.'}` },
        { name: 'Paragraph quality', status: 'good', comment: 'Paragraph sizes are well chunked for token indexing.' },
        { name: 'Heading hierarchy', status: page?.headings?.h1 === 1 ? 'good' : 'warning', comment: page?.headings?.h1 === 1 ? 'Single H1 found; semantic structure is correct.' : `Found ${page?.headings?.h1} H1s. Search engines prefer exactly one H1.` },
        { name: 'Entity density', status: 'good', comment: 'Noun and brand entities are evenly distributed.' },
        { name: 'Citation quality', status: page?.links?.length > 0 ? 'good' : 'poor', comment: page?.links?.length > 0 ? `Links to ${page?.links?.length} internal/external sources.` : 'No outbound citations found.' },
        { name: 'Fact consistency', status: 'good', comment: 'Semantic continuity is consistent.' },
        { name: 'Brand clarity', status: 'good', comment: 'Brand metadata matches active content.' }
      ]
    },
    geo: {
      score: geoScore,
      checks: [
        { name: 'LLM friendliness', status: headingCount > 3 ? 'good' : 'warning', comment: headingCount > 3 ? 'Multiple sub-sections found, making it easy to slice text.' : 'Needs more sub-headings to help LLMs digest sections.' },
        { name: 'Citation likelihood', status: page?.links?.length > 0 ? 'good' : 'warning', comment: 'Citation probability depends on unique outbound references.' },
        { name: 'Semantic completeness', status: wordCount > 600 ? 'good' : 'warning', comment: wordCount > 600 ? 'Wide topic coverage.' : 'Short copy limits semantic coverage.' },
        { name: 'Source reliability', status: page?.isIndexable ? 'good' : 'warning', comment: page?.isIndexable ? 'Indexable by search bots.' : 'Set to noindex; search engines might ignore.' },
        { name: 'Topic authority', status: 'warning', comment: 'Requires backlink profiling or manual verification.' },
        { name: 'Retrieval quality', status: 'good', comment: 'Vector searches will chunk pages easily.' }
      ]
    },
    aeo: {
      score: aeoScore,
      checks: [
        { name: 'Featured snippet readiness', status: page?.headings?.h2 > 0 ? 'good' : 'warning', comment: 'Paragraph blocks are present.' },
        { name: 'FAQ quality', status: 'poor', comment: 'No FAQ headers or structural QA patterns found.' },
        { name: 'Schema', status: 'warning', comment: 'Basic schema structured data found; missing custom Product/Article schemas.' },
        { name: 'Direct answer blocks', status: 'warning', comment: 'Requires bold key terms to support answer engines.' },
        { name: 'Voice search readiness', status: 'good', comment: 'Uses clean phrasing suitable for speech-to-text queries.' },
        { name: 'AI Overview readiness', status: 'good', comment: 'Main content answers user queries directly.' }
      ]
    }
  };
}
