import * as cheerio from "cheerio";
import { fetchWithTimeout } from "@/lib/fetcher";
import { log } from "@/lib/logger";
import { scrapeWebsite } from "@/lib/scraper";
import type { ScrapedData } from "@/types/analysis";
import type {
  HeadingNode,
  ImageIssue,
  LinkIssue,
  OnPageSeoRawMeta,
  OnPageSeoReport,
  SeoCategory,
  SeoCheck,
  SeoCheckStatus,
} from "@/types/onPageSeo";

/**
 * Runs a deep on-page SEO audit on a single URL.
 *
 * Reuses the existing `scrapeWebsite()` helper (fetch + parseHtml via cheerio
 * + security headers HEAD) and layers a categorised, check-by-check report
 * on top with explicit pass/warn/fail status and the raw values needed for
 * the UI to render rich panels.
 *
 * Optionally accepts a `targetKeyword` so we can run keyword-specific checks
 * (title contains keyword, H1 contains keyword, URL contains keyword,
 * keyword density bucket, etc.).
 */

interface CheckerOptions {
  url: string;
  targetKeyword?: string | null;
}

export async function runOnPageSeoCheck(
  options: CheckerOptions,
): Promise<OnPageSeoReport> {
  const requestedUrl = options.url.startsWith("http")
    ? options.url
    : `https://${options.url}`;
  const target = (options.targetKeyword ?? "").trim().toLowerCase() || null;

  log.start("[onpage:check]", "Running on-page SEO audit", {
    url: requestedUrl,
    target: target ?? undefined,
  });

  const scraped = await scrapeWebsite(requestedUrl);
  const $ = cheerio.load(scraped.html);

  const rawMeta = extractRawMeta($, scraped);
  const headingsOutline = extractHeadingsOutline($);
  const imageIssues = collectImageIssues(scraped);
  const linkCounts = countLinks($, scraped);
  const linkIssues = collectLinkIssues($, scraped);
  const jsonLdTypes = extractJsonLdTypes($);
  const wordCount = computeWordCount(scraped.bodyText);
  const readabilityScore = computeFleschReadingEase(scraped.bodyText);
  const pageSizeBytes = Buffer.byteLength(scraped.html, "utf8");

  const [robotsTxtFound, sitemapFound] = await Promise.all([
    checkResource(scraped.finalUrl, "/robots.txt"),
    checkSitemap(scraped),
  ]);

  const categories: SeoCategory[] = [
    buildMetaBasicsCategory(rawMeta, target, requestedUrl),
    buildHeadingsCategory(headingsOutline, target),
    buildContentCategory(wordCount, readabilityScore, scraped, target),
    buildImagesCategory(scraped, imageIssues),
    buildLinksCategory(linkCounts, linkIssues),
    buildSocialCategory(rawMeta),
    buildStructuredDataCategory(jsonLdTypes),
    buildUrlCategory(scraped.finalUrl, target),
    buildIndexabilityCategory(rawMeta, robotsTxtFound, sitemapFound),
    buildSecurityCategory(scraped),
  ];

  const { summary, score } = computeScore(categories);
  const grade = scoreToGrade(score);

  log.ok("[onpage:check]", "Audit complete", {
    score,
    grade,
    pass: summary.pass,
    warn: summary.warn,
    fail: summary.fail,
  });

  return {
    url: requestedUrl,
    finalUrl: scraped.finalUrl,
    analyzedAt: new Date().toISOString(),
    targetKeyword: target,
    score,
    grade,
    summary,
    categories,
    rawMeta,
    headingsOutline,
    imageIssues,
    linkIssues,
    jsonLdTypes,
    wordCount,
    readabilityScore,
    linkCounts,
    pageSizeBytes,
    robotsTxtFound,
    sitemapFound,
  };
}

/* ---------- Extractors ---------- */

