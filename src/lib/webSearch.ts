import { fetchWithTimeout } from "@/lib/fetcher";
import { CSE_ENDPOINT } from "@/lib/backlinkDiscovery";
import {
  searchGoogle,
  SerpBlockedError,
  type SerpItem,
} from "@/lib/googleSerp";
import { log } from "@/lib/logger";
import { isCseConfigured, resolveSearchProvider } from "@/lib/searchProvider";
import * as cheerio from "cheerio";

export type { SerpItem } from "@/lib/googleSerp";
export { SerpBlockedError, serpThrottleMs, sleep, hostMatchesTarget } from "@/lib/googleSerp";

export interface WebSearchOptions {
  query: string;
  start?: number;
  num?: number;
  geo?: string;
  hl?: string;
}

/**
 * Unified web search with automatic fallback:
 *
 *   1. If GOOGLE_CSE_* keys exist → Custom Search API (default, no CAPTCHA)
 *   2. If SEARCH_PROVIDER=puppeteer → headless Google, then CSE on CAPTCHA
 *   3. If still blocked and no CSE → DuckDuckGo HTML (first page only)
 */
export async function searchWeb(
  options: WebSearchOptions,
): Promise<SerpItem[]> {
  const provider = resolveSearchProvider();

  if (provider === "cse") {
    return searchViaCse(options);
  }
  if (provider === "serper") {
    return searchViaSerper(options);
  }

  try {
    const items = await searchGoogle(options);
    if (items.length > 0) return items;
    if (isCseConfigured()) {
      log.warn("[webSearch]", "Empty Google SERP, trying CSE");
      return searchViaCse(options);
    }
    return items;
  } catch (err) {
    if (err instanceof SerpBlockedError && isCseConfigured()) {
      log.warn(
        "[webSearch]",
        "Google CAPTCHA — falling back to Custom Search API",
      );
      return searchViaCse(options);
    }
    if (err instanceof SerpBlockedError) {
      log.warn(
        "[webSearch]",
        "Google CAPTCHA — falling back to DuckDuckGo",
      );
      try {
        return await searchViaDuckDuckGo(options);
      } catch (ddgErr) {
        log.warn("[webSearch]", "DuckDuckGo fallback failed. Trying Yahoo fallback...", ddgErr);
        try {
          return await searchViaYahoo(options);
        } catch (yahooErr) {
          log.warn("[webSearch]", "Yahoo fallback failed. Trying Bing fallback...", yahooErr);
          try {
            return await searchViaBing(options);
          } catch (bingErr) {
            log.fail("[webSearch]", "All fallbacks (Google, DuckDuckGo, Yahoo, Bing) failed.");
            throw new SerpBlockedError(
              "All search providers failed. Google, DuckDuckGo, Yahoo, and Bing are rate-limiting or blocking your IP. Please try again in a few minutes or configure GOOGLE_CSE_API_KEY for a reliable key-based search."
            );
          }
        }
      }
    }
    throw err;
  }
}

