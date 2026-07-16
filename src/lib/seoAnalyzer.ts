import type { AnalysisResult, ScrapedData } from "@/types/analysis";
import { fetchWithTimeout } from "./fetcher";

async function checkSitemapExists(baseUrl: string): Promise<boolean> {
  try {
    const origin = new URL(baseUrl).origin;
    const res = await fetchWithTimeout(`${origin}/sitemap.xml`, {
      method: "HEAD",
      timeoutMs: 5000,
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * SEO score weights (total 100):
 * - title length 50-60: 15
 * - description 150-160: 15
 * - exactly 1 H1: 15
 * - canonical: 10
 * - OG image: 10
 * - viewport meta: 10
 * - HTTPS: 10
 * - images alt coverage: 15 (scaled)
 */
export async function analyzeSEO(
  scraped: ScrapedData,
  meta: AnalysisResult["meta"],
  pageLoadMs = 0,
): Promise<AnalysisResult["seo"]> {
  const titleLength = meta.title.length;
  const descLength = meta.description.length;
  const h1Count = scraped.headings.h1.length;
  const imagesWithoutAlt = scraped.images.filter(
    (img) => !img.alt || img.alt.trim() === "",
  ).length;
  const hasCanonical = Boolean(scraped.canonical);
  const hasSitemap =
    Boolean(scraped.sitemapLink) ||
    (await checkSitemapExists(scraped.finalUrl));
  const hasOGImage = Boolean(meta.ogImage);
  const { securityHeaders } = scraped;

  let score = 0;

  if (titleLength >= 30 && titleLength <= 70) score += 15;
  else if (titleLength > 0) score += 8;

  if (descLength >= 120 && descLength <= 170) score += 15;
  else if (descLength > 0) score += 8;

  if (h1Count === 1) score += 15;
  else if (h1Count > 0) score += 5;

  if (hasCanonical) score += 10;
  if (hasOGImage) score += 10;
  if (scraped.hasViewportMeta) score += 10;
  if (securityHeaders.isHttps) score += 10;

  const totalImages = scraped.images.length;
  if (totalImages === 0) {
    score += 15;
  } else {
    const altCoverage =
      (totalImages - imagesWithoutAlt) / totalImages;
    score += Math.round(altCoverage * 15);
  }

  const cookieBannerKeywords = [
    "cookie",
    "gdpr",
    "consent",
    "privacy-banner",
  ];
  const htmlLower = scraped.html.toLowerCase();
  const hasCookieBanner =
    cookieBannerKeywords.some((kw) => htmlLower.includes(kw)) ||
    Boolean(
      securityHeaders.setCookie?.toLowerCase().includes("consent"),
    );

  return {
    score: Math.min(100, score),
    titleLength,
    descLength,
    hasOGImage,
    h1Count,
    imagesWithoutAlt,
    hasCanonical,
    hasSitemap,
    internalLinks: scraped.internalLinks.length,
    externalLinks: scraped.externalLinks.length,
    pageLoadMs,
    isHttps: securityHeaders.isHttps,
    hasViewportMeta: scraped.hasViewportMeta,
    hasXFrameOptions: Boolean(securityHeaders.xFrameOptions),
    hasCSP: Boolean(securityHeaders.csp),
    hasCookieBanner,
  };
}
