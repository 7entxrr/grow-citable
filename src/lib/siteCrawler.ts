import { createHash } from "node:crypto";
import * as cheerio from "cheerio";
import { log } from "@/lib/logger";
import { getBrowser, PUPPETEER_USER_AGENT, applyStealthToPage } from "@/lib/puppeteerBrowser";
import type {
  BrokenLink,
  CrawlPage,
  CrawlReport,
  DuplicateGroup,
  MissingMetaIssue,
  RedirectEntry,
  RedirectHop,
  UnverifiedLink,
} from "@/types/crawler";

/**
 * Same-domain BFS crawler that, for every page reached, records:
 *   - HTTP status + redirect chain
 *   - title / description / canonical / h1 count
 *   - SHA-1 hash of normalised body text (for duplicate detection)
 *   - all internal + external links
 *
 * After the crawl we additionally:
 *   - HEAD-check every external link to flag broken ones
 *   - Group duplicates by content hash
 *   - Extract redirect entries from page redirect chains
 *   - Flag pages with missing title / description / canonical / H1
 */

// A real Chrome User-Agent — some sites (Cloudflare, Akamai, etc.) auto-block
// anything that smells like a bot, so we mimic a desktop browser. The existing
// fetcher in @/lib/fetcher uses the same string for the same reason.
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent": USER_AGENT,
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  "Upgrade-Insecure-Requests": "1",
};

const FETCH_TIMEOUT_MS = 12_000;
const MAX_REDIRECT_HOPS = 5;
const MAX_PAGE_BYTES = 2_500_000; // 2.5 MB — huge pages get truncated to keep parse fast
const NON_HTML_EXT = new Set([
  "pdf", "zip", "tar", "gz", "rar", "7z",
  "doc", "docx", "xls", "xlsx", "ppt", "pptx",
  "jpg", "jpeg", "png", "gif", "webp", "svg", "ico", "bmp",
  "mp3", "mp4", "mov", "avi", "wav", "ogg", "webm",
  "css", "js", "json", "xml", "rss",
  "woff", "woff2", "ttf", "otf", "eot",
]);
const MAX_EXTERNAL_CHECKS = 500;
const MAX_INTERNAL_PROBES = 500;
const PROBE_TIMEOUT_MS = 10_000;

/**
 * Hosts that aggressively block any non-browser HTTP client. We never get a
 * meaningful "is this URL alive?" answer from them, so we mark links to
 * these hosts as "unverified" instead of polluting the broken-links table.
 *
 * Anyone who's ever run Screaming Frog has hit this same false-positive
 * pattern — these aren't broken, the hosts just refuse to talk to bots.
 */
const BOT_HOSTILE_HOST_SUFFIXES = [
  "linkedin.com",
  "x.com",
  "twitter.com",
  "t.co",
  "instagram.com",
  "facebook.com",
  "fb.com",
  "fb.me",
  "threads.net",
  "tiktok.com",
  "pinterest.com",
  "quora.com",
];

export interface CrawlerOptions {
  seedUrl: string;
  /** Max pages to crawl. Default 30, hard cap 200. */
  maxPages?: number;
  /** Pages fetched in parallel. Default 5. */
  concurrency?: number;
  /** If true, HEAD-check every external link. Default true. */
  checkExternal?: boolean;
  /**
   * Skip every probe phase (broken-link detection, redirect chain probes,
   * uncrawled-URL HEAD checks). Used when a downstream tool (e.g. the
   * spell-checker) only needs page text and doesn't care about link health.
   */
  skipProbing?: boolean;
}