async function searchViaCse(options: WebSearchOptions): Promise<SerpItem[]> {
  const apiKey = process.env.GOOGLE_CSE_API_KEY;
  const cx = process.env.GOOGLE_CSE_CX;
  if (!apiKey || !cx) {
    throw new Error(
      "Custom Search is not configured. Set GOOGLE_CSE_API_KEY and GOOGLE_CSE_CX.",
    );
  }

  const start = options.start ?? 1;
  const num = Math.min(options.num ?? 10, 10);

  const url = new URL(CSE_ENDPOINT);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("cx", cx);
  url.searchParams.set("q", options.query);
  url.searchParams.set("num", String(num));
  url.searchParams.set("start", String(start));
  if (options.geo) url.searchParams.set("gl", options.geo.toLowerCase());
  if (options.hl) url.searchParams.set("hl", options.hl.toLowerCase());

  log.start("[webSearch:cse]", "CSE query", {
    q: options.query.slice(0, 60),
    start,
  });

  const res = await fetchWithTimeout(url.toString(), {
    timeoutMs: 15_000,
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    log.fail("[webSearch:cse]", `HTTP ${res.status}`, {
      status: res.status,
      body: body.slice(0, 800),
    });
    throw new Error(describeCseFailure(res.status, body));
  }

  const data = (await res.json()) as {
    items?: { link?: string; title?: string; snippet?: string }[];
  };

  const items: SerpItem[] = (data.items ?? []).map((item, i) => ({
    position: start + i,
    url: item.link ?? "",
    title: item.title ?? "",
    snippet: item.snippet ?? "",
  }));

  log.ok("[webSearch:cse]", "Results", { count: items.length });
  return items.filter((x) => x.url);
}

function describeCseFailure(status: number, body: string): string {
  const lower = body.toLowerCase();
  let reason: string | null = null;
  try {
    const parsed = JSON.parse(body) as {
      error?: { message?: string; errors?: { reason?: string; message?: string }[] };
    };
    const e = parsed.error?.errors?.[0];
    if (e) reason = [e.reason, e.message].filter(Boolean).join(" — ") || null;
    else reason = parsed.error?.message ?? null;
  } catch {
    /* not JSON */
  }

  if (status === 403) {
    if (lower.includes("daily limit") || lower.includes("dailylimitexceeded")) {
      return "Custom Search daily quota exceeded (100/day free tier).";
    }
    if (lower.includes("api key not valid")) {
      return "GOOGLE_CSE_API_KEY is invalid. Recreate it in Cloud Console → Credentials.";
    }
    if (lower.includes("requests from referer") || lower.includes("ip address restrictions")) {
      return "GOOGLE_CSE_API_KEY has HTTP referrer / IP restrictions. Remove them (or set 'None') in Cloud Console → Credentials.";
    }
    if (lower.includes("has not been used") || lower.includes("service_disabled") || lower.includes("accessnotconfigured")) {
      return "Custom Search API is not enabled. Enable at https://console.cloud.google.com/apis/library/customsearch.googleapis.com";
    }
    return `Custom Search 403${reason ? `: ${reason}` : " — check API is enabled and key has no restrictions."}`;
  }
  if (status === 400 && lower.includes("cx")) {
    return "GOOGLE_CSE_CX is invalid. Copy it from https://programmablesearchengine.google.com/";
  }
  return `Custom Search ${status}${reason ? `: ${reason}` : ""}`;
}

/** DuckDuckGo HTML — no API key; first page only (no reliable deep pagination). */
async function searchViaDuckDuckGo(
  options: WebSearchOptions,
): Promise<SerpItem[]> {
  const start = options.start ?? 1;
  if (start > 1) {
    log.warn("[webSearch:ddg]", "DuckDuckGo fallback only supports first page");
    return [];
  }

  const cleanedQuery = cleanQueryForFallback(options.query);
  const url = "https://html.duckduckgo.com/html/";
  const body = new URLSearchParams({ q: cleanedQuery });

  log.start("[webSearch:ddg]", "DuckDuckGo HTML", {
    q: cleanedQuery.slice(0, 60),
  });

  const res = await fetchWithTimeout(url, {
    method: "POST",
    timeoutMs: 15_000,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    },
    body: body.toString(),
  });

  if (!res.ok) {
    throw new SerpBlockedError(
      "Google blocked the request and DuckDuckGo fallback failed. Add GOOGLE_CSE_API_KEY + GOOGLE_CSE_CX to .env.local (you may already have them) or wait and retry.",
    );
  }

  const html = await res.text();
  const $ = cheerio.load(html);
  const results: SerpItem[] = [];
  const seen = new Set<string>();

  $(".result").each((_, el) => {
    const anchor = $(el).find("a.result__a").first();
    const href = anchor.attr("href");
    if (!href || seen.has(href)) return;
    seen.add(href);

    let resultUrl = href;
    if (href.includes("uddg=")) {
      try {
        const u = new URL(href, "https://duckduckgo.com");
        const decoded = u.searchParams.get("uddg");
        if (decoded) resultUrl = decodeURIComponent(decoded);
      } catch {
        /* keep href */
      }
    }

    const title = anchor.text().replace(/\s+/g, " ").trim();
    const snippet = $(el)
      .find(".result__snippet")
      .text()
      .replace(/\s+/g, " ")
      .trim();

    if (title && resultUrl.startsWith("http")) {
      results.push({
        position: results.length + 1,
        url: resultUrl,
        title,
        snippet,
      });
    }
  });

  log.ok("[webSearch:ddg]", "Results", { count: results.length });

  if (results.length === 0) {
    const htmlLower = html.toLowerCase();
    if (htmlLower.includes("captcha") || htmlLower.includes("blocked") || htmlLower.includes("forbidden") || htmlLower.includes("security check")) {
      throw new SerpBlockedError("DuckDuckGo captcha/block detected");
    }
  }

  return results;
}

