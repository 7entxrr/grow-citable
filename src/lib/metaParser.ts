import type { AnalysisResult, ScrapedData } from "@/types/analysis";
import { resolveUrl } from "./fetcher";

export function parseMeta(scraped: ScrapedData): AnalysisResult["meta"] {
  const { finalUrl, title, description, ogTags, linkTags } = scraped;

  const faviconLink =
    linkTags.find((l) => l.rel.includes("icon"))?.href ??
    linkTags.find((l) => l.rel === "shortcut icon")?.href ??
    "";

  const favicon = faviconLink || resolveUrl(finalUrl, "/favicon.ico");

  return {
    title,
    description,
    ogTitle: ogTags.title ?? title,
    ogDescription: ogTags.description ?? description,
    ogImage: ogTags.image ? resolveUrl(finalUrl, ogTags.image) : "",
    favicon,
    canonical: scraped.canonical,
    robots: scraped.robots,
  };
}
