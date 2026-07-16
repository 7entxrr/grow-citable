import { fetchWithTimeout } from "@/lib/fetcher";
import {
  hostMatchesTarget,
  serpThrottleMs,
  sleep,
  searchWeb,
} from "@/lib/webSearch";
import { log } from "@/lib/logger";
import {
  CSE_ENDPOINT,
  DiscoveryConfigError,
} from "@/lib/backlinkDiscovery";
import {
  isCseConfigured,
  resolveSearchProvider,
  type SearchProvider,
} from "@/lib/searchProvider";
import type {
  RankCheckResponse,
  RankResult,
  RankSummary,
} from "@/types/rank";

const RESULTS_PER_PAGE = 10;
const CSE_MAX_PARALLEL = 3;
const PUPPETEER_MAX_PARALLEL = 1; // one SERP at a time — avoids CAPTCHA
const ALLOWED_DEPTHS = [10, 30, 50, 100] as const;

export type RankDepth = (typeof ALLOWED_DEPTHS)[number];

export interface RankCheckOptions {
  targetDomain: string;
  keywords: string[];
  depth?: RankDepth;
  geo?: string;
  hl?: string;
  provider?: SearchProvider;
  apiKey?: string;
  cx?: string;
}

export function isRankCheckerConfigured(): boolean {
  return true;
}

export function getRankProvider(): SearchProvider {
  return resolveSearchProvider();
}

export async function checkKeywordRanks(
  options: RankCheckOptions,
): Promise<RankCheckResponse> {
  const provider = options.provider ?? resolveSearchProvider();
  const target = parseDomain(options.targetDomain);
  const depth = normalizeDepth(options.depth);
  const keywords = dedupeKeywords(options.keywords);

  log.start("[rank:check]", "Checking SERP positions", {
    target: target.root,
    keywords: keywords.length,
    depth,
    provider,
    geo: options.geo,
  });

  const parallel =
    provider === "puppeteer" ? PUPPETEER_MAX_PARALLEL : CSE_MAX_PARALLEL;

  const results = await runWithConcurrency(keywords, parallel, (kw, index) =>
    provider === "puppeteer"
      ? checkOneKeywordPuppeteer({
          keyword: kw,
          target,
          depth,
          geo: options.geo,
          hl: options.hl,
          throttleBefore: index > 0,
        })
      : checkOneKeywordCse({
          keyword: kw,
          target,
          depth,
          apiKey: options.apiKey ?? process.env.GOOGLE_CSE_API_KEY!,
          cx: options.cx ?? process.env.GOOGLE_CSE_CX!,
          geo: options.geo,
          hl: options.hl,
        }),
  );

  const summary = buildSummary(results);

  log.ok("[rank:check]", "Done", {
    provider,
    ranking: summary.ranking,
    notFound: summary.notFound,
    errors: summary.errors,
    queries: summary.totalQueriesUsed,
  });

  return {
    targetDomain: target.root,
    checkedAt: new Date().toISOString(),
    depth,
    geo: options.geo,
    summary,
    results,
    provider,
  };
}

interface ParsedDomain {
  host: string;
  root: string;
}

function parseDomain(raw: string): ParsedDomain {
  const trimmed = raw.trim();
  const withScheme = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
  const host = new URL(withScheme).hostname.toLowerCase();
  return { host, root: host.replace(/^www\./, "") };
}

function normalizeDepth(value: RankDepth | undefined): RankDepth {
  if (value && (ALLOWED_DEPTHS as readonly number[]).includes(value)) {
    return value;
  }
  return 30;
}

function dedupeKeywords(input: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of input) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

interface PuppeteerCheckArgs {
  keyword: string;
  target: ParsedDomain;
  depth: number;
  geo?: string;
  hl?: string;
  throttleBefore: boolean;
}