function extractRawMeta(
  $: cheerio.CheerioAPI,
  scraped: ScrapedData,
): OnPageSeoRawMeta {
  const ogTags = scraped.ogTags;
  const lang = $("html").attr("lang") ?? "";
  const charset = $("meta[charset]").attr("charset") ?? "";
  const viewport = $('meta[name="viewport"]').attr("content") ?? "";
  const twitterCard =
    $('meta[name="twitter:card"]').attr("content") ?? "";
  const twitterTitle =
    $('meta[name="twitter:title"]').attr("content") ?? "";
  const twitterDescription =
    $('meta[name="twitter:description"]').attr("content") ?? "";
  const twitterImage =
    $('meta[name="twitter:image"]').attr("content") ?? "";
  const favicon =
    $('link[rel="icon"]').attr("href") ??
    $('link[rel="shortcut icon"]').attr("href") ??
    "";

  const hreflang: { code: string; href: string }[] = [];
  $('link[rel="alternate"][hreflang]').each((_, el) => {
    const code = $(el).attr("hreflang") ?? "";
    const href = $(el).attr("href") ?? "";
    if (code && href) hreflang.push({ code, href });
  });

  return {
    title: scraped.title,
    description: scraped.description,
    canonical: scraped.canonical,
    robots: scraped.robots,
    ogTitle: ogTags.title ?? "",
    ogDescription: ogTags.description ?? "",
    ogImage: ogTags.image ?? "",
    ogType: ogTags.type ?? "",
    twitterCard,
    twitterTitle,
    twitterDescription,
    twitterImage,
    viewport,
    charset,
    lang,
    favicon,
    hreflang,
  };
}

function extractHeadingsOutline($: cheerio.CheerioAPI): HeadingNode[] {
  const out: HeadingNode[] = [];
  $("h1, h2, h3, h4, h5, h6").each((_, el) => {
    const tag = el.tagName.toLowerCase() as HeadingNode["tag"];
    const text = $(el).text().replace(/\s+/g, " ").trim();
    if (text) out.push({ tag, text });
  });
  return out;
}

function collectImageIssues(scraped: ScrapedData): ImageIssue[] {
  const issues: ImageIssue[] = [];
  for (const img of scraped.images) {
    if (!img.alt || img.alt.trim() === "") {
      issues.push({
        src: img.src,
        alt: img.alt,
        reason: img.alt === null ? "Missing alt attribute" : "Empty alt",
      });
    } else if (img.alt.length > 125) {
      issues.push({
        src: img.src,
        alt: img.alt,
        reason: `Alt text is ${img.alt.length} chars (recommended ≤125)`,
      });
    }
  }
  return issues;
}

function countLinks($: cheerio.CheerioAPI, scraped: ScrapedData) {
  let nofollow = 0;
  let emptyAnchor = 0;
  let genericAnchor = 0;
  const generics = new Set([
    "click here",
    "here",
    "read more",
    "learn more",
    "this",
    "this link",
    "more",
    "link",
  ]);

  $("a[href]").each((_, el) => {
    const $a = $(el);
    const href = $a.attr("href") ?? "";
    if (!href || href.startsWith("#") || href.startsWith("javascript:")) return;

    const rel = ($a.attr("rel") ?? "").toLowerCase();
    if (rel.split(/\s+/).includes("nofollow")) nofollow++;

    const text = $a.text().replace(/\s+/g, " ").trim().toLowerCase();
    const hasImg = $a.find("img").length > 0;
    if (!text && !hasImg) emptyAnchor++;
    else if (text && generics.has(text)) genericAnchor++;
  });

  return {
    internal: scraped.internalLinks.length,
    external: scraped.externalLinks.length,
    nofollow,
    emptyAnchor,
    genericAnchor,
  };
}

function collectLinkIssues(
  $: cheerio.CheerioAPI,
  scraped: ScrapedData,
): LinkIssue[] {
  const issues: LinkIssue[] = [];
  const generics = new Set([
    "click here",
    "here",
    "read more",
    "learn more",
    "this",
    "this link",
    "more",
    "link",
  ]);

  $("a[href]").each((_, el) => {
    const $a = $(el);
    const href = $a.attr("href") ?? "";
    if (!href || href.startsWith("#") || href.startsWith("javascript:")) return;
    const text = $a.text().replace(/\s+/g, " ").trim();
    const lower = text.toLowerCase();
    if (!text && $a.find("img").length === 0) {
      issues.push({ href, anchor: "", reason: "Empty anchor text" });
    } else if (lower && generics.has(lower)) {
      issues.push({ href, anchor: text, reason: "Generic anchor text" });
    }
  });

  // Cap to avoid huge payloads
  const _ = scraped;
  void _;
  return issues.slice(0, 30);
}

