import * as cheerio from "cheerio";
import { fetchWithTimeout, normalizeUrl, resolveUrl } from "@/lib/fetcher";
import { log } from "@/lib/logger";
import type {
  AnchorBreakdown,
  BacklinkAnalysis,
  BacklinkHit,
  BacklinkSourceResult,
  BacklinkSummary,
  ReferringDomain,
} from "@/types/backlinks";

const MAX_CANDIDATES = 50;
const MAX_PARALLEL = 6;
const FETCH_TIMEOUT_MS = 12_000;

interface AnalyzeOptions {
  targetUrl: string;
  candidates: string[];
  matchMode?: "strict" | "loose";
}

/**
 * Runs a backlink verification pass over the supplied candidate source URLs.
 *
 * For each candidate we:
 *   - GET the page (with our shared `fetchWithTimeout`),
 *   - parse the HTML with cheerio,
 *   - collect every <a> whose resolved href matches the target host (loose)
 *     or the exact target URL (strict),
 *   - extract anchor text, link type, and rel tokens.
 *
 * Results are then aggregated into referring-domain, anchor, and dofollow
 * breakdowns so the UI can render them without further work.
 */
export async function analyzeBacklinks(
  options: AnalyzeOptions,
): Promise<BacklinkAnalysis> {
  const matchMode = options.matchMode ?? "loose";
  const target = parseTarget(options.targetUrl);

  const cleanedCandidates = dedupeCandidates(options.candidates).slice(
    0,
    MAX_CANDIDATES,
  );

  log.start("[backlinks:analyze]", "Verifying candidates", {
    target: target.normalized,
    matchMode,
    candidates: cleanedCandidates.length,
  });

  const results = await runWithConcurrency(
    cleanedCandidates,
    MAX_PARALLEL,
    (candidate) => verifyCandidate(candidate, target, matchMode),
  );

  const summary = buildSummary(results);
  const referringDomains = aggregateReferringDomains(results);
  const anchorBreakdown = aggregateAnchors(results, target.host);

  log.ok("[backlinks:analyze]", "Done", {
    verified: summary.verified,
    missing: summary.missing,
    errors: summary.errors,
    refDomains: summary.uniqueReferringDomains,
  });

  return {
    targetUrl: target.normalized,
    targetDomain: target.host,
    analyzedAt: new Date().toISOString(),
    matchMode,
    summary,
    referringDomains,
    anchorBreakdown,
    results,
  };
}

interface ParsedTarget {
  normalized: string;
  host: string;
  /** The bare host without leading "www." for fuzzy comparisons. */
  rootHost: string;
}

function parseTarget(raw: string): ParsedTarget {
  const withScheme = raw.startsWith("http") ? raw : `https://${raw}`;
  const parsed = new URL(withScheme);
  const host = parsed.hostname.toLowerCase();
  return {
    normalized: normalizeUrl(withScheme),
    host,
    rootHost: host.replace(/^www\./, ""),
  };
}

function dedupeCandidates(input: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const withScheme = trimmed.startsWith("http")
      ? trimmed
      : `https://${trimmed}`;
    let normal: string;
    try {
      normal = normalizeUrl(withScheme);
    } catch {
      continue;
    }
    if (seen.has(normal)) continue;
    seen.add(normal);
    out.push(normal);
  }
  return out;
}

