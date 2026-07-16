import { getCache, setCache } from "@/lib/cache";
import {
  fetchSecurityHeaders,
  normalizeUrl,
} from "@/lib/fetcher";
import { parseHtml, scrapeWebsite } from "@/lib/scraper";
import { parseMeta } from "@/lib/metaParser";
import { analyzeSEO } from "@/lib/seoAnalyzer";
import { detectTech } from "@/lib/techDetector";
import { detectFonts } from "@/lib/fontDetector";
import {
  extractColorsFromCss,
  extractDominantColorsFromImage,
  mergeColors,
} from "@/lib/colorExtractor";
import { getAISummary } from "@/lib/claudeClient";
import { takeScreenshot } from "@/lib/screenshot";
import {
  EMPTY_ANALYSIS,
  type AnalysisResult,
  type ScrapedData,
} from "@/types/analysis";

export async function runFullAnalysis(
  url: string,
  options?: { skipCache?: boolean },
): Promise<AnalysisResult> {
  const cacheKey = normalizeUrl(url);

  if (!options?.skipCache) {
    const cached = getCache<AnalysisResult>(cacheKey);
    if (cached) return cached;
  }

  const warnings: string[] = [];
  const result = EMPTY_ANALYSIS(url);
  result.url = cacheKey;

  // Run scrape (plain fetch) and screenshot (Puppeteer) in parallel.
  // Puppeteer also returns its rendered HTML, so we can fall back to it
  // when the plain fetch is blocked by bot protection (403, etc.).
  const [scrapedResult, screenshotResult] = await Promise.allSettled([
    scrapeWebsite(url),
    takeScreenshot(url),
  ]);

  let scraped: ScrapedData | null = null;

  if (scrapedResult.status === "fulfilled") {
    scraped = scrapedResult.value;
  } else if (screenshotResult.status === "fulfilled") {
    warnings.push(
      `Direct fetch blocked (${
        scrapedResult.reason instanceof Error
          ? scrapedResult.reason.message
          : "unknown"
      }) — using rendered HTML from headless browser.`,
    );
    const securityHeaders = await fetchSecurityHeaders(url).catch(() => ({
      isHttps:
        url.startsWith("https://") ||
        screenshotResult.value.finalUrl.startsWith("https://"),
      xFrameOptions: null,
      csp: null,
      setCookie: null,
    }));
    scraped = parseHtml(screenshotResult.value.html, {
      requestedUrl: url.startsWith("http") ? url : `https://${url}`,
      finalUrl: screenshotResult.value.finalUrl,
      securityHeaders,
    });
  } else {
    const scrapeErr =
      scrapedResult.reason instanceof Error
        ? scrapedResult.reason.message
        : "unknown";
    const shotErr =
      screenshotResult.reason instanceof Error
        ? screenshotResult.reason.message
        : "unknown";
    throw new Error(
      `Both fetch and headless browser failed. fetch: ${scrapeErr} | puppeteer: ${shotErr}`,
    );
  }

  result.meta = parseMeta(scraped);
  result.techStack = detectTech(scraped);

  const cssColors = extractColorsFromCss(scraped.inlineStyles);
  result.fonts = await detectFonts(scraped);

  let pageLoadMs = 0;
  let screenshotDesktop = "";
  let screenshotMobile = "";

  if (screenshotResult.status === "fulfilled") {
    screenshotDesktop = screenshotResult.value.desktop;
    screenshotMobile = screenshotResult.value.mobile;
    pageLoadMs = screenshotResult.value.pageLoadMs;
  } else {
    warnings.push(
      `Screenshot failed: ${
        screenshotResult.reason instanceof Error
          ? screenshotResult.reason.message
          : "unknown"
      }`,
    );
  }

  result.screenshot = {
    desktop: screenshotDesktop,
    mobile: screenshotMobile,
  };

  const imageDominant =
    await extractDominantColorsFromImage(screenshotDesktop);
  result.colors = mergeColors(cssColors, imageDominant);

  result.seo = await analyzeSEO(scraped, result.meta, pageLoadMs);

  result.ai = await getAISummary({
    url: scraped.finalUrl,
    title: scraped.title,
    description: scraped.description,
    headings: scraped.headings,
    bodyText: scraped.bodyText,
  });

  result.analyzedAt = new Date().toISOString();
  result.warnings = warnings;

  setCache(cacheKey, result, 86400);
  return result;
}