export async function crawlSite(
  options: CrawlerOptions,
): Promise<CrawlReport> {
  const startedAt = new Date();
  const seedUrl = normalizeUrl(options.seedUrl);
  const origin = new URL(seedUrl).origin;
  const domain = new URL(seedUrl).hostname;
  const maxPages = Math.min(Math.max(1, options.maxPages ?? 100), 500);
  const concurrency = Math.max(1, Math.min(10, options.concurrency ?? 5));
  const checkExternal = options.checkExternal ?? true;
  const skipProbing = options.skipProbing ?? false;

  log.start("[crawler:start]", "Crawling site", {
    seedUrl,
    maxPages,
    concurrency,
  });

  const queue: string[] = [seedUrl];
  const queued = new Set<string>([seedUrl]);
  const pages: CrawlPage[] = [];
  let skippedDueToLimit = 0;

  // Seed the queue with every URL advertised by the sitemap. This massively
  // expands coverage on real-world sites where the homepage doesn't link to
  // every article / product / blog post.
  const sitemapUrls = await discoverSitemapUrls(origin);
  if (sitemapUrls.length > 0) {
    log.info(
      "[crawler:sitemap]",
      `Discovered ${sitemapUrls.length} URL(s) in sitemap`,
    );
    for (const url of sitemapUrls) {
      const normalized = normalizeUrl(url);
      if (queued.has(normalized)) continue;
      try {
        if (new URL(normalized).host !== new URL(origin).host) continue;
      } catch {
        continue;
      }
      if (looksNonHtml(normalized)) continue;
      queued.add(normalized);
      queue.push(normalized);
    }
  }

  while (queue.length > 0 && pages.length < maxPages) {
    const batch = queue.splice(0, concurrency);
    const remaining = maxPages - pages.length;
    const slice = batch.slice(0, remaining);
    const results = await Promise.all(
      slice.map((url) => fetchPage(url, origin)),
    );
    for (const page of results) {
      pages.push(page);
      for (const link of page.internalLinks) {
        if (queued.has(link)) continue;
        if (looksNonHtml(link)) continue;
        if (pages.length + queue.length >= maxPages) {
          skippedDueToLimit++;
          continue;
        }
        queued.add(link);
        queue.push(link);
      }
    }
  }

  // Anything else still in the queue (over the limit) counts as skipped.
  skippedDueToLimit += queue.length;

  log.ok("[crawler:start]", "Crawl phase done", {
    pages: pages.length,
    skipped: skippedDueToLimit,
  });

  /* --- Exhaustive URL verification ---
   *
   * BFS only fetches up to `maxPages` HTML pages. Every other URL the site
   * links to — uncrawled pages, PDFs, images, asset URLs, every external
   * link — gets probed here with HEAD (falling back to GET if HEAD is
   * rejected) so we know whether it's reachable and can capture its full
   * redirect chain.
   */

  const externalLinks = collectExternalLinks(pages);
  let brokenLinks: BrokenLink[] = [];
  let unverifiedLinks: UnverifiedLink[] = [];
  const redirects: RedirectEntry[] = extractRedirects(pages);

  if (!skipProbing) {
    const linkIndex = buildLinkMetadataIndex(pages);
    const detected = await detectBrokenLinks({
      pages,
      externalLinks,
      checkExternal,
      linkIndex,
    });
    brokenLinks = detected.broken;
    unverifiedLinks = detected.unverified;
    for (const r of detected.redirects) redirects.push(r);

    const extraInternal = await probeUncrawledInternal(pages, linkIndex);
    for (const b of extraInternal.broken) brokenLinks.push(b);
    for (const r of extraInternal.redirects) redirects.push(r);
  }

  const duplicates = extractDuplicates(pages);
  const missingMeta = extractMissingMeta(pages);

  const finishedAt = new Date();
  const internalLinkSet = new Set<string>();
  for (const p of pages) for (const l of p.internalLinks) internalLinkSet.add(l);

  const seedPage = pages.find((p) => p.url === seedUrl) ?? pages[0];
  const seedBlocked = detectSeedBlock(seedPage);
  if (seedBlocked) {
    log.warn("[crawler:start]", "Seed URL was blocked or unreachable", {
      status: seedBlocked.status,
      reason: seedBlocked.reason,
    });
  }

  const report: CrawlReport = {
    seedUrl,
    domain,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    seedBlocked,
    summary: {
      pagesCrawled: pages.length,
      pagesQueuedButSkipped: skippedDueToLimit,
      pagesLimit: maxPages,
      uniqueInternalLinks: internalLinkSet.size,
      uniqueExternalLinks: externalLinks.size,
      brokenLinks: brokenLinks.length,
      unverifiedLinks: unverifiedLinks.length,
      redirects: redirects.length,
      duplicateGroups: duplicates.length,
      missingMetaPages: missingMeta.length,
      sitemapUrlsDiscovered: sitemapUrls.length,
    },
    pages,
    brokenLinks,
    unverifiedLinks,
    redirects,
    duplicates,
    missingMeta,
  };

  log.ok("[crawler:done]", "Crawl complete", {
    domain,
    pages: pages.length,
    broken: brokenLinks.length,
    unverified: unverifiedLinks.length,
    redirects: redirects.length,
    duplicates: duplicates.length,
    missingMeta: missingMeta.length,
    durationMs: report.durationMs,
  });

  return report;
}

/* ---------- Per-page fetch + parse ---------- */

