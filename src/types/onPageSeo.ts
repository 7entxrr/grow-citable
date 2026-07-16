/**
 * Types for the dedicated "On-Page SEO Checker" tab.
 *
 * Unlike the Analyzer page (which produces a single SEO score mixed in with
 * colors / fonts / AI / screenshots), the On-Page SEO Checker returns a
 * structured, categorised report with explicit pass/warn/fail status on
 * each individual check, plus the raw values needed to render rich panels
 * (headings outline, image alt issues, JSON-LD schema types, etc.).
 */

export type SeoCheckStatus = "pass" | "warn" | "fail" | "info";

export interface SeoCheck {
  id: string;
  label: string;
  status: SeoCheckStatus;
  message: string;
  /** Optional value to show next to the check (e.g. "57 chars", "12"). */
  value?: string | number;
  /** Optional URL or selector to link the user to a fix doc / location. */
  hint?: string;
}

export interface SeoCategory {
  id: string;
  title: string;
  description: string;
  checks: SeoCheck[];
}

export interface ImageIssue {
  src: string;
  alt: string | null;
  reason: string;
}

export interface LinkIssue {
  href: string;
  anchor: string;
  reason: string;
}

export interface HeadingNode {
  tag: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  text: string;
}

export interface OnPageSeoSummary {
  pass: number;
  warn: number;
  fail: number;
  info: number;
  total: number;
}

export interface OnPageSeoRawMeta {
  title: string;
  description: string;
  canonical: string;
  robots: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  ogType: string;
  twitterCard: string;
  twitterTitle: string;
  twitterDescription: string;
  twitterImage: string;
  viewport: string;
  charset: string;
  lang: string;
  favicon: string;
  hreflang: { code: string; href: string }[];
}

export interface OnPageSeoReport {
  url: string;
  finalUrl: string;
  analyzedAt: string;
  targetKeyword: string | null;
  /** 0–100, weighted across all checks. */
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  summary: OnPageSeoSummary;
  categories: SeoCategory[];
  rawMeta: OnPageSeoRawMeta;
  headingsOutline: HeadingNode[];
  imageIssues: ImageIssue[];
  linkIssues: LinkIssue[];
  jsonLdTypes: string[];
  wordCount: number;
  /** Flesch Reading Ease (0–100, higher = easier). */
  readabilityScore: number | null;
  linkCounts: {
    internal: number;
    external: number;
    nofollow: number;
    emptyAnchor: number;
    genericAnchor: number;
  };
  pageSizeBytes: number;
  /** Whether /robots.txt exists. */
  robotsTxtFound: boolean;
  /** Whether /sitemap.xml or any sitemap link tag resolves. */
  sitemapFound: boolean;
}
