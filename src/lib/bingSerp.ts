/**
 * Bing SERP scraper — secondary snippet source for LinkedIn enrichment.
 *
 * Why Bing in addition to Google:
 *   - Bing's anti-bot is far gentler than Google's (no /sorry/ CAPTCHAs
 *     for normal traffic), so we can fetch over plain HTTP without
 *     Puppeteer.
 *   - Bing's snippets for LinkedIn profile URLs are often LONGER than
 *     Google's, frequently exposing additional skills mentions, more
 *     of the About paragraph, and richer experience text.
 *   - Bing is the upstream of DuckDuckGo, Yahoo, Ecosia, Qwant — so
 *     parsing Bing once unlocks all of them.
 *
 * What we do NOT do:
 *   - We do not paginate Bing. We just resolve "give me Bing's snippet
 *     for THIS one LinkedIn URL" and return whatever extra text it has.
 *   - We do not trust Bing's title/URL — we look up by URL and grab
 *     only the snippet body.
 */

import * as cheerio from "cheerio";
import { log } from "@/lib/logger";
import { PUPPETEER_USER_AGENT } from "@/lib/puppeteerBrowser";

const TAG = "[bing:serp]";

export interface BingSnippet {
  /** The exact LinkedIn URL we asked Bing about. */
  url: string;
  /** Best-effort title text Bing displayed (with " | LinkedIn" stripped). */
  title: string | null;
  /** Snippet/description body. The whole point of this lib. */
  snippet: string | null;
  /** Original Bing-cached URL (for debugging). */
  bingUrl: string | null;
}

/**
 * Fetch Bing's snippet for a specific LinkedIn profile URL.
 * Returns null if nothing useful was returned (URL not indexed, Bing
 * served an interstitial, etc.).
 */
export async function fetchBingSnippetForUrl(
  url: string,
): Promise<BingSnippet | null> {
  const query = `site:${stripScheme(url)}`;
  const bingUrl = `https://www.bing.com/search?q=${encodeURIComponent(query)}&count=10&first=1`;

  let html: string;
  try {
    const res = await fetch(bingUrl, {
      redirect: "follow",
      signal: AbortSignal.timeout(12_000),
      headers: {
        "User-Agent": PUPPETEER_USER_AGENT,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        // Bing rate-limits aggressively when these are missing.
        "Sec-Ch-Ua":
          '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"macOS"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
      },
    });
    if (!res.ok) {
      log.info(TAG, "Bing returned non-200", { url, status: res.status });
      return null;
    }
    html = await res.text();
  } catch (err) {
    log.warn(TAG, "Bing fetch failed", {
      url,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }

  return parseBingHtml(html, url);
}

/**
 * Parse Bing's SERP HTML and find the result whose href matches our
 * target LinkedIn URL. Bing wraps every organic result in `<li class="b_algo">`
 * with `<h2><a href="...">title</a></h2>` and `<p class="b_lineclamp...">snippet</p>`.
 */
export function parseBingHtml(
  html: string,
  targetUrl: string,
): BingSnippet | null {
  const $ = cheerio.load(html);
  const target = normalizeForCompare(targetUrl);

  let match: BingSnippet | null = null;

  $("li.b_algo").each((_, el) => {
    if (match) return;
    const $el = $(el);
    const link = $el.find("h2 > a").first();
    const href = link.attr("href") ?? "";
    if (!href) return;

    if (normalizeForCompare(href) !== target) return;

    const title = link.text().trim();
    // Bing uses several snippet container classes depending on result
    // type. Try them all in priority order.
    const snippetEl = $el
      .find(
        "div.b_caption p, p.b_lineclamp1, p.b_lineclamp2, p.b_lineclamp3, p.b_lineclamp4",
      )
      .first();
    const snippet = snippetEl.text().trim() || null;

    match = {
      url: targetUrl,
      title: title.replace(/\s*\|\s*LinkedIn\s*$/i, "").trim() || null,
      snippet,
      bingUrl: href,
    };
  });

  return match;
}

function stripScheme(url: string): string {
  return url.replace(/^https?:\/\//i, "");
}

/**
 * LinkedIn URLs come in regional variants (`in.linkedin.com`,
 * `www.linkedin.com`). Bing might surface either one. Normalize both
 * before comparing so we still match.
 */
function normalizeForCompare(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname.replace(/^[a-z]{2}\.linkedin\.com$/i, "linkedin.com")}${u.pathname}`
      .toLowerCase()
      .replace(/\/+$/, "");
  } catch {
    return url.toLowerCase();
  }
}