async function fetchPage(url: string, origin: string): Promise<CrawlPage> {
  const startedAt = Date.now();
  const fetchedAt = new Date().toISOString();

  let finalUrl = url;
  let status = 0;
  let chain: RedirectHop[] = [];
  let body = "";
  let headers: Headers | null = null;
  let errorMsg: string | null = null;
  let usedPuppeteer = false;

  try {
    const res = await fetchWithRedirects(url);
    finalUrl = res.finalUrl;
    status = res.status;
    chain = res.chain;
    body = res.body;
    headers = res.headers;
  } catch (err) {
    errorMsg = err instanceof Error ? err.message : "fetch failed";
  }

  // Fallback to Puppeteer if fetch failed, returned 0/ERR, or returned a blocked/error status (like 403)
  if (errorMsg || status === 0 || status >= 400) {
    log.info("[crawler:page]", `Fetch failed/blocked for ${url} (status: ${status}). Retrying with Puppeteer fallback...`);
    try {
      const browser = await getBrowser();
      const page = await browser.newPage();
      try {
        await applyStealthToPage(page);
        await page.setViewport({ width: 1280, height: 800 });

        let puppeteerStatus = 200;
        page.on("response", (response) => {
          const rUrl = response.url();
          if (rUrl === url || rUrl === finalUrl) {
            puppeteerStatus = response.status();
          }
        });

        await page.goto(url, {
          waitUntil: "networkidle2",
          timeout: 20000,
        });

        body = await page.content();
        finalUrl = page.url();
        status = puppeteerStatus;
        errorMsg = null;
        usedPuppeteer = true;
      } finally {
        await page.close();
      }
    } catch (puppeteerErr) {
      log.warn("[crawler:page]", `Puppeteer fallback also failed for ${url}:`, puppeteerErr);
    }
  }

  const loadTimeMs = Date.now() - startedAt;

  if (errorMsg) {
    return {
      url,
      finalUrl: url,
      status: status || 0,
      redirectChain: [],
      fetchedAt,
      loadTimeMs,
      title: "",
      description: "",
      canonical: "",
      h1Count: 0,
      wordCount: 0,
      bodyText: "",
      internalLinks: [],
      externalLinks: [],
      contentHash: null,
      error: errorMsg,
    };
  }

  // Check content type if we fetched via node request
  if (headers && !usedPuppeteer) {
    const ctype = (headers.get("content-type") ?? "").toLowerCase();
    const isHtml = ctype.includes("html") || ctype === "";

    if (!isHtml) {
      return {
        url,
        finalUrl,
        status,
        redirectChain: chain,
        fetchedAt,
        loadTimeMs,
        title: "",
        description: "",
        canonical: "",
        h1Count: 0,
        wordCount: 0,
        bodyText: "",
        internalLinks: [],
        externalLinks: [],
        contentHash: null,
      };
    }
  }

  const parsed = parseHtml(body, finalUrl, origin);
  const contentHash = parsed.bodyText
    ? createHash("sha1").update(parsed.bodyText.toLowerCase()).digest("hex")
    : null;

  // If Puppeteer successfully got text, override status to 200 to bypass skipping downstream
  if (usedPuppeteer && (status === 0 || status >= 400) && parsed.wordCount >= 5) {
    status = 200;
  }

  return {
    url,
    finalUrl,
    status,
    redirectChain: chain,
    fetchedAt,
    loadTimeMs,
    title: parsed.title,
    description: parsed.description,
    canonical: parsed.canonical,
    h1Count: parsed.h1Count,
    wordCount: parsed.wordCount,
    bodyText: parsed.bodyText,
    internalLinks: parsed.internalLinks,
    externalLinks: parsed.externalLinks,
    linkDetails: parsed.linkDetails,
    contentHash,
  };
}

interface FetchResult {
  finalUrl: string;
  status: number;
  chain: RedirectHop[];
  body: string;
  headers: Headers;
}

async function fetchWithRedirects(initialUrl: string): Promise<FetchResult> {
  const chain: RedirectHop[] = [];
  let currentUrl = initialUrl;

  for (let hop = 0; hop <= MAX_REDIRECT_HOPS; hop++) {
    const res = await rawFetch(currentUrl);
    const location = res.headers.get("location");
    chain.push({
      url: currentUrl,
      status: res.status,
      location: location ?? undefined,
    });

    if (res.status >= 300 && res.status < 400 && location) {
      try {
        currentUrl = new URL(location, currentUrl).toString();
      } catch {
        // Invalid Location header — bail.
        return {
          finalUrl: currentUrl,
          status: res.status,
          chain,
          body: "",
          headers: res.headers,
        };
      }
      continue;
    }

    let body = "";
    try {
      body = await readBoundedText(res);
    } catch {
      /* keep empty body */
    }
    return {
      finalUrl: currentUrl,
      status: res.status,
      chain,
      body,
      headers: res.headers,
    };
  }

  throw new Error(`Too many redirects (>${MAX_REDIRECT_HOPS})`);
}