function extractJsonLdTypes($: cheerio.CheerioAPI): string[] {
  const types = new Set<string>();
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().text();
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      collectTypes(parsed, types);
    } catch {
      /* malformed JSON-LD — ignore */
    }
  });
  return Array.from(types);
}

function collectTypes(node: unknown, types: Set<string>): void {
  if (!node) return;
  if (Array.isArray(node)) {
    for (const item of node) collectTypes(item, types);
    return;
  }
  if (typeof node === "object") {
    const obj = node as Record<string, unknown>;
    const t = obj["@type"];
    if (typeof t === "string") types.add(t);
    else if (Array.isArray(t)) t.forEach((x) => typeof x === "string" && types.add(x));
    if (Array.isArray(obj["@graph"])) collectTypes(obj["@graph"], types);
    for (const value of Object.values(obj)) {
      if (typeof value === "object") collectTypes(value, types);
    }
  }
}

function computeWordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function countSyllables(word: string): number {
  const lower = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!lower) return 0;
  // Quick approximation: groups of vowels = ~1 syllable each.
  const groups = lower.match(/[aeiouy]+/g);
  let count = groups ? groups.length : 1;
  if (lower.endsWith("e") && count > 1) count--;
  return Math.max(1, count);
}

function computeFleschReadingEase(text: string): number | null {
  const sentences = text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (sentences.length === 0 || words.length === 0) return null;
  const syllables = words.reduce((sum, w) => sum + countSyllables(w), 0);
  const ASL = words.length / sentences.length; // avg sentence length
  const ASW = syllables / words.length; // avg syllables per word
  const score = 206.835 - 1.015 * ASL - 84.6 * ASW;
  return Math.round(Math.max(0, Math.min(100, score)));
}

/* ---------- Category builders ---------- */

function buildMetaBasicsCategory(
  meta: OnPageSeoRawMeta,
  keyword: string | null,
  requestedUrl: string,
): SeoCategory {
  const checks: SeoCheck[] = [];
  const titleLen = meta.title.length;
  const descLen = meta.description.length;

  checks.push(
    titleLen === 0
      ? fail("title-present", "Title tag", "Missing <title>")
      : titleLen < 30
        ? warn(
            "title-length",
            "Title length",
            `Only ${titleLen} chars — aim for 50–60`,
            `${titleLen} chars`,
          )
        : titleLen > 70
          ? warn(
              "title-length",
              "Title length",
              `${titleLen} chars — likely truncated in SERPs`,
              `${titleLen} chars`,
            )
          : pass(
              "title-length",
              "Title length",
              `Good length`,
              `${titleLen} chars`,
            ),
  );

  checks.push(
    descLen === 0
      ? fail("desc-present", "Meta description", "Missing meta description")
      : descLen < 120
        ? warn(
            "desc-length",
            "Description length",
            `${descLen} chars — Google may show snippet instead`,
            `${descLen} chars`,
          )
        : descLen > 170
          ? warn(
              "desc-length",
              "Description length",
              `${descLen} chars — likely truncated`,
              `${descLen} chars`,
            )
          : pass(
              "desc-length",
              "Description length",
              "Good length",
              `${descLen} chars`,
            ),
  );

  checks.push(
    meta.canonical
      ? pass("canonical", "Canonical tag", meta.canonical)
      : warn(
          "canonical",
          "Canonical tag",
          "No canonical — duplicate-content risk if URL has params",
        ),
  );

  checks.push(
    meta.viewport
      ? pass("viewport", "Viewport meta", meta.viewport)
      : fail("viewport", "Viewport meta", "Missing — page won't be mobile-friendly"),
  );

  checks.push(
    meta.charset
      ? pass("charset", "Charset", meta.charset)
      : warn("charset", "Charset", "No <meta charset> — may cause encoding issues"),
  );

  checks.push(
    meta.lang
      ? pass("lang", "HTML lang attribute", meta.lang)
      : warn(
          "lang",
          "HTML lang attribute",
          "Missing — screen readers + Google language detection rely on it",
        ),
  );

  checks.push(
    meta.favicon
      ? pass("favicon", "Favicon", meta.favicon)
      : warn("favicon", "Favicon", "No <link rel=\"icon\"> tag"),
  );

  if (keyword) {
    checks.push(
      meta.title.toLowerCase().includes(keyword)
        ? pass(
            "kw-in-title",
            `Target keyword in title`,
            `"${keyword}" found`,
          )
        : warn(
            "kw-in-title",
            `Target keyword in title`,
            `"${keyword}" not found in title — strong relevance signal lost`,
          ),
    );
    checks.push(
      meta.description.toLowerCase().includes(keyword)
        ? pass(
            "kw-in-desc",
            `Target keyword in description`,
            `"${keyword}" found`,
          )
        : info(
            "kw-in-desc",
            `Target keyword in description`,
            `"${keyword}" not found in description`,
          ),
    );
    try {
      const u = new URL(requestedUrl);
      const pathLower = u.pathname.toLowerCase();
      checks.push(
        pathLower.includes(keyword.replace(/\s+/g, "-")) ||
          pathLower.includes(keyword.replace(/\s+/g, ""))
          ? pass("kw-in-url", "Keyword in URL", "Found in path")
          : info(
              "kw-in-url",
              "Keyword in URL",
              "Keyword not in path — minor signal only",
            ),
      );
    } catch {
      /* ignore */
    }
  }

  return {
    id: "meta",
    title: "Meta basics",
    description: "Title, description, canonical, viewport, charset, lang",
    checks,
  };
}

