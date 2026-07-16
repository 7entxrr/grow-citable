import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

interface PromptResult {
  prompt: string;
  yourRank: number | 'Not Found';
  competitorRanks: { [key: string]: number | 'Not Found' };
  winner: 'You' | string | 'None';
  sourceUrl: string;
}

// Normalizes domain strings to clean host names
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

// Free & Open Source DuckDuckGo Scraper
async function scrapeDuckDuckGo(promptText: string): Promise<string[]> {
  try {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(promptText)}`;
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      next: { revalidate: 0 }
    });

    if (!response.ok) {
      throw new Error(`DuckDuckGo responded with status ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const links: string[] = [];

    // Parse result elements in DuckDuckGo Lite/HTML
    $('.result__a').each((_, el) => {
      const href = $(el).attr('href');
      if (href) {
        try {
          // DDG wraps links: /l/?uddg=https%3A%2F%2F...
          if (href.startsWith('//')) {
            const absoluteUrl = new URL(`https:${href}`);
            const uddg = absoluteUrl.searchParams.get('uddg');
            if (uddg) {
              links.push(decodeURIComponent(uddg));
            } else {
              links.push(`https:${href}`);
            }
          } else if (href.startsWith('/l/?')) {
            const absoluteUrl = new URL(href, 'https://html.duckduckgo.com');
            const uddg = absoluteUrl.searchParams.get('uddg');
            if (uddg) {
              links.push(decodeURIComponent(uddg));
            } else {
              links.push(`https://html.duckduckgo.com${href}`);
            }
          } else {
            links.push(href);
          }
        } catch {
          links.push(href);
        }
      }
    });

    return links;
  } catch (err: any) {
    console.error(`DuckDuckGo scraper failed for prompt "${promptText}":`, err.message);
    return [];
  }
}