async function rawFetch(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      method: "GET",
      redirect: "manual",
      signal: controller.signal,
      headers: BROWSER_HEADERS,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function readBoundedText(res: Response): Promise<string> {
  if (!res.body) return res.text();
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let received = 0;
  let html = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    html += decoder.decode(value, { stream: true });
    if (received >= MAX_PAGE_BYTES) {
      try {
        await reader.cancel();
      } catch {
        /* ignore */
      }
      break;
    }
  }
  html += decoder.decode();
  return html;
}

/* ---------- HTML parsing ---------- */

interface ParsedHtml {
  title: string;
  description: string;
  canonical: string;
  h1Count: number;
  bodyText: string;
  wordCount: number;
  internalLinks: string[];
  externalLinks: string[];
  linkDetails: { href: string; anchor: string }[];
}

function resolveLinkUrl(
  raw: string | undefined | null,
  baseUrl: string,
  originHost: string,
): { href: string; isInternal: boolean } | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (
    trimmed.startsWith("#") ||
    trimmed.startsWith("mailto:") ||
    trimmed.startsWith("tel:") ||
    trimmed.startsWith("sms:") ||
    trimmed.startsWith("javascript:") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("about:")
  ) {
    return null;
  }
  let abs: string;
  try {
    abs = new URL(trimmed, baseUrl).toString();
  } catch {
    return null;
  }
  abs = stripHash(abs);
  let host: string;
  let proto: string;
  try {
    const u = new URL(abs);
    host = u.host;
    proto = u.protocol;
  } catch {
    return null;
  }
  if (!/^https?:$/.test(proto)) return null;

  const isInternal = host === originHost;
  return {
    href: isInternal ? normalizeUrl(abs) : abs,
    isInternal,
  };
}