function buildHeadingsCategory(
  outline: HeadingNode[],
  keyword: string | null,
): SeoCategory {
  const checks: SeoCheck[] = [];
  const h1s = outline.filter((h) => h.tag === "h1");

  checks.push(
    h1s.length === 1
      ? pass("h1-count", "H1 count", `Exactly one — ${h1s[0].text.slice(0, 60)}`)
      : h1s.length === 0
        ? fail("h1-count", "H1 count", "No H1 found — Google's primary topic signal is missing")
        : warn(
            "h1-count",
            "H1 count",
            `${h1s.length} H1 tags — pick one primary heading`,
            h1s.length,
          ),
  );

  // Detect heading-level skipping (e.g. H1 → H3 with no H2)
  let lastLevel = 0;
  let skips = 0;
  for (const h of outline) {
    const level = Number(h.tag[1]);
    if (lastLevel > 0 && level > lastLevel + 1) skips++;
    lastLevel = level;
  }
  checks.push(
    skips === 0
      ? pass("heading-hierarchy", "Heading hierarchy", "No skipped levels")
      : warn(
          "heading-hierarchy",
          "Heading hierarchy",
          `${skips} skip(s) detected (e.g. H2 jumps to H4)`,
          skips,
        ),
  );

  checks.push(
    outline.length === 0
      ? fail("any-headings", "Heading tags", "No headings on the page")
      : pass(
          "any-headings",
          "Heading tags",
          `${outline.length} total headings across H1–H6`,
          outline.length,
        ),
  );

  if (keyword && h1s.length > 0) {
    const matchesH1 = h1s.some((h) => h.text.toLowerCase().includes(keyword));
    checks.push(
      matchesH1
        ? pass("kw-in-h1", "Keyword in H1", `"${keyword}" found in H1`)
        : warn(
            "kw-in-h1",
            "Keyword in H1",
            `"${keyword}" not in H1 — relevance signal weakened`,
          ),
    );
  }

  return {
    id: "headings",
    title: "Headings",
    description: "H1, hierarchy, keyword presence",
    checks,
  };
}

