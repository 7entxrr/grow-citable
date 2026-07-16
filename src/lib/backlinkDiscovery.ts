import { fetchWithTimeout } from "@/lib/fetcher";
import { serpThrottleMs, sleep, searchWeb } from "@/lib/webSearch";
import { SerpBlockedError } from "@/lib/googleSerp";
import { log } from "@/lib/logger";
import {
  isCseConfigured,
  resolveSearchProvider,
  type SearchProvider,
} from "@/lib/searchProvider";

/**
 * Backlink discovery — find pages that mention your domain.
 *
 * Providers:
 *   puppeteer (default) — loads Google search in headless Chrome, no API key
 *   cse                 — Google Custom Search JSON API (optional)
 */

export const CSE_ENDPOINT = "https://www.googleapis.com/customsearch/v1";
const RESULTS_PER_PAGE = 10;
const MAX_RESULTS_HARD_CAP = 100;

export interface DiscoveryOptions {
  targetUrl: string;
  maxResults?: number;
  provider?: SearchProvider;
  apiKey?: string;
  cx?: string;
}

export interface DiscoveryResult {
  candidates: string[];
  totalEstimated: number | null;
  queriesUsed: number;
  query: string;
  truncated: boolean;
  provider?: SearchProvider;
}

export class DiscoveryConfigError extends Error {
  code = "CSE_NOT_CONFIGURED" as const;
}

export function isDiscoveryConfigured(): boolean {
  return true;
}

export function getDiscoveryProvider(): SearchProvider {
  return resolveSearchProvider();
}

export async function discoverBacklinkCandidates(
  options: DiscoveryOptions,
): Promise<DiscoveryResult> {
  const provider = options.provider ?? resolveSearchProvider();

  if (provider === "cse") {
    return discoverViaCse(options);
  }
  return discoverViaPuppeteer(options);
}

async function discoverViaPuppeteer(
  options: DiscoveryOptions,
): Promise<DiscoveryResult> {
  const target = parseTargetForQuery(options.targetUrl);
  const max = clampMax(options.maxResults);
  const query = buildQuery(target.rootHost);
  const pages = Math.ceil(max / RESULTS_PER_PAGE);

  log.start("[backlinks:discover]", "SERP discovery (Puppeteer)", {
    target: target.rootHost,
    query,
    pages,
    max,
  });

  const seen = new Set<string>();
  const candidates: string[] = [];
  let queriesUsed = 0;
  let truncated = false;

  try {
    for (let i = 0; i < pages; i++) {
      const start = i * RESULTS_PER_PAGE + 1;
      if (i > 0) await sleep(serpThrottleMs());

      queriesUsed++;
      const items = await searchWeb({ query, start, num: RESULTS_PER_PAGE });

      for (const item of items) {
        let host: string;
        try {
          host = new URL(item.url).hostname.toLowerCase();
        } catch {
          continue;
        }
        if (
          host === target.host ||
          host.replace(/^www\./, "") === target.rootHost
        ) {
          continue;
        }
        if (seen.has(item.url)) continue;
        seen.add(item.url);
        candidates.push(item.url);
        if (candidates.length >= max) break;
      }

      if (candidates.length >= max) {
        truncated = items.length >= RESULTS_PER_PAGE;
        break;
      }
      if (items.length < RESULTS_PER_PAGE) break;
    }

    log.ok("[backlinks:discover]", "Puppeteer discovery complete", {
      found: candidates.length,
      queriesUsed,
    });

    return {
      candidates,
      totalEstimated: null,
      queriesUsed,
      query,
      truncated,
      provider: "puppeteer",
    };
  } catch (err) {
    if (err instanceof SerpBlockedError) throw err;
    log.fail("[backlinks:discover]", "Puppeteer discovery failed", err);
    throw err;
  }
}