async function checkOneKeywordPuppeteer(
  args: PuppeteerCheckArgs,
): Promise<RankResult> {
  const started = Date.now();
  let pagesScanned = 0;
  let queriesUsed = 0;

  try {
    if (args.throttleBefore) {
      await sleep(serpThrottleMs());
    }

    const pages = Math.ceil(args.depth / RESULTS_PER_PAGE);

    for (let page = 0; page < pages; page++) {
      const start = page * RESULTS_PER_PAGE + 1;
      queriesUsed++;
      pagesScanned++;

      const items = await searchWeb({
        query: args.keyword,
        start,
        num: RESULTS_PER_PAGE,
        geo: args.geo,
        hl: args.hl,
      });

      for (const item of items) {
        if (item.position > args.depth) continue;
        if (hostMatchesTarget(item.url, args.target.host, args.target.root)) {
          return {
            keyword: args.keyword,
            status: "ranking",
            position: item.position,
            rankingUrl: item.url,
            rankingTitle: item.title,
            rankingSnippet: item.snippet || null,
            pagesScanned,
            queriesUsed,
            totalEstimated: null,
            durationMs: Date.now() - started,
          };
        }
      }

      if (items.length < RESULTS_PER_PAGE) break;
      if (page < pages - 1) await sleep(serpThrottleMs());
    }

    return {
      keyword: args.keyword,
      status: "not_found",
      position: null,
      rankingUrl: null,
      rankingTitle: null,
      rankingSnippet: null,
      pagesScanned,
      queriesUsed,
      totalEstimated: null,
      durationMs: Date.now() - started,
    };
  } catch (err) {
    log.fail("[rank:check]", `SERP "${args.keyword}"`, err);
    return {
      keyword: args.keyword,
      status: "error",
      position: null,
      rankingUrl: null,
      rankingTitle: null,
      rankingSnippet: null,
      pagesScanned,
      queriesUsed,
      totalEstimated: null,
      error: err instanceof Error ? err.message : "SERP fetch failed",
      durationMs: Date.now() - started,
    };
  }
}

interface CseCheckArgs {
  keyword: string;
  target: ParsedDomain;
  depth: number;
  apiKey: string;
  cx: string;
  geo?: string;
  hl?: string;
}

async function checkOneKeywordCse(args: CseCheckArgs): Promise<RankResult> {
  if (!isCseConfigured()) {
    throw new DiscoveryConfigError(
      "SEARCH_PROVIDER=cse but GOOGLE_CSE_API_KEY / GOOGLE_CSE_CX are missing.",
    );
  }

  const started = Date.now();
  const pages = Math.ceil(args.depth / RESULTS_PER_PAGE);
  let queriesUsed = 0;
  let pagesScanned = 0;
  let totalEstimated: number | null = null;

  try {
    for (let page = 0; page < pages; page++) {
      const start = page * RESULTS_PER_PAGE + 1;
      if (start > 91) break;
      queriesUsed++;
      pagesScanned++;

      const url = new URL(CSE_ENDPOINT);
      url.searchParams.set("key", args.apiKey);
      url.searchParams.set("cx", args.cx);
      url.searchParams.set("q", args.keyword);
      url.searchParams.set("num", String(RESULTS_PER_PAGE));
      url.searchParams.set("start", String(start));
      if (args.geo) url.searchParams.set("gl", args.geo);
      if (args.hl) url.searchParams.set("hl", args.hl);

      const res = await fetchWithTimeout(url.toString(), {
        timeoutMs: 15_000,
        headers: { Accept: "application/json" },
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        log.fail("[rank:check]", `CSE ${res.status} for "${args.keyword}"`, {
          status: res.status,
          body: body.slice(0, 800),
        });
        return {
          keyword: args.keyword,
          status: "error",
          position: null,
          rankingUrl: null,
          rankingTitle: null,
          rankingSnippet: null,
          pagesScanned,
          queriesUsed,
          totalEstimated,
          error: friendlyCseError(res.status, body),
          durationMs: Date.now() - started,
        };
      }

      const data = (await res.json()) as CseResponse;
      if (totalEstimated === null) {
        const total = data.searchInformation?.totalResults;
        totalEstimated = total ? Number(total) : null;
      }

      const items = data.items ?? [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item.link) continue;
        if (hostMatchesTarget(item.link, args.target.host, args.target.root)) {
          const position = start + i;
          if (position > args.depth) continue;
          return {
            keyword: args.keyword,
            status: "ranking",
            position,
            rankingUrl: item.link,
            rankingTitle: item.title ?? null,
            rankingSnippet: item.snippet ?? null,
            pagesScanned,
            queriesUsed,
            totalEstimated,
            durationMs: Date.now() - started,
          };
        }
      }
      if (items.length < RESULTS_PER_PAGE) break;
    }

    return {
      keyword: args.keyword,
      status: "not_found",
      position: null,
      rankingUrl: null,
      rankingTitle: null,
      rankingSnippet: null,
      pagesScanned,
      queriesUsed,
      totalEstimated,
      durationMs: Date.now() - started,
    };
  } catch (err) {
    log.fail("[rank:check]", `CSE "${args.keyword}"`, err);
    return {
      keyword: args.keyword,
      status: "error",
      position: null,
      rankingUrl: null,
      rankingTitle: null,
      rankingSnippet: null,
      pagesScanned,
      queriesUsed,
      totalEstimated,
      error: err instanceof Error ? err.message : "Unknown error",
      durationMs: Date.now() - started,
    };
  }
}

