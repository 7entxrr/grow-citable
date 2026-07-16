/**
 * Types for the Rank Tracker feature.
 *
 * Flow:
 *   1. User supplies a target domain (their site) and a list of keywords.
 *   2. The backend queries Google Custom Search for each keyword, paginating
 *      until either (a) a result whose host matches the target domain
 *      appears, or (b) we exhaust the configured depth (max 100 results).
 *   3. We return one `RankResult` per keyword — the position (1..depth or
 *      null when not found), the specific ranking page URL, its title and
 *      snippet, plus per-call quota accounting.
 */

export type RankStatus = "ranking" | "not_found" | "error";

export interface RankResult {
  keyword: string;
  status: RankStatus;
  /** Position 1..depth, or null when the domain wasn't seen. */
  position: number | null;
  /** Exact URL on the target domain that ranks at `position`. */
  rankingUrl: string | null;
  rankingTitle: string | null;
  rankingSnippet: string | null;
  /** Number of result pages we actually scanned for this keyword. */
  pagesScanned: number;
  /** Number of Custom Search calls this keyword consumed. */
  queriesUsed: number;
  /** Total Google-estimated SERP volume (informational only). */
  totalEstimated: number | null;
  /** Populated only when status === "error". */
  error?: string;
  /** ms taken to resolve this keyword. */
  durationMs: number;
}

export interface RankSummary {
  totalKeywords: number;
  ranking: number;
  notFound: number;
  errors: number;
  top3: number;
  top10: number;
  top30: number;
  /** Average position across keywords that are ranking (rounded to 0.1). */
  averagePosition: number | null;
  bestPosition: number | null;
  totalQueriesUsed: number;
}

export interface RankCheckResponse {
  targetDomain: string;
  /** ISO timestamp for when the check ran. */
  checkedAt: string;
  /** Max SERP position we searched up to (10, 30, 50, or 100). */
  depth: number;
  /** Optional locale hint passed through to search. */
  geo?: string;
  /** How results were fetched: headless browser (default) or Custom Search API. */
  provider?: "puppeteer" | "cse" | "serper";
  summary: RankSummary;
  results: RankResult[];
}