function buildContentCategory(
  wordCount: number,
  readability: number | null,
  scraped: ScrapedData,
  keyword: string | null,
): SeoCategory {
  const checks: SeoCheck[] = [];

  checks.push(
    wordCount === 0
      ? fail("words", "Word count", "No body text detected")
      : wordCount < 200
        ? warn(
            "words",
            "Word count",
            `Only ${wordCount} words — pages under 300 often rank poorly`,
            wordCount,
          )
        : pass(
            "words",
            "Word count",
            `${wordCount} words`,
            wordCount,
          ),
  );

  if (readability !== null) {
    const label =
      readability >= 60
        ? "Easy to read"
        : readability >= 30
          ? "Fairly difficult"
          : "Very difficult";
    checks.push(
      readability >= 60
        ? pass("readability", "Readability", label, readability)
        : readability >= 30
          ? info(
              "readability",
              "Readability",
              `${label} — Flesch ${readability}`,
              readability,
            )
          : warn(
              "readability",
              "Readability",
              `${label} — consider shorter sentences`,
              readability,
            ),
    );
  }

  if (keyword) {
    const bodyLower = scraped.bodyText.toLowerCase();
    const occurrences = bodyLower.split(keyword).length - 1;
    const density = wordCount > 0 ? (occurrences / wordCount) * 100 : 0;
    checks.push(
      occurrences === 0
        ? warn(
            "kw-density",
            "Keyword density",
            `"${keyword}" doesn't appear in body text`,
            `0%`,
          )
        : density > 4
          ? warn(
              "kw-density",
              "Keyword density",
              `${density.toFixed(1)}% — possible over-optimisation`,
              `${density.toFixed(1)}%`,
            )
          : pass(
              "kw-density",
              "Keyword density",
              `${occurrences} mentions (${density.toFixed(2)}%)`,
              `${density.toFixed(2)}%`,
            ),
    );
  }

  return {
    id: "content",
    title: "Content",
    description: "Word count, readability, keyword density",
    checks,
  };
}

function buildImagesCategory(
  scraped: ScrapedData,
  imageIssues: ImageIssue[],
): SeoCategory {
  const checks: SeoCheck[] = [];
  const total = scraped.images.length;
  const missingAlt = imageIssues.filter((i) => i.reason.includes("Missing")).length;
  const emptyAlt = imageIssues.filter((i) => i.reason.includes("Empty")).length;

  if (total === 0) {
    checks.push(info("images-count", "Image count", "No images on page"));
  } else {
    checks.push(
      pass("images-count", "Image count", `${total} images`, total),
    );

    checks.push(
      missingAlt === 0
        ? pass(
            "images-alt-missing",
            "Images missing alt",
            "All images have alt attributes",
          )
        : fail(
            "images-alt-missing",
            "Images missing alt",
            `${missingAlt} image(s) have no alt attribute`,
            missingAlt,
          ),
    );

    checks.push(
      emptyAlt === 0
        ? pass(
            "images-alt-empty",
            "Images with empty alt",
            "All non-decorative images have meaningful alt text",
          )
        : warn(
            "images-alt-empty",
            "Images with empty alt",
            `${emptyAlt} image(s) have empty alt — fine for decorative, bad for content`,
            emptyAlt,
          ),
    );
  }

  return {
    id: "images",
    title: "Images",
    description: "Alt-text coverage and image counts",
    checks,
  };
}

function buildLinksCategory(
  counts: ReturnType<typeof countLinks>,
  issues: LinkIssue[],
): SeoCategory {
  const checks: SeoCheck[] = [];

  checks.push(
    counts.internal === 0
      ? warn(
          "internal-links",
          "Internal links",
          "No internal links — crawlers can't reach other pages from here",
        )
      : pass(
          "internal-links",
          "Internal links",
          `${counts.internal} internal link(s)`,
          counts.internal,
        ),
  );

  checks.push(
    pass(
      "external-links",
      "External links",
      `${counts.external} external link(s)`,
      counts.external,
    ),
  );

  checks.push(
    counts.emptyAnchor === 0
      ? pass(
          "empty-anchor",
          "Empty anchor text",
          "All links have visible anchor text",
        )
      : warn(
          "empty-anchor",
          "Empty anchor text",
          `${counts.emptyAnchor} link(s) have no visible anchor`,
          counts.emptyAnchor,
        ),
  );

  checks.push(
    counts.genericAnchor === 0
      ? pass(
          "generic-anchor",
          "Generic anchor text",
          'No "click here" / "read more" anchors',
        )
      : warn(
          "generic-anchor",
          "Generic anchor text",
          `${counts.genericAnchor} link(s) use generic anchor text`,
          counts.genericAnchor,
        ),
  );

  if (issues.length > 0) {
    checks.push(
      info(
        "link-issues-detail",
        "Link issues detail",
        `${issues.length} link issue(s) — see panel below`,
      ),
    );
  }

  return {
    id: "links",
    title: "Links",
    description: "Internal/external counts and anchor-text quality",
    checks,
  };
}

