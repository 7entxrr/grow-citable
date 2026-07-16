/**
 * Which backend powers rank tracking and backlink discovery.
 *
 *   puppeteer (default) — headless Chrome loads google.com/search, no API key
 *   cse                 — Google Custom Search JSON API (needs GOOGLE_CSE_*)
 */

export type SearchProvider = "puppeteer" | "cse" | "serper";

export function resolveSearchProvider(): SearchProvider {
  const explicit = process.env.SEARCH_PROVIDER?.toLowerCase();
  if (explicit === "cse") return "cse";
  if (explicit === "serper") return "serper";
  if (explicit === "puppeteer") return "puppeteer";
  if (process.env.SERPER_API_KEY && !process.env.SERPER_API_KEY.includes("YOUR_KEY")) {
    return "serper";
  }
  return "puppeteer";
}

export function isCseConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CSE_API_KEY && process.env.GOOGLE_CSE_CX);
}

/** Rank / discovery always work when Puppeteer Chrome is available (same as Analyzer). */
export function isSearchConfigured(): boolean {
  return true;
}
