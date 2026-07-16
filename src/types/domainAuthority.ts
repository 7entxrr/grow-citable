/**
 * Types for the "Domain Authority" tab.
 *
 * IMPORTANT: This is **our own free estimate**, not the real Moz DA metric
 * (which requires a paid Moz API subscription). We label it "Authority
 * Score" everywhere in the UI to avoid confusion with the trademarked DA.
 *
 * The score (0–100) is computed from public, free signals:
 *   1. Domain age          (Wayback Machine – first snapshot)
 *   2. Sitemap depth       (parse /sitemap.xml + sitemap index)
 *   3. Trust signals       (HTTPS, robots.txt, sitemap, security headers)
 *   4. Wayback activity    (CDX showNumPages → archive snapshot count)
 */

export type SignalStatus = "good" | "ok" | "weak" | "missing" | "unknown";

export interface AuthoritySignal {
  id: string;
  label: string;
  status: SignalStatus;
  value: string;
  detail: string;
  /** Points contributed by this signal toward the 0–100 score. */
  points: number;
  /** Maximum points this signal could have contributed. */
  maxPoints: number;
}

export interface AuthorityCategory {
  id: string;
  title: string;
  description: string;
  earned: number;
  max: number;
  signals: AuthoritySignal[];
}

export interface DomainAuthorityReport {
  domain: string;
  inputUrl: string;
  analyzedAt: string;

  /** 0–100 estimated authority score. */
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";

  /** Free-form one-liner summary derived from the score bucket. */
  verdict: string;

  categories: AuthorityCategory[];

  /** Raw values exposed for the UI to render rich panels. */
  raw: {
    firstSnapshotYear: number | null;
    firstSnapshotIso: string | null;
    domainAgeYears: number | null;
    waybackSnapshotsApprox: number | null;
    sitemapUrlCount: number | null;
    sitemapIndexed: boolean;
    sitemapsScanned: string[];
    robotsTxtFound: boolean;
    isHttps: boolean;
    hasXFrameOptions: boolean;
    hasCsp: boolean;
    hasStrictTransport: boolean;
  };
}