function buildSocialCategory(meta: OnPageSeoRawMeta): SeoCategory {
  const checks: SeoCheck[] = [];

  checks.push(
    meta.ogTitle
      ? pass("og-title", "og:title", meta.ogTitle)
      : warn("og-title", "og:title", "Missing — social previews fall back to <title>"),
  );
  checks.push(
    meta.ogDescription
      ? pass("og-description", "og:description", meta.ogDescription)
      : warn(
          "og-description",
          "og:description",
          "Missing — social previews fall back to meta description",
        ),
  );
  checks.push(
    meta.ogImage
      ? pass("og-image", "og:image", meta.ogImage)
      : fail("og-image", "og:image", "Missing — no preview image on FB / LinkedIn / WhatsApp"),
  );
  checks.push(
    meta.ogType
      ? pass("og-type", "og:type", meta.ogType)
      : info("og-type", "og:type", "Missing — defaults to 'website'"),
  );
  checks.push(
    meta.twitterCard
      ? pass("tw-card", "twitter:card", meta.twitterCard)
      : info(
          "tw-card",
          "twitter:card",
          "Missing — Twitter falls back to og:image when available",
        ),
  );

  return {
    id: "social",
    title: "Open Graph & Twitter",
    description: "Social media preview tags",
    checks,
  };
}

function buildStructuredDataCategory(types: string[]): SeoCategory {
  const checks: SeoCheck[] = [];
  checks.push(
    types.length === 0
      ? warn(
          "json-ld",
          "JSON-LD structured data",
          "No JSON-LD found — rich results unlikely",
        )
      : pass(
          "json-ld",
          "JSON-LD structured data",
          `Found schema types: ${types.join(", ")}`,
          types.length,
        ),
  );
  return {
    id: "schema",
    title: "Structured data",
    description: "JSON-LD schema markup",
    checks,
  };
}

function buildUrlCategory(
  finalUrl: string,
  keyword: string | null,
): SeoCategory {
  const checks: SeoCheck[] = [];
  let host = "";
  let path = "";
  try {
    const u = new URL(finalUrl);
    host = u.host;
    path = u.pathname;
  } catch {
    /* ignore */
  }

  checks.push(
    finalUrl.startsWith("https://")
      ? pass("https", "HTTPS", "Served over HTTPS")
      : fail("https", "HTTPS", "Page is HTTP — ranking + browser-trust hit"),
  );

  const urlLen = finalUrl.length;
  checks.push(
    urlLen > 120
      ? warn("url-length", "URL length", `${urlLen} chars — keep under ~100`, urlLen)
      : pass("url-length", "URL length", `${urlLen} chars`, urlLen),
  );

  if (path.includes("_")) {
    checks.push(
      warn("url-underscores", "URL underscores", "Use hyphens, not underscores"),
    );
  } else {
    checks.push(pass("url-underscores", "URL underscores", "None found"));
  }

  if (host && host.startsWith("www.")) {
    checks.push(info("url-www", "WWW prefix", "Page is on www subdomain"));
  }

  if (keyword) {
    const stem = keyword.replace(/\s+/g, "-");
    checks.push(
      path.toLowerCase().includes(stem)
        ? pass(
            "url-keyword",
            "URL contains keyword",
            `Path contains "${stem}"`,
          )
        : info(
            "url-keyword",
            "URL contains keyword",
            `Path doesn't contain "${stem}" — minor signal`,
          ),
    );
  }

  return {
    id: "url",
    title: "URL",
    description: "HTTPS, length, structure",
    checks,
  };
}

