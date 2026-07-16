/**
 * Types for the Backlink Analysis feature.
 *
 * The flow:
 *  1. The user supplies a target URL (their own page) and a list of
 *     candidate source URLs (pages they believe link back to them).
 *  2. The backend fetches each candidate, parses the HTML, and finds every
 *     anchor that resolves to the target's host (or full URL when strict).
 *  3. We return a `BacklinkAnalysis` summarising verified vs missing
 *     candidates, the unique referring domains, anchor-text distribution,
 *     and dofollow / nofollow split.
 *
 * No paid SEO API is used — this is a self-hostable verifier for backlinks
 * the user already knows about.
 */

export type BacklinkLinkType = "text" | "image" | "button";

export interface BacklinkHit {
  /** Resolved absolute href of the matching <a> on the source page. */
  href: string;
  anchorText: string;
  linkType: BacklinkLinkType;
  /** rel tokens on the anchor, e.g. ["nofollow", "sponsored"]. */
  rel: string[];
  isDofollow: boolean;
  isSponsored: boolean;
  isUgc: boolean;
  /** Whether the resolved href matches the target URL exactly. */
  exactMatch: boolean;
}

export type BacklinkSourceStatus = "verified" | "missing" | "error";

export interface BacklinkSourceResult {
  status: BacklinkSourceStatus;
  sourceUrl: string;
  sourceDomain: string;
  /** HTTP status code we got from the source page. */
  httpStatus: number | null;
  /** <title> of the source page when we could fetch it. */
  pageTitle: string | null;
  /** All matching anchors on this page that point at the target. */
  hits: BacklinkHit[];
  /** Populated when status === "error". */
  error?: string;
  /** ms it took to fetch + parse this page. */
  durationMs: number;
}

export interface ReferringDomain {
  domain: string;
  /** Number of source URLs from this domain that linked to the target. */
  pageCount: number;
  /** Total individual <a> hits across those pages. */
  hitCount: number;
  /** One example source URL from this domain. */
  sampleUrl: string;
  dofollowCount: number;
  nofollowCount: number;
}

export interface AnchorBreakdown {
  anchor: string;
  count: number;
  /** Pretty bucket — "branded", "exact", "generic", "image", "naked". */
  category: "branded" | "exact" | "generic" | "image" | "naked" | "other";
}

export interface BacklinkSummary {
  candidatesChecked: number;
  verified: number;
  missing: number;
  errors: number;
  totalHits: number;
  dofollow: number;
  nofollow: number;
  uniqueReferringDomains: number;
  avgHitsPerPage: number;
}

export interface BacklinkAnalysis {
  targetUrl: string;
  targetDomain: string;
  /** When the analysis completed (ISO string). */
  analyzedAt: string;
  /** Whether comparison was strict (full URL) or loose (any URL on host). */
  matchMode: "strict" | "loose";
  summary: BacklinkSummary;
  referringDomains: ReferringDomain[];
  anchorBreakdown: AnchorBreakdown[];
  results: BacklinkSourceResult[];
}