export async function POST(req: Request) {
  try {
    const { url, competitors = [], prompts = [], limit = 10, engine = 'duckduckgo' } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'Your Website URL is required' }, { status: 400 });
    }

    if (!prompts || prompts.length === 0) {
      return NextResponse.json({ error: 'At least one prompt is required' }, { status: 400 });
    }

    const myHost = getDomainHostname(url);
    const compHosts = competitors.map((c: string) => getDomainHostname(c)).filter(Boolean);

    // Apply limit to protect credits / bandwidth
    const activePrompts = prompts.slice(0, Math.max(1, limit));

    const serperKey = process.env.SERPER_API_KEY;
    const hasSerperKey = serperKey && !serperKey.includes('YOUR_KEY');
    
    // Choose search strategy
    let engineUsed = engine;
    let fallbackTriggered = false;

    if (engine === 'google' && !hasSerperKey) {
      engineUsed = 'duckduckgo';
      fallbackTriggered = true;
      console.log('Google requested but SERPER_API_KEY missing. Falling back to DuckDuckGo scraper...');
    }

    console.log(`Phase 3 Explorer: Querying ${activePrompts.length} prompts via ${engineUsed.toUpperCase()}`);

    const results: PromptResult[] = [];

    // Parallel fetch batch execution
    const fetchPromises = activePrompts.map(async (promptText: string) => {
      let urls: string[] = [];

      try {
        if (engineUsed === 'google') {
          // Serper Google Search
          const response = await fetch('https://google.serper.dev/search', {
            method: 'POST',
            headers: {
              'X-API-KEY': serperKey as string,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ q: promptText, num: 10 }),
            next: { revalidate: 0 }
          });

          if (response.ok) {
            const data = await response.json();
            urls = (data.organic || []).map((o: any) => o.link);
          } else {
            console.error(`Google API returned status ${response.status}. Falling back to DuckDuckGo...`);
            urls = await scrapeDuckDuckGo(promptText);
          }
        } else {
          // Free DuckDuckGo Scraper
          urls = await scrapeDuckDuckGo(promptText);
        }
      } catch (err: any) {
        console.error(`Primary search fetch failed, trying DuckDuckGo fallback: ${err.message}`);
        urls = await scrapeDuckDuckGo(promptText);
      }

      // Restrict results list to top 10 search entries
      const topUrls = urls.slice(0, 10);

      let yourRank: number | 'Not Found' = 'Not Found';
      const competitorRanks: { [key: string]: number | 'Not Found' } = {};
      compHosts.forEach((ch: string) => { competitorRanks[ch] = 'Not Found'; });

      let winningUrl = '';

      // Perform position matching
      topUrls.forEach((link: string, idx: number) => {
        try {
          const resHost = getDomainHostname(link);
          const position = idx + 1;

          if (resHost === myHost && yourRank === 'Not Found') {
            yourRank = position;
          }

          compHosts.forEach((ch: string) => {
            if (resHost === ch && competitorRanks[ch] === 'Not Found') {
              competitorRanks[ch] = position;
            }
          });
        } catch {
          // Ignore parse errors on single links
        }
      });

      // Determine Winner
      let winner: 'You' | string | 'None' = 'None';
      let lowestRank = 99;

      if (yourRank !== 'Not Found' && yourRank < lowestRank) {
        lowestRank = yourRank;
        winner = 'You';
        winningUrl = topUrls[yourRank - 1] || '';
      }

      Object.entries(competitorRanks).forEach(([cHost, cRank]) => {
        if (cRank !== 'Not Found' && cRank < lowestRank) {
          lowestRank = cRank;
          winner = cHost;
          winningUrl = topUrls[cRank - 1] || '';
        }
      });

      const fallbackSearchUrl = engineUsed === 'google' 
        ? `https://google.com/search?q=${encodeURIComponent(promptText)}`
        : `https://duckduckgo.com/?q=${encodeURIComponent(promptText)}`;

      return {
        prompt: promptText,
        yourRank,
        competitorRanks,
        winner,
        sourceUrl: winningUrl || fallbackSearchUrl
      };
    });

    const parsedResults = await Promise.all(fetchPromises);
    results.push(...parsedResults);

    // --- Compute Aggregated Stats ---
    const totalPrompts = results.length;
    const winCount = results.filter(r => r.winner === 'You').length;
    const coverageCount = results.filter(r => r.yourRank !== 'Not Found').length;

    const activePositions = results
      .map(r => r.yourRank)
      .filter((r): r is number => typeof r === 'number');
    const avgPosition = activePositions.length > 0
      ? (activePositions.reduce((a, b) => a + b, 0) / activePositions.length).toFixed(1)
      : '0.0';

    // Competitor share distribution
    const compWinsCount: { [key: string]: number } = {};
    compHosts.forEach((ch: string) => { compWinsCount[ch] = 0; });
    results.forEach(r => {
      if (r.winner !== 'You' && r.winner !== 'None') {
        compWinsCount[r.winner] = (compWinsCount[r.winner] || 0) + 1;
      }
    });

    const competitorShares = Object.entries(compWinsCount).map(([host, wins]) => {
      return {
        competitor: host,
        winPercentage: totalPrompts > 0 ? Math.round((wins / totalPrompts) * 100) : 0
      };
    });

    return NextResponse.json({
      summary: {
        totalScanned: totalPrompts,
        winRate: totalPrompts > 0 ? Math.round((winCount / totalPrompts) * 100) : 0,
        coverage: totalPrompts > 0 ? Math.round((coverageCount / totalPrompts) * 100) : 0,
        averagePosition: avgPosition,
        competitorShares,
        engineUsed,
        fallbackTriggered,
        isSimulated: false // Never simulated anymore, always runs actual web queries!
      },
      results
    });

  } catch (err: any) {
    console.error('Phase 3 Handler Error:', err);
    return NextResponse.json({ error: 'Failed to explore prompts', details: err.message }, { status: 500 });
  }
}
