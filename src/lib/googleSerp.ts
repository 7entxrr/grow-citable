import * as cheerio from "cheerio";
import {
  applySavedCookies,
  isInteractiveCaptchaEnabled,
  saveCookiesFromPage,
  solveCaptchaInteractive,
} from "@/lib/captchaSolver";
import { log } from "@/lib/logger";
import { getBrowser, PUPPETEER_USER_AGENT, applyStealthToPage } from "@/lib/puppeteerBrowser";

/**
 * "Our own" Google SERP fetcher — no Custom Search API.
 *
 * Opens google.com/search in headless Chrome (same stack as screenshots),
 * parses organic results from the HTML, and returns ranked URLs.
 *
 * Trade-offs vs the CSE API:
 *   + No API key, no daily quota
 *   + Results are closer to what you see in a real browser
 *   − Slower (~3–8s per page of results)
 *   − Google may show CAPTCHA if you run many queries quickly
 *   − HTML selectors can break when Google redesigns (we use several fallbacks)
 */

export interface SerpItem {
  position: number;
  url: string;
  title: string;
  snippet: string;
}

export interface GoogleSearchOptions {
  query: string;
  /** 1-based index of first result (10 → page 2, 20 → page 3). */
  start?: number;
  /** Results per page (max 10 on Google). */
  num?: number;
  /** Two-letter country, e.g. "in", "us". */
  geo?: string;
  /** Two-letter language, e.g. "en". */
  hl?: string;
  /**
   * Pass `0` to disable Google's "similar results omitted" auto-filter.
   * Without this, deep pagination (>5–10 pages) silently drops most
   * matches as "duplicates" — fine for ranked queries, terrible for
   * exhaustive enumeration like our LinkedIn scraper.
   */
  filter?: 0 | 1;
}

export interface SerpPage {
  items: SerpItem[];
  /** True if Google still showed a "Next" pagination link. */
  hasNextPage: boolean;
}

export class SerpBlockedError extends Error {
  code = "SERP_BLOCKED" as const;
  constructor(message: string) {
    super(message);
  }
}

/**
 * Returns just the parsed organic results (legacy callers — Rank tracker,
 * backlink discovery — only need the URLs).
 */
export async function searchGoogle(
  options: GoogleSearchOptions,
): Promise<SerpItem[]> {
  const { items } = await searchGoogleInternal(options, /* attempt */ 1);
  return items;
}

/**
 * Returns the parsed organic results PLUS whether Google's HTML still has
 * a "Next page" link, which is the only reliable end-of-results signal
 * (the count of returned items is unreliable once you start filtering).
 */
export async function searchGooglePage(
  options: GoogleSearchOptions,
): Promise<SerpPage> {
  return searchGoogleInternal(options, /* attempt */ 1);
}

async function searchGoogleInternal(
  options: GoogleSearchOptions,
  attempt: number,
): Promise<SerpPage> {
  const start = options.start ?? 1;
  const num = Math.min(options.num ?? 10, 10);

  const url = new URL("https://www.google.com/search");
  url.searchParams.set("q", options.query);
  url.searchParams.set("num", String(num));
  if (start > 1) url.searchParams.set("start", String(start - 1));
  if (options.geo) url.searchParams.set("gl", options.geo.toLowerCase());
  if (options.hl) url.searchParams.set("hl", options.hl.toLowerCase());
  url.searchParams.set("pws", "0");
  if (options.filter !== undefined) {
    url.searchParams.set("filter", String(options.filter));
  }

  log.start("[serp:fetch]", "Loading Google SERP", {
    query: options.query.slice(0, 80),
    start,
    attempt,
  });

  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await applyStealthToPage(page);
    await page.setViewport({ width: 1280, height: 800 });
    await page.setExtraHTTPHeaders({
      "Accept-Language": options.hl
        ? `${options.hl.toLowerCase()},en;q=0.9`
        : "en-US,en;q=0.9",
    });

    const applied = await applySavedCookies(page);
    if (applied > 0) {
      log.info("[serp:fetch]", "Reusing solved-CAPTCHA cookies", { applied });
    }

    await page.goto(url.toString(), {
      waitUntil: "domcontentloaded",
      timeout: 25_000,
    });

    await page.waitForSelector("body", { timeout: 5000 }).catch(() => {});

    const html = await page.content();
    const finalUrl = page.url();

    if (isBlockedPage(html, finalUrl)) {
      log.warn("[serp:fetch]", "CAPTCHA / block page", { finalUrl, attempt });

      if (attempt < 2 && isInteractiveCaptchaEnabled()) {
        page.close().catch(() => {});
        await solveCaptchaInteractive(finalUrl);
        return searchGoogleInternal(options, attempt + 1);
      }

      throw new SerpBlockedError(
        attempt >= 2
          ? "Google blocked the request again after the CAPTCHA was solved. Wait a few minutes before retrying."
          : "Google blocked the request. Set CAPTCHA_INTERACTIVE=true (default) or use SEARCH_PROVIDER=cse with API keys.",
      );
    }

    // Refresh cookies from a successful (un-blocked) page so the trusted
    // session keeps rolling forward.
    await saveCookiesFromPage(page);

    const items = parseOrganicResults(html, start);
    const hasNextPage = detectHasNextPage(html);
    log.ok("[serp:fetch]", "Parsed results", {
      count: items.length,
      start,
      hasNextPage,
    });
    return { items, hasNextPage };
  } catch (err) {
    if (err instanceof SerpBlockedError) throw err;
    log.fail("[serp:fetch]", "SERP fetch failed", err);
    throw err;
  } finally {
    page.close().catch(() => {});
  }
}

