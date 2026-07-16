/**
 * Types for the "Website crawler" tab.
 *
 * Given a seed URL, BFS-walks the same domain, then surfaces four classes
 * of issues SEO teams chase down constantly:
 *
 *   1. Broken links     — internal or external URLs returning 4xx / 5xx
 *   2. Redirects        — 3xx chains (potential SEO-juice loss)
 *   3. Duplicate content — pages sharing the same normalised body hash
 *   4. Missing meta tags — pages missing title, description, canonical, or H1
 */

export interface RedirectHop {
  url: string;
  status: number;
  location?: string;
}

export interface CrawlPage {
  /** URL we requested. */
  url: string;
  /** URL after following any redirects. */
  finalUrl: string;
  /** Final HTTP status (0 if the request errored). */
  status: number;
  /** Hops we followed to reach finalUrl. */
  redirectChain: RedirectHop[];
  fetchedAt: string;
  loadTimeMs: number;
  title: string;
  description: string;
  canonical: string;
  h1Count: number;
  wordCount: number;
  /** Normalised, lowercased body text — populated for use by downstream tools (spell-checker etc.). */
  bodyText: string;
  /** Same-origin links found on this page. */
  internalLinks: string[];
  /** Cross-origin links found on this page. */
  externalLinks: string[];
  /** Detailed metadata about links found on this page. */
  linkDetails?: { href: string; anchor: string }[];
  /** SHA-1 of the normalised body text. Null if no body / fetch failed. */
  contentHash: string | null;
  error?: string;
}

export interface BrokenLink {
  href: string;
  status: number | null;
  scope: "internal" | "external";
  /** Pages on which this link was discovered. */
  foundOn: string[];
  reason: string;
  /** Anchor texts associated with this link. */
  anchorText?: string;
  anchorTexts?: string[];
}

export interface RedirectEntry {
  from: string;
  to: string;
  hops: number;
  chain: RedirectHop[];
  scope: "internal" | "external";
}

export interface DuplicateGroup {
  contentHash: string;
  title: string;
  pages: string[];
}

export interface MissingMetaIssue {
  url: string;
  /** Subset of: title, description, canonical, h1. */
  missing: string[];
}

export interface CrawlSummary {
  pagesCrawled: number;
  pagesQueuedButSkipped: number;
  pagesLimit: number;
  uniqueInternalLinks: number;
  uniqueExternalLinks: number;
  brokenLinks: number;
  /** External links to bot-hostile hosts (LinkedIn, X, etc.) we couldn't verify. */
  unverifiedLinks: number;
  redirects: number;
  duplicateGroups: number;
  missingMetaPages: number;
  /** URLs harvested from the site's sitemap.xml (and sitemap index). */
  sitemapUrlsDiscovered: number;
}

export interface UnverifiedLink {
  href: string;
  host: string;
  /** Why we couldn't verify it — usually a known bot wall. */
  reason: string;
  /** HTTP status we did get back, if any (e.g. 999 from LinkedIn). */
  status: number | null;
  foundOn: string[];
}

export interface CrawlReport {
  seedUrl: string;
  domain: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  /**
   * Set when the seed URL itself never returned HTML — usually means the
   * target site blocked us (Cloudflare, Akamai, captcha walls, etc.) or
   * the URL was unreachable. The UI surfaces this as a banner so users
   * understand why the crawl only produced 0–1 pages.
   */
  seedBlocked?: {
    status: number;
    reason: string;
  };
  summary: CrawlSummary;
  pages: CrawlPage[];
  brokenLinks: BrokenLink[];
  unverifiedLinks: UnverifiedLink[];
  redirects: RedirectEntry[];
  duplicates: DuplicateGroup[];
  missingMeta: MissingMetaIssue[];
}