function parseHtml(html: string, baseUrl: string, origin: string): ParsedHtml {
  const $ = cheerio.load(html);

  const title = ($("title").first().text() ?? "").trim();
  const description = ($('meta[name="description"]').attr("content") ?? "").trim();
  const canonical = ($('link[rel="canonical"]').attr("href") ?? "").trim();
  const h1Count = $("h1").length;

  const internalSet = new Set<string>();
  const externalSet = new Set<string>();
  const linkDetails: { href: string; anchor: string }[] = [];
  const originHost = new URL(origin).host;

  const addWithAnchor = (raw: string | undefined | null, anchorText: string) => {
    const res = resolveLinkUrl(raw, baseUrl, originHost);
    if (!res) return;

    if (res.isInternal) {
      internalSet.add(res.href);
    } else {
      externalSet.add(res.href);
    }
    linkDetails.push({ href: res.href, anchor: anchorText.trim() });
  };

  // 1. Standard anchor links.
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    const anchorText = $(el).text().trim() || "[No Text]";
    addWithAnchor(href, anchorText);
  });

  // 2. Form actions.
  $("form[action]").each((_, el) => {
    const href = $(el).attr("action");
    addWithAnchor(href, "[Form Action]");
  });

  // 3. Buttons that are links via data-* / formaction.
  const buttonAttrs = ["data-href", "data-url", "data-link", "data-target", "formaction"];
  $("button, [role='button']").each((_, el) => {
    const label = $(el).text().trim() || "[Button]";
    for (const attr of buttonAttrs) {
      const v = $(el).attr(attr);
      if (v) addWithAnchor(v, `Button: ${label}`);
    }
  });

  // 4. Embedded resources.
  $("iframe[src]").each((_, el) => addWithAnchor($(el).attr("src"), "[Iframe]"));
  $("area[href]").each((_, el) => addWithAnchor($(el).attr("href"), "[Image Map Area]"));

  // 5. Dropdown options.
  $("select option[value]").each((_, el) => {
    const v = $(el).attr("value") ?? "";
    const label = $(el).text().trim() || "[Dropdown Option]";
    if (v.startsWith("http") || v.startsWith("/")) {
      addWithAnchor(v, `Option: ${label}`);
    }
  });

  // 6. Meta refresh.
  const refresh = $('meta[http-equiv="refresh" i]').attr("content");
  if (refresh) {
    const m = /url\s*=\s*(.+)/i.exec(refresh);
    if (m && m[1]) addWithAnchor(m[1].trim().replace(/^['"]|['"]$/g, ""), "[Meta Refresh]");
  }

  // 7. Link tags (alternate / next / prev).
  $(
    'link[rel="alternate"][href], link[rel="next"][href], link[rel="prev"][href], link[rel="amphtml"][href]',
  ).each((_, el) => {
    const rel = $(el).attr("rel") || "link";
    addWithAnchor($(el).attr("href"), `[Link Rel=${rel}]`);
  });

  // 8. Inline onclick handlers.
  const navRegex =
    /(?:location\.href|window\.location\.href|location|window\.location|window\.open)\s*[=(]\s*['"`]([^'"`]+)['"`]/g;
  $("[onclick]").each((_, el) => {
    const code = $(el).attr("onclick") ?? "";
    const label = $(el).text().trim() || "[Onclick Element]";
    for (const m of code.matchAll(navRegex)) {
      addWithAnchor(m[1], `Onclick: ${label}`);
    }
  });

  // 9. Clean body text.
  $("script, style, noscript, template, svg").remove();
  const bodyText = $("body")
    .text()
    .replace(/\s+/g, " ")
    .trim();
  const wordCount = bodyText ? bodyText.split(/\s+/).length : 0;

  return {
    title,
    description,
    canonical,
    h1Count,
    bodyText,
    wordCount,
    internalLinks: Array.from(internalSet),
    externalLinks: Array.from(externalSet),
    linkDetails,
  };
}

/**
 * Resolve a raw URL string against the page URL, drop unsupported schemes
 * (mailto, tel, javascript, anchors), and add it to either the internal or
 * external bucket based on host comparison.
 */
function tryAddLink(
  raw: string | undefined | null,
  baseUrl: string,
  originHost: string,
  internalSet: Set<string>,
  externalSet: Set<string>,
): void {
  if (!raw) return;
  const trimmed = raw.trim();
  if (!trimmed) return;
  if (
    trimmed.startsWith("#") ||
    trimmed.startsWith("mailto:") ||
    trimmed.startsWith("tel:") ||
    trimmed.startsWith("sms:") ||
    trimmed.startsWith("javascript:") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("about:")
  ) {
    return;
  }
  let abs: string;
  try {
    abs = new URL(trimmed, baseUrl).toString();
  } catch {
    return;
  }
  abs = stripHash(abs);
  let host: string;
  let proto: string;
  try {
    const u = new URL(abs);
    host = u.host;
    proto = u.protocol;
  } catch {
    return;
  }
  if (!/^https?:$/.test(proto)) return;
  if (host === originHost) {
    internalSet.add(normalizeUrl(abs));
  } else {
    externalSet.add(abs);
  }
}

/* ---------- Issue extraction ---------- */

function collectExternalLinks(pages: CrawlPage[]): Set<string> {
  const set = new Set<string>();
  for (const p of pages) for (const link of p.externalLinks) set.add(link);
  return set;
}

interface DetectBrokenOptions {
  pages: CrawlPage[];
  externalLinks: Set<string>;
  checkExternal: boolean;
  linkIndex: Map<string, LinkMetadata>;
}

async function detectBrokenLinks({
  pages,
  externalLinks,
  checkExternal,
  linkIndex,
}: DetectBrokenOptions): Promise<{
  broken: BrokenLink[];
  unverified: UnverifiedLink[];
  redirects: RedirectEntry[];
}> {
  const broken: BrokenLink[] = [];
  const unverified: UnverifiedLink[] = [];
  const redirects: RedirectEntry[] = [];

  // 1. Internal pages that failed during crawl.
  for (const page of pages) {
    if (page.status === 0) {
      const idx = linkIndex.get(page.url);
      broken.push({
        href: page.url,
        status: null,
        scope: "internal",
        foundOn: idx?.foundOn ?? [],
        anchorTexts: idx?.anchorTexts ?? [],
        anchorText: idx?.anchorTexts?.join(", ") || "—",
        reason: page.error ?? "Network error",
      });
    } else if (page.status >= 400) {
      const idx = linkIndex.get(page.url);
      broken.push({
        href: page.url,
        status: page.status,
        scope: "internal",
        foundOn: idx?.foundOn ?? [],
        anchorTexts: idx?.anchorTexts ?? [],
        anchorText: idx?.anchorTexts?.join(", ") || "—",
        reason: `HTTP ${page.status}`,
      });
    }
  }

  // 2. External links — split into "actually probe" vs "known bot wall".
  if (!checkExternal || externalLinks.size === 0) {
    return { broken, unverified, redirects };
  }

  const all = Array.from(externalLinks).slice(0, MAX_EXTERNAL_CHECKS);
  const probeTargets: string[] = [];

  for (const href of all) {
    const host = safeHostname(href);
    if (host && isBotHostileHost(host)) {
      const idx = linkIndex.get(href);
      unverified.push({
        href,
        host,
        reason:
          "Host blocks automated checks (returns a bot wall regardless of whether the page exists). The link is almost certainly fine.",
        status: null,
        foundOn: idx?.foundOn ?? [],
      });
      continue;
    }
    probeTargets.push(href);
  }

  const results = await runWithConcurrency(probeTargets, 8, async (href) => {
    const probe = await probeUrlWithRedirects(href);
    return { href, ...probe };
  });

  for (const r of results) {
    if (r.status === 999) {
      const idx = linkIndex.get(r.href);
      unverified.push({
        href: r.href,
        host: safeHostname(r.href) ?? "",
        reason: "HTTP 999 — non-standard bot-block response. Not actually broken.",
        status: 999,
        foundOn: idx?.foundOn ?? [],
      });
      continue;
    }

    if (r.chain.length >= 2 && r.href !== r.finalUrl) {
      redirects.push({
        from: r.href,
        to: r.finalUrl,
        hops: r.chain.length - 1,
        chain: r.chain,
        scope: "external",
      });
    }

    if (r.status === 0) {
      const idx = linkIndex.get(r.href);
      broken.push({
        href: r.href,
        status: null,
        scope: "external",
        foundOn: idx?.foundOn ?? [],
        anchorTexts: idx?.anchorTexts ?? [],
        anchorText: idx?.anchorTexts?.join(", ") || "—",
        reason: "Network error or timeout",
      });
    } else if (r.status >= 400) {
      const idx = linkIndex.get(r.href);
      broken.push({
        href: r.href,
        status: r.status,
        scope: "external",
        foundOn: idx?.foundOn ?? [],
        anchorTexts: idx?.anchorTexts ?? [],
        anchorText: idx?.anchorTexts?.join(", ") || "—",
        reason: `HTTP ${r.status}`,
      });
    }
  }

  return { broken, unverified, redirects };
}

/**
 * Probe every internal URL that the BFS crawler didn't fetch.
 */
async function probeUncrawledInternal(
  pages: CrawlPage[],
  linkIndex: Map<string, LinkMetadata>,
): Promise<{
  broken: BrokenLink[];
  redirects: RedirectEntry[];
}> {
  const broken: BrokenLink[] = [];
  const redirects: RedirectEntry[] = [];

  const crawled = new Set<string>();
  for (const p of pages) {
    crawled.add(p.url);
    if (p.finalUrl) crawled.add(p.finalUrl);
  }

  const seen = new Set<string>();
  const toProbe: string[] = [];

  for (const p of pages) {
    for (const link of p.internalLinks) {
      if (crawled.has(link) || seen.has(link)) continue;
      seen.add(link);
      toProbe.push(link);
      if (toProbe.length >= MAX_INTERNAL_PROBES) break;
    }
    if (toProbe.length >= MAX_INTERNAL_PROBES) break;
  }

  if (toProbe.length === 0) return { broken, redirects };

  log.info("[crawler:probe]", `Probing ${toProbe.length} uncrawled internal URL(s)`);

  const results = await runWithConcurrency(toProbe, 8, async (href) => {
    const probe = await probeUrlWithRedirects(href);
    return { href, ...probe };
  });

  for (const r of results) {
    if (r.chain.length >= 2 && r.href !== r.finalUrl) {
      redirects.push({
        from: r.href,
        to: r.finalUrl,
        hops: r.chain.length - 1,
        chain: r.chain,
        scope: "internal",
      });
    }
    if (r.status === 0) {
      const idx = linkIndex.get(r.href);
      broken.push({
        href: r.href,
        status: null,
        scope: "internal",
        foundOn: idx?.foundOn ?? [],
        anchorTexts: idx?.anchorTexts ?? [],
        anchorText: idx?.anchorTexts?.join(", ") || "—",
        reason: "Network error or timeout",
      });
    } else if (r.status >= 400) {
      const idx = linkIndex.get(r.href);
      broken.push({
        href: r.href,
        status: r.status,
        scope: "internal",
        foundOn: idx?.foundOn ?? [],
        anchorTexts: idx?.anchorTexts ?? [],
        anchorText: idx?.anchorTexts?.join(", ") || "—",
        reason: `HTTP ${r.status}`,
      });
    }
  }

  return { broken, redirects };
}

function isBotHostileHost(host: string): boolean {
  const lower = host.toLowerCase();
  return BOT_HOSTILE_HOST_SUFFIXES.some(
    (suffix) => lower === suffix || lower.endsWith(`.${suffix}`),
  );
}

function safeHostname(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

interface LinkMetadata {
  foundOn: string[];
  anchorTexts: string[];
}

function buildLinkMetadataIndex(pages: CrawlPage[]): Map<string, LinkMetadata> {
  const map = new Map<string, LinkMetadata>();

  for (const page of pages) {
    const sourceUrl = page.finalUrl || page.url;

    if (page.linkDetails && page.linkDetails.length > 0) {
      for (const item of page.linkDetails) {
        const link = item.href;
        const anchor = item.anchor ? item.anchor.trim() : "";

        let existing = map.get(link);
        if (!existing) {
          existing = { foundOn: [], anchorTexts: [] };
          map.set(link, existing);
        }

        if (!existing.foundOn.includes(sourceUrl)) {
          existing.foundOn.push(sourceUrl);
        }
        if (anchor && !existing.anchorTexts.includes(anchor)) {
          existing.anchorTexts.push(anchor);
        }
      }
    } else {
      for (const link of [...page.internalLinks, ...page.externalLinks]) {
        let existing = map.get(link);
        if (!existing) {
          existing = { foundOn: [], anchorTexts: [] };
          map.set(link, existing);
        }
        if (!existing.foundOn.includes(sourceUrl)) {
          existing.foundOn.push(sourceUrl);
        }
      }
    }
  }
  return map;
}

/**
 * Probe a URL purely for status + full redirect chain, without downloading
 * the body. Uses HEAD with manual redirect; falls back to GET if the server
 * rejects HEAD (405 / 501). Returns null status on network failure.
 */
async function probeUrlWithRedirects(initialUrl: string): Promise<{
  finalUrl: string;
  status: number;
  chain: RedirectHop[];
}> {
  const chain: RedirectHop[] = [];
  let current = initialUrl;

  for (let hop = 0; hop <= MAX_REDIRECT_HOPS; hop++) {
    let res: Response;
    try {
      res = await rawProbeFetch(current, "HEAD");
      if (res.status === 405 || res.status === 501) {
        res = await rawProbeFetch(current, "GET");
      }
    } catch {
      // Network error — try GET as a last resort before giving up.
      try {
        res = await rawProbeFetch(current, "GET");
      } catch {
        return { finalUrl: current, status: 0, chain };
      }
    }

    const location = res.headers.get("location");
    chain.push({
      url: current,
      status: res.status,
      location: location ?? undefined,
    });

    if (res.status >= 300 && res.status < 400 && location) {
      try {
        current = new URL(location, current).toString();
      } catch {
        return { finalUrl: current, status: res.status, chain };
      }
      continue;
    }
    return { finalUrl: current, status: res.status, chain };
  }

  return { finalUrl: current, status: 0, chain };
}

async function rawProbeFetch(
  url: string,
  method: "HEAD" | "GET",
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    return await fetch(url, {
      method,
      redirect: "manual",
      signal: controller.signal,
      headers: { ...BROWSER_HEADERS, Accept: "*/*" },
    });
  } finally {
    clearTimeout(timer);
  }
}

function extractRedirects(pages: CrawlPage[]): RedirectEntry[] {
  const out: RedirectEntry[] = [];
  for (const page of pages) {
    if (page.redirectChain.length <= 1) continue;
    const to = page.finalUrl;
    const from = page.redirectChain[0].url;
    if (from === to) continue;
    out.push({
      from,
      to,
      hops: page.redirectChain.length - 1,
      chain: page.redirectChain,
      scope: "internal",
    });
  }
  return out;
}

function extractDuplicates(pages: CrawlPage[]): DuplicateGroup[] {
  const byHash = new Map<string, CrawlPage[]>();
  for (const page of pages) {
    if (!page.contentHash) continue;
    if (page.wordCount < 50) continue; // skip near-empty pages
    const list = byHash.get(page.contentHash);
    if (list) list.push(page);
    else byHash.set(page.contentHash, [page]);
  }
  const groups: DuplicateGroup[] = [];
  for (const [hash, list] of byHash) {
    if (list.length < 2) continue;
    groups.push({
      contentHash: hash,
      title: list[0].title || "(no title)",
      pages: list.map((p) => p.finalUrl || p.url),
    });
  }
  return groups;
}

function extractMissingMeta(pages: CrawlPage[]): MissingMetaIssue[] {
  const out: MissingMetaIssue[] = [];
  for (const page of pages) {
    if (page.status >= 400 || page.status === 0) continue;
    const missing: string[] = [];
    if (!page.title) missing.push("title");
    if (!page.description) missing.push("description");
    if (!page.canonical) missing.push("canonical");
    if (page.h1Count === 0) missing.push("h1");
    if (missing.length === 0) continue;
    out.push({
      url: page.finalUrl || page.url,
      missing,
    });
  }
  return out;
}

/* ---------- Utilities ---------- */

function detectSeedBlock(
  seed: CrawlPage | undefined,
): CrawlReport["seedBlocked"] {
  if (!seed) return undefined;
  if (seed.status === 0) {
    return {
      status: 0,
      reason:
        seed.error ??
        "The seed URL never responded — DNS, timeout, or TLS error.",
    };
  }
  if (seed.status === 403 || seed.status === 401) {
    return {
      status: seed.status,
      reason:
        "The site refused our request (likely bot protection — Cloudflare, Akamai, or similar). The crawler can't get past this without running a real browser.",
    };
  }
  if (seed.status === 429) {
    return {
      status: 429,
      reason:
        "The site rate-limited us. Wait a few minutes and retry, or crawl fewer pages at lower concurrency.",
    };
  }
  if (seed.status >= 400) {
    return {
      status: seed.status,
      reason: `Seed URL returned HTTP ${seed.status}. Check the URL and try again.`,
    };
  }
  if (
    seed.status >= 200 &&
    seed.status < 300 &&
    seed.internalLinks.length === 0 &&
    seed.wordCount < 30
  ) {
    return {
      status: seed.status,
      reason:
        "The seed loaded but had no links and almost no body text — it's likely a JavaScript-rendered SPA. This crawler only sees server-rendered HTML, so use the Analyzer or On-Page SEO tabs (which run a real browser) for SPAs.",
    };
  }
  return undefined;
}

function normalizeUrl(input: string): string {
  try {
    const u = new URL(input.startsWith("http") ? input : `https://${input}`);
    u.hash = "";
    if (u.pathname.length > 1 && u.pathname.endsWith("/")) {
      u.pathname = u.pathname.slice(0, -1);
    }
    return u.toString();
  } catch {
    return input;
  }
}

function stripHash(input: string): string {
  try {
    const u = new URL(input);
    u.hash = "";
    return u.toString();
  } catch {
    return input;
  }
}

/**
 * Discover every URL the site advertises through its sitemap(s). Handles
 * sitemap-index recursion (e.g. shopify, wordpress). Returns an empty array
 * if no sitemap is reachable.
 */
async function discoverSitemapUrls(origin: string): Promise<string[]> {
  const out = new Set<string>();
  const seen = new Set<string>();
  const queue: string[] = [
    `${origin}/sitemap.xml`,
    `${origin}/sitemap_index.xml`,
    `${origin}/sitemap-index.xml`,
  ];
  let depth = 0;
  const MAX_DEPTH = 5;
  const MAX_SITEMAP_URLS = 1000;

  while (queue.length > 0 && depth < MAX_DEPTH) {
    const next = queue.shift();
    if (!next || seen.has(next)) continue;
    seen.add(next);

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      let res: Response;
      try {
        res = await fetch(next, {
          signal: controller.signal,
          headers: { ...BROWSER_HEADERS, Accept: "application/xml,text/xml,*/*" },
        });
      } finally {
        clearTimeout(timer);
      }
      if (!res.ok) continue;
      const xml = await res.text();
      if (!xml.includes("<")) continue;

      const $ = cheerio.load(xml, { xmlMode: true });

      // Sitemap-index → push child sitemaps and recurse.
      const indexLocs = $("sitemapindex > sitemap > loc")
        .map((_, el) => $(el).text().trim())
        .get()
        .filter(Boolean);
      if (indexLocs.length > 0) {
        for (const loc of indexLocs) {
          if (!seen.has(loc)) queue.push(loc);
        }
        depth++;
        continue;
      }

      // Standard urlset → harvest every <loc>.
      $("urlset > url > loc").each((_, el) => {
        const u = $(el).text().trim();
        if (u && out.size < MAX_SITEMAP_URLS) out.add(u);
      });
    } catch {
      /* sitemap missing or malformed — skip silently */
    }
  }
  return Array.from(out);
}

function looksNonHtml(url: string): boolean {
  try {
    const u = new URL(url);
    const ext = u.pathname.split(".").pop()?.toLowerCase();
    if (!ext) return false;
    if (ext === u.pathname.replace(/^\//, "")) return false;
    return NON_HTML_EXT.has(ext);
  } catch {
    return false;
  }
}

async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const idx = cursor++;
      if (idx >= items.length) return;
      out[idx] = await worker(items[idx], idx);
    }
  });
  await Promise.all(runners);
  return out;
}