async function discoverViaCse(
  options: DiscoveryOptions,
): Promise<DiscoveryResult> {
  const apiKey = options.apiKey ?? process.env.GOOGLE_CSE_API_KEY;
  const cx = options.cx ?? process.env.GOOGLE_CSE_CX;

  if (!apiKey || !cx) {
    throw new DiscoveryConfigError(
      "SEARCH_PROVIDER=cse but GOOGLE_CSE_API_KEY / GOOGLE_CSE_CX are missing.",
    );
  }

  const target = parseTargetForQuery(options.targetUrl);
  const max = clampMax(options.maxResults);
  const pages = Math.ceil(max / RESULTS_PER_PAGE);
  const query = buildQuery(target.rootHost);

  log.start("[backlinks:discover]", "CSE discovery", {
    target: target.rootHost,
    query,
    pages,
    max,
  });

  const seen = new Set<string>();
  const candidates: string[] = [];
  let totalEstimated: number | null = null;
  let queriesUsed = 0;
  let truncated = false;

  for (let i = 0; i < pages; i++) {
    const start = i * RESULTS_PER_PAGE + 1;
    if (start > 91) break;

    queriesUsed++;
    const url = new URL(CSE_ENDPOINT);
    url.searchParams.set("key", apiKey);
    url.searchParams.set("cx", cx);
    url.searchParams.set("q", query);
    url.searchParams.set("num", String(RESULTS_PER_PAGE));
    url.searchParams.set("start", String(start));

    const res = await fetchWithTimeout(url.toString(), {
      timeoutMs: 15_000,
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      const friendly = friendlyCseError(res.status, body);
      log.fail("[backlinks:discover]", `CSE ${res.status}`, {
        body: body.slice(0, 500),
      });
      throw new Error(friendly);
    }

    const data = (await res.json()) as CseResponse;

    if (totalEstimated === null) {
      const total = data.searchInformation?.totalResults;
      totalEstimated = total ? Number(total) : null;
    }

    const items = data.items ?? [];
    for (const item of items) {
      if (!item.link) continue;
      let host: string;
      try {
        host = new URL(item.link).hostname.toLowerCase();
      } catch {
        continue;
      }
      if (
        host === target.host ||
        host.replace(/^www\./, "") === target.rootHost
      ) {
        continue;
      }
      if (seen.has(item.link)) continue;
      seen.add(item.link);
      candidates.push(item.link);
      if (candidates.length >= max) break;
    }

    if (candidates.length >= max) {
      truncated = (data.queries?.nextPage?.length ?? 0) > 0;
      break;
    }
    if (items.length < RESULTS_PER_PAGE) break;
  }

  log.ok("[backlinks:discover]", "CSE discovery complete", {
    found: candidates.length,
    queriesUsed,
    totalEstimated,
  });

  return {
    candidates,
    totalEstimated,
    queriesUsed,
    query,
    truncated,
    provider: "cse",
  };
}

interface CseResponse {
  items?: { link?: string }[];
  searchInformation?: { totalResults?: string };
  queries?: { nextPage?: unknown[] };
}

interface ParsedTarget {
  host: string;
  rootHost: string;
}

function parseTargetForQuery(raw: string): ParsedTarget {
  const withScheme = raw.startsWith("http") ? raw : `https://${raw}`;
  const parsed = new URL(withScheme);
  const host = parsed.hostname.toLowerCase();
  return {
    host,
    rootHost: host.replace(/^www\./, ""),
  };
}

function buildQuery(rootHost: string): string {
  return `"${rootHost}" -site:${rootHost} -site:www.${rootHost}`;
}

function clampMax(value: number | undefined): number {
  if (!value || Number.isNaN(value)) return 50;
  return Math.max(10, Math.min(MAX_RESULTS_HARD_CAP, Math.floor(value)));
}

function friendlyCseError(status: number, body: string): string {
  const lower = body.toLowerCase();
  if (status === 403) {
    if (lower.includes("daily limit")) {
      return "Google Custom Search daily quota exceeded (100/day on free tier).";
    }
    return "Custom Search returned 403.";
  }
  if (status === 429) return "Google Custom Search is rate-limiting.";
  return `Custom Search failed with HTTP ${status}.`;
}