function buildSummary(results: RankResult[]): RankSummary {
  let ranking = 0;
  let notFound = 0;
  let errors = 0;
  let top3 = 0;
  let top10 = 0;
  let top30 = 0;
  let positionSum = 0;
  let positionCount = 0;
  let best: number | null = null;
  let totalQueriesUsed = 0;

  for (const r of results) {
    totalQueriesUsed += r.queriesUsed;
    if (r.status === "ranking" && r.position !== null) {
      ranking++;
      positionSum += r.position;
      positionCount++;
      if (r.position <= 3) top3++;
      if (r.position <= 10) top10++;
      if (r.position <= 30) top30++;
      if (best === null || r.position < best) best = r.position;
    } else if (r.status === "not_found") {
      notFound++;
    } else {
      errors++;
    }
  }

  return {
    totalKeywords: results.length,
    ranking,
    notFound,
    errors,
    top3,
    top10,
    top30,
    averagePosition:
      positionCount > 0
        ? Number((positionSum / positionCount).toFixed(1))
        : null,
    bestPosition: best,
    totalQueriesUsed,
  };
}

interface CseResponse {
  items?: { link?: string; title?: string; snippet?: string }[];
  searchInformation?: { totalResults?: string };
}

function friendlyCseError(status: number, body: string): string {
  const lower = body.toLowerCase();
  const reason = extractCseReason(body);

  if (status === 403) {
    if (lower.includes("daily limit") || lower.includes("dailylimitexceeded")) {
      return "Custom Search daily quota exceeded (100/day on free tier). Wait until tomorrow or enable billing.";
    }
    if (lower.includes("ratelimitexceeded") || lower.includes("userratelimit")) {
      return "Custom Search rate limit hit. Slow down and retry.";
    }
    if (lower.includes("api key not valid") || lower.includes("api_key_invalid")) {
      return "GOOGLE_CSE_API_KEY is invalid. Recreate it in Google Cloud Console → Credentials.";
    }
    if (lower.includes("api key referer") || lower.includes("api key not authorized") || lower.includes("requests from referer") || lower.includes("ip address restrictions")) {
      return "GOOGLE_CSE_API_KEY has restrictions blocking this request. Open it in Cloud Console → Credentials and remove HTTP referrer/IP restrictions (or set 'None' for testing).";
    }
    if (lower.includes("has not been used") || lower.includes("service_disabled") || lower.includes("accessnotconfigured")) {
      return "Custom Search API is not enabled. Enable it: https://console.cloud.google.com/apis/library/customsearch.googleapis.com";
    }
    if (lower.includes("permission_denied") || lower.includes("permissiondenied")) {
      return `Custom Search 403 PERMISSION_DENIED${reason ? `: ${reason}` : ""}. Check API is enabled, billing project, and key restrictions.`;
    }
    return `Custom Search 403${reason ? `: ${reason}` : " — check API is enabled and key restrictions in Cloud Console."}`;
  }
  if (status === 400) {
    if (lower.includes("invalid value") && lower.includes("cx")) {
      return "GOOGLE_CSE_CX is invalid. Copy the Search Engine ID from https://programmablesearchengine.google.com/";
    }
    return `Custom Search 400${reason ? `: ${reason}` : " — check GOOGLE_CSE_CX."}`;
  }
  if (status === 429) return "Custom Search is rate-limiting. Slow down and retry.";
  return `Custom Search failed with HTTP ${status}${reason ? `: ${reason}` : ""}.`;
}

function extractCseReason(body: string): string | null {
  try {
    const parsed = JSON.parse(body) as {
      error?: { message?: string; errors?: { reason?: string; message?: string }[] };
    };
    if (parsed.error?.errors?.[0]) {
      const e = parsed.error.errors[0];
      return [e.reason, e.message].filter(Boolean).join(" — ") || null;
    }
    return parsed.error?.message ?? null;
  } catch {
    return null;
  }
}

async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  async function pump() {
    while (cursor < items.length) {
      const idx = cursor++;
      results[idx] = await worker(items[idx], idx);
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(limit, Math.max(items.length, 1)) },
      () => pump(),
    ),
  );
  return results;
}