function buildIndexabilityCategory(
  meta: OnPageSeoRawMeta,
  robotsTxt: boolean,
  sitemap: boolean,
): SeoCategory {
  const checks: SeoCheck[] = [];
  const robotsLower = meta.robots.toLowerCase();

  if (robotsLower.includes("noindex")) {
    checks.push(
      fail(
        "robots-noindex",
        "Meta robots",
        "Page is set to NOINDEX — Google won't show it in results",
        meta.robots,
      ),
    );
  } else {
    checks.push(
      pass(
        "robots-noindex",
        "Meta robots",
        meta.robots || "index,follow (default)",
        meta.robots || "default",
      ),
    );
  }

  if (robotsLower.includes("nofollow")) {
    checks.push(
      warn(
        "robots-nofollow",
        "Robots nofollow",
        "All links on the page are marked nofollow",
      ),
    );
  }

  checks.push(
    robotsTxt
      ? pass("robots-txt", "robots.txt", "Found at /robots.txt")
      : warn(
          "robots-txt",
          "robots.txt",
          "Not found at /robots.txt — crawlers use defaults",
        ),
  );

  checks.push(
    sitemap
      ? pass("sitemap", "Sitemap", "Sitemap is reachable")
      : warn(
          "sitemap",
          "Sitemap",
          "No sitemap.xml or <link rel=\"sitemap\"> found",
        ),
  );

  if (meta.hreflang.length > 0) {
    checks.push(
      pass(
        "hreflang",
        "hreflang tags",
        `${meta.hreflang.length} language variant(s) declared`,
        meta.hreflang.length,
      ),
    );
  } else {
    checks.push(
      info(
        "hreflang",
        "hreflang tags",
        "None declared — fine for single-language sites",
      ),
    );
  }

  return {
    id: "indexability",
    title: "Indexability",
    description: "Crawl / index directives",
    checks,
  };
}

function buildSecurityCategory(scraped: ScrapedData): SeoCategory {
  const checks: SeoCheck[] = [];
  const { securityHeaders } = scraped;

  checks.push(
    securityHeaders.xFrameOptions
      ? pass(
          "xfo",
          "X-Frame-Options",
          securityHeaders.xFrameOptions,
        )
      : info(
          "xfo",
          "X-Frame-Options",
          "Not set — minor click-jacking risk",
        ),
  );

  checks.push(
    securityHeaders.csp
      ? pass("csp", "Content-Security-Policy", "Header present")
      : info(
          "csp",
          "Content-Security-Policy",
          "Not set — recommended for security-conscious sites",
        ),
  );

  return {
    id: "security",
    title: "Security headers",
    description: "Response headers affecting trust signals",
    checks,
  };
}

/* ---------- Score ---------- */

function computeScore(categories: SeoCategory[]) {
  let pass = 0;
  let warn = 0;
  let fail = 0;
  let info = 0;
  for (const cat of categories) {
    for (const c of cat.checks) {
      if (c.status === "pass") pass++;
      else if (c.status === "warn") warn++;
      else if (c.status === "fail") fail++;
      else info++;
    }
  }
  const total = pass + warn + fail + info;
  // pass = 1.0, info = 0.85 (informational, doesn't hurt much),
  // warn = 0.5, fail = 0.
  const earned = pass + info * 0.85 + warn * 0.5;
  const denominator = total - info * 0.15 || 1;
  const score = Math.round((earned / denominator) * 100);
  return {
    summary: { pass, warn, fail, info, total },
    score: Math.max(0, Math.min(100, score)),
  };
}

function scoreToGrade(score: number): "A" | "B" | "C" | "D" | "F" {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "F";
}

/* ---------- Resource probes ---------- */

async function checkResource(baseUrl: string, path: string): Promise<boolean> {
  try {
    const origin = new URL(baseUrl).origin;
    const res = await fetchWithTimeout(`${origin}${path}`, {
      method: "GET",
      timeoutMs: 6000,
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function checkSitemap(scraped: ScrapedData): Promise<boolean> {
  if (scraped.sitemapLink) return true;
  return checkResource(scraped.finalUrl, "/sitemap.xml");
}

/* ---------- Helpers for check rows ---------- */

function makeCheck(
  status: SeoCheckStatus,
  id: string,
  label: string,
  message: string,
  value?: string | number,
): SeoCheck {
  return { id, label, status, message, value };
}

const pass = (id: string, label: string, message: string, value?: string | number) =>
  makeCheck("pass", id, label, message, value);
const warn = (id: string, label: string, message: string, value?: string | number) =>
  makeCheck("warn", id, label, message, value);
const fail = (id: string, label: string, message: string, value?: string | number) =>
  makeCheck("fail", id, label, message, value);
const info = (id: string, label: string, message: string, value?: string | number) =>
  makeCheck("info", id, label, message, value);