async function searchViaYahoo(options: WebSearchOptions): Promise<SerpItem[]> {
  const start = options.start ?? 1;
  const cleanedQuery = cleanQueryForFallback(options.query);
  const url = `https://search.yahoo.com/search?p=${encodeURIComponent(cleanedQuery)}&b=${start}`;

  log.start("[webSearch:yahoo]", "Yahoo Search", { q: cleanedQuery.slice(0, 60), start });

  const res = await fetchWithTimeout(url, {
    method: "GET",
    timeoutMs: 15_000,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });

  if (!res.ok) {
    throw new Error(`Yahoo returned status ${res.status}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);
  const results: SerpItem[] = [];
  const seen = new Set<string>();

  $("div.dd.algo").each((_, el) => {
    const anchor = $(el).find("h3.title a").first();
    const href = anchor.attr("href");
    if (!href || seen.has(href)) return;
    seen.add(href);

    let resultUrl = href;
    if (href.includes("/RU=")) {
      try {
        const u = new URL(href);
        const ru = u.pathname.match(/\/RU=([^\/]+)/);
        if (ru && ru[1]) resultUrl = decodeURIComponent(ru[1]);
      } catch {
        /* skip */
      }
    }

    const title = anchor.text().replace(/\s+/g, " ").trim();
    const snippet = $(el)
      .find(".compText, p.lh-16")
      .first()
      .text()
      .replace(/\s+/g, " ")
      .trim() || "";

    if (title && resultUrl.startsWith("http")) {
      results.push({
        position: start + results.length,
        url: resultUrl,
        title,
        snippet,
      });
    }
  });

  log.ok("[webSearch:yahoo]", "Results", { count: results.length });
  if (results.length === 0) {
    const htmlLower = html.toLowerCase();
    if (htmlLower.includes("captcha") || htmlLower.includes("blocked") || htmlLower.includes("forbidden") || htmlLower.includes("unusual activity")) {
      throw new Error("Yahoo captcha/block detected");
    }
  }
  return results;
}

async function searchViaBing(options: WebSearchOptions): Promise<SerpItem[]> {
  const start = options.start ?? 1;
  const cleanedQuery = cleanQueryForFallback(options.query);
  const url = `https://www.bing.com/search?q=${encodeURIComponent(cleanedQuery)}&first=${start}`;

  log.start("[webSearch:bing]", "Bing Search", { q: cleanedQuery.slice(0, 60), start });

  const res = await fetchWithTimeout(url, {
    method: "GET",
    timeoutMs: 15_000,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  if (!res.ok) {
    throw new Error(`Bing returned status ${res.status}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);
  const results: SerpItem[] = [];
  const seen = new Set<string>();

  $("li.b_algo").each((_, el) => {
    const anchor = $(el).find("h2 a").first();
    const href = anchor.attr("href");
    if (!href || seen.has(href)) return;
    seen.add(href);

    const title = anchor.text().replace(/\s+/g, " ").trim();
    const snippet = $(el)
      .find(".b_caption p, .b_algo_snippet")
      .first()
      .text()
      .replace(/\s+/g, " ")
      .trim() || "";

    if (title && href.startsWith("http")) {
      results.push({
        position: start + results.length,
        url: href,
        title,
        snippet,
      });
    }
  });

  log.ok("[webSearch:bing]", "Results", { count: results.length });
  if (results.length === 0) {
    const htmlLower = html.toLowerCase();
    if (htmlLower.includes("captcha") || htmlLower.includes("blocked") || htmlLower.includes("forbidden") || htmlLower.includes("unusual traffic")) {
      throw new Error("Bing captcha/block detected");
    }
  }
  return results;
}

function cleanQueryForFallback(query: string): string {
  return query
    .replace(/-site:\S+/g, "")
    .replace(/["']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function searchViaSerper(options: WebSearchOptions): Promise<SerpItem[]> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey || apiKey.includes("YOUR_KEY")) {
    throw new Error("Serper API key is missing. Set SERPER_API_KEY in .env.local");
  }

  const num = Math.min(options.num ?? 10, 10);
  const start = options.start ?? 1;

  const cleanedQuery = cleanQueryForFallback(options.query);

  log.start("[webSearch:serper]", "Serper.dev query", { q: cleanedQuery.slice(0, 60), num });

  try {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: cleanedQuery,
        num,
        gl: options.geo?.toLowerCase() || "us",
        hl: options.hl?.toLowerCase() || "en",
      }),
    });

    if (!res.ok) {
      throw new Error(`Serper API returned status ${res.status}`);
    }

    const data = await res.json();
    const items: SerpItem[] = (data.organic || []).map((o: any, i: number) => ({
      position: start + i,
      url: o.link || "",
      title: o.title || "",
      snippet: o.snippet || "",
    }));

    log.ok("[webSearch:serper]", "Results", { count: items.length });
    return items.filter((x) => x.url);
  } catch (err) {
    log.fail("[webSearch:serper]", "Failed", err);
    throw err;
  }
}
