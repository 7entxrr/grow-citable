import * as cheerio from "cheerio";
import type { ScrapedData } from "@/types/analysis";
import {
  fetchHtml,
  fetchSecurityHeaders,
  resolveUrl,
} from "./fetcher";

export function parseHtml(
  html: string,
  options: {
    requestedUrl: string;
    finalUrl: string;
    securityHeaders: ScrapedData["securityHeaders"];
  },
): ScrapedData {
  const $ = cheerio.load(html);
  const baseUrl = options.finalUrl;

  const ogTags: Record<string, string> = {};
  $('meta[property^="og:"]').each((_, el) => {
    const prop = $(el).attr("property")?.replace("og:", "") ?? "";
    const content = $(el).attr("content") ?? "";
    if (prop) ogTags[prop] = content;
  });

  const stylesheetUrls: string[] = [];
  $('link[rel="stylesheet"]').each((_, el) => {
    const href = $(el).attr("href");
    if (href) stylesheetUrls.push(resolveUrl(baseUrl, href));
  });

  const linkTags: { rel: string; href: string }[] = [];
  $("link[href]").each((_, el) => {
    const rel = $(el).attr("rel") ?? "";
    const href = $(el).attr("href");
    if (href) linkTags.push({ rel, href: resolveUrl(baseUrl, href) });
  });

  const headings = {
    h1: [] as string[],
    h2: [] as string[],
    h3: [] as string[],
    h4: [] as string[],
    h5: [] as string[],
    h6: [] as string[],
  };

  (["h1", "h2", "h3", "h4", "h5", "h6"] as const).forEach((tag) => {
    $(tag).each((_, el) => {
      const text = $(el).text().trim();
      if (text) headings[tag].push(text);
    });
  });

  const baseHost = new URL(baseUrl).hostname;
  const internalLinks: string[] = [];
  const externalLinks: string[] = [];

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href || href.startsWith("#") || href.startsWith("javascript:"))
      return;
    try {
      const resolved = resolveUrl(baseUrl, href);
      const host = new URL(resolved).hostname;
      if (host === baseHost) internalLinks.push(resolved);
      else externalLinks.push(resolved);
    } catch {
      /* skip invalid */
    }
  });

  const images: { src: string; alt: string | null }[] = [];
  $("img").each((_, el) => {
    const src = $(el).attr("src");
    if (src) {
      images.push({
        src: resolveUrl(baseUrl, src),
        alt: $(el).attr("alt") ?? null,
      });
    }
  });

  const scriptSrcs: string[] = [];
  $("script[src]").each((_, el) => {
    const src = $(el).attr("src");
    if (src) scriptSrcs.push(resolveUrl(baseUrl, src));
  });

  const inlineStyles: string[] = [];
  $("style").each((_, el) => {
    const content = $(el).html();
    if (content) inlineStyles.push(content);
  });

  $("script").each((_, el) => {
    const content = $(el).html();
    if (content && content.length < 50000) {
      inlineStyles.push(content);
    }
  });

  const bodyText = $("body").text().replace(/\s+/g, " ").trim();

  const canonical =
    $('link[rel="canonical"]').attr("href") ??
    linkTags.find((l) => l.rel.includes("canonical"))?.href ??
    "";

  const sitemapLink =
    linkTags.find((l) => l.rel.includes("sitemap"))?.href ?? "";

  return {
    url: options.requestedUrl,
    finalUrl: baseUrl,
    html,
    title: $("title").first().text().trim(),
    description:
      $('meta[name="description"]').attr("content")?.trim() ?? "",
    ogTags,
    stylesheetUrls,
    linkTags,
    headings,
    internalLinks: [...new Set(internalLinks)],
    externalLinks: [...new Set(externalLinks)],
    images,
    scriptSrcs,
    inlineStyles,
    bodyText,
    hasViewportMeta: $('meta[name="viewport"]').length > 0,
    robots: $('meta[name="robots"]').attr("content") ?? "",
    canonical: canonical ? resolveUrl(baseUrl, canonical) : "",
    sitemapLink,
    securityHeaders: options.securityHeaders,
  };
}

export async function scrapeWebsite(url: string): Promise<ScrapedData> {
  const normalized =
    url.startsWith("http") ? url : `https://${url}`;

  const [{ html, finalUrl }, securityHeaders] = await Promise.all([
    fetchHtml(normalized),
    fetchSecurityHeaders(normalized),
  ]);

  return parseHtml(html, {
    requestedUrl: normalized,
    finalUrl,
    securityHeaders,
  });
}