function isBlockedPage(html: string, finalUrl: string): boolean {
  const lower = html.toLowerCase();
  if (
    lower.includes("unusual traffic") ||
    lower.includes("detected unusual traffic") ||
    lower.includes("/sorry/index") ||
    finalUrl.includes("/sorry/")
  ) {
    return true;
  }
  if (lower.includes("recaptcha") && lower.includes("captcha")) {
    return true;
  }
  return false;
}

function parseOrganicResults(html: string, startIndex: number): SerpItem[] {
  const $ = cheerio.load(html);
  const results: SerpItem[] = [];
  const seen = new Set<string>();

  // Primary: every organic title is an <h3> inside an <a> — stable for years.
  $("a h3").each((_, h3El) => {
    const h3 = $(h3El);
    const anchor = h3.parent("a");
    if (!anchor.length) return;

    const href = anchor.attr("href");
    const url = resolveGoogleHref(href);
    if (!url || isGoogleOwned(url)) return;

    const normalized = normalizeResultUrl(url);
    if (seen.has(normalized)) return;
    seen.add(normalized);

    const title = h3.text().replace(/\s+/g, " ").trim();
    if (!title) return;

    const block = anchor.closest(
      "div.g, div[data-sokoban-container], .Gx5Zad, .MjjYud, li",
    );
    const snippet =
      block
        .find(".VwiC3b, .yXK7lf, .st, [data-sncf], .IsZvec")
        .first()
        .text()
        .replace(/\s+/g, " ")
        .trim() || "";

    results.push({
      position: startIndex + results.length,
      url: normalized,
      title,
      snippet,
    });
  });

  return results;
}

/**
 * Did Google render a "Next" pagination control? Multiple selectors covering
 * the classic / mobile / redesigned SERP variants. Falsy → end of results.
 */
function detectHasNextPage(html: string): boolean {
  const $ = cheerio.load(html);

  // Classic desktop SERP — most stable across redesigns.
  if ($("#pnnext, a#pnnext").length > 0) return true;

  // Newer / mobile / continuous-scroll SERP variants.
  if ($('a[aria-label="Next page"], a[aria-label*="Next" i]').length > 0) {
    return true;
  }

  // The footer pagination row sometimes lacks #pnnext but still has
  // numbered page links. If the current page anchor has a sibling that
  // looks like a higher page number, there's more.
  const numberedNext = $("a.fl[href*='start=']").toArray().some((el) => {
    const href = $(el).attr("href") || "";
    const m = href.match(/[?&]start=(\d+)/);
    return Boolean(m);
  });
  if (numberedNext) return true;

  return false;
}

function resolveGoogleHref(href: string | undefined): string | null {
  if (!href) return null;
  if (href.startsWith("/url?") || href.startsWith("https://www.google.com/url?")) {
    try {
      const base = href.startsWith("http") ? href : `https://www.google.com${href}`;
      const u = new URL(base);
      return u.searchParams.get("q") ?? u.searchParams.get("url");
    } catch {
      return null;
    }
  }
  if (href.startsWith("http://") || href.startsWith("https://")) {
    return href;
  }
  return null;
}

function isGoogleOwned(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return (
      host.includes("google.") ||
      host === "gstatic.com" ||
      host.endsWith(".googleusercontent.com")
    );
  } catch {
    return true;
  }
}

function normalizeResultUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    return u.toString();
  } catch {
    return url;
  }
}

export function hostMatchesTarget(
  resultUrl: string,
  targetHost: string,
  targetRoot: string,
): boolean {
  try {
    const host = new URL(resultUrl).hostname.toLowerCase();
    const root = host.replace(/^www\./, "");
    return host === targetHost || root === targetRoot;
  } catch {
    return false;
  }
}

/** Small delay between SERP requests to reduce CAPTCHA risk. */
export function serpThrottleMs(): number {
  const raw = process.env.SERP_DELAY_MS;
  const n = raw ? Number(raw) : 2500;
  return Number.isFinite(n) && n >= 0 ? n : 2500;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