async function verifyCandidate(
  sourceUrl: string,
  target: ParsedTarget,
  matchMode: "strict" | "loose",
): Promise<BacklinkSourceResult> {
  const started = Date.now();
  let domain = "";
  try {
    domain = new URL(sourceUrl).hostname.toLowerCase();
  } catch {
    return {
      status: "error",
      sourceUrl,
      sourceDomain: "",
      httpStatus: null,
      pageTitle: null,
      hits: [],
      error: "Invalid URL",
      durationMs: 0,
    };
  }

  try {
    const res = await fetchWithTimeout(sourceUrl, {
      timeoutMs: FETCH_TIMEOUT_MS,
    });

    if (!res.ok) {
      log.warn("[backlinks:fetch]", `Non-2xx for ${sourceUrl}`, {
        status: res.status,
      });
      return {
        status: "error",
        sourceUrl,
        sourceDomain: domain,
        httpStatus: res.status,
        pageTitle: null,
        hits: [],
        error: `${res.status} ${res.statusText}`,
        durationMs: Date.now() - started,
      };
    }

    const html = await res.text();
    const { hits, title } = extractHits(html, res.url, target, matchMode);

    return {
      status: hits.length > 0 ? "verified" : "missing",
      sourceUrl,
      sourceDomain: domain,
      httpStatus: res.status,
      pageTitle: title,
      hits,
      durationMs: Date.now() - started,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch";
    log.fail("[backlinks:fetch]", `Failed ${sourceUrl}`, err);
    return {
      status: "error",
      sourceUrl,
      sourceDomain: domain,
      httpStatus: null,
      pageTitle: null,
      hits: [],
      error: message,
      durationMs: Date.now() - started,
    };
  }
}

function extractHits(
  html: string,
  baseUrl: string,
  target: ParsedTarget,
  matchMode: "strict" | "loose",
): { hits: BacklinkHit[]; title: string | null } {
  const $ = cheerio.load(html);
  const title = $("title").first().text().trim() || null;
  const hits: BacklinkHit[] = [];

  $("a[href]").each((_, el) => {
    const $a = $(el);
    const href = $a.attr("href");
    if (!href || href.startsWith("#") || href.startsWith("javascript:")) {
      return;
    }

    let resolved: string;
    try {
      resolved = resolveUrl(baseUrl, href);
    } catch {
      return;
    }

    let host: string;
    try {
      host = new URL(resolved).hostname.toLowerCase();
    } catch {
      return;
    }

    const sameHost =
      host === target.host || host.replace(/^www\./, "") === target.rootHost;

    if (!sameHost) return;

    const exactMatch = normalizeForMatch(resolved) === target.normalized;
    if (matchMode === "strict" && !exactMatch) return;

    const relAttr = ($a.attr("rel") ?? "").toLowerCase().trim();
    const relTokens = relAttr ? relAttr.split(/\s+/).filter(Boolean) : [];
    const rawText = $a.text().replace(/\s+/g, " ").trim();
    const hasImg = $a.find("img").length > 0;

    hits.push({
      href: resolved,
      anchorText: rawText || (hasImg ? "[image]" : ""),
      linkType: hasImg ? "image" : rawText.length > 0 ? "text" : "button",
      rel: relTokens,
      isDofollow: !relTokens.includes("nofollow"),
      isSponsored: relTokens.includes("sponsored"),
      isUgc: relTokens.includes("ugc"),
      exactMatch,
    });
  });

  return { hits, title };
}

function normalizeForMatch(url: string): string {
  try {
    return normalizeUrl(url);
  } catch {
    return url;
  }
}

async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  async function pump() {
    while (cursor < items.length) {
      const idx = cursor++;
      results[idx] = await worker(items[idx]);
    }
  }

  const runners = Array.from(
    { length: Math.min(limit, Math.max(items.length, 1)) },
    () => pump(),
  );
  await Promise.all(runners);
  return results;
}

function buildSummary(results: BacklinkSourceResult[]): BacklinkSummary {
  let verified = 0;
  let missing = 0;
  let errors = 0;
  let totalHits = 0;
  let dofollow = 0;
  let nofollow = 0;
  const referringDomains = new Set<string>();

  for (const r of results) {
    if (r.status === "verified") verified++;
    else if (r.status === "missing") missing++;
    else errors++;

    totalHits += r.hits.length;
    if (r.status === "verified" && r.sourceDomain) {
      referringDomains.add(r.sourceDomain.replace(/^www\./, ""));
    }
    for (const h of r.hits) {
      if (h.isDofollow) dofollow++;
      else nofollow++;
    }
  }

  return {
    candidatesChecked: results.length,
    verified,
    missing,
    errors,
    totalHits,
    dofollow,
    nofollow,
    uniqueReferringDomains: referringDomains.size,
    avgHitsPerPage:
      verified > 0 ? Number((totalHits / verified).toFixed(2)) : 0,
  };
}

function aggregateReferringDomains(
  results: BacklinkSourceResult[],
): ReferringDomain[] {
  const map = new Map<string, ReferringDomain>();

  for (const r of results) {
    if (r.status !== "verified" || !r.sourceDomain) continue;
    const domain = r.sourceDomain.replace(/^www\./, "");
    const existing = map.get(domain);

    const dofollow = r.hits.filter((h) => h.isDofollow).length;
    const nofollow = r.hits.length - dofollow;

    if (existing) {
      existing.pageCount += 1;
      existing.hitCount += r.hits.length;
      existing.dofollowCount += dofollow;
      existing.nofollowCount += nofollow;
    } else {
      map.set(domain, {
        domain,
        pageCount: 1,
        hitCount: r.hits.length,
        sampleUrl: r.sourceUrl,
        dofollowCount: dofollow,
        nofollowCount: nofollow,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => b.hitCount - a.hitCount);
}

function aggregateAnchors(
  results: BacklinkSourceResult[],
  targetHost: string,
): AnchorBreakdown[] {
  const counts = new Map<string, number>();
  const rootHost = targetHost.replace(/^www\./, "");

  for (const r of results) {
    for (const h of r.hits) {
      const key = (h.anchorText || "[empty]").toLowerCase();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .map(([anchor, count]): AnchorBreakdown => ({
      anchor,
      count,
      category: categorizeAnchor(anchor, rootHost),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 25);
}

function categorizeAnchor(
  anchor: string,
  rootHost: string,
): AnchorBreakdown["category"] {
  if (anchor === "[image]") return "image";
  if (anchor === "[empty]") return "other";

  const trimmed = anchor.trim().toLowerCase();
  const generics = new Set([
    "click here",
    "here",
    "this",
    "this link",
    "read more",
    "learn more",
    "website",
    "site",
    "link",
  ]);

  if (generics.has(trimmed)) return "generic";

  if (
    trimmed.includes(rootHost) ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://")
  ) {
    return "naked";
  }

  const brandStem = rootHost.split(".")[0];
  if (brandStem && trimmed.includes(brandStem)) return "branded";

  return "exact";
}
