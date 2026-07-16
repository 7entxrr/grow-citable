import type { AnalysisResult, ScrapedData } from "@/types/analysis";
import { fetchWithTimeout } from "./fetcher";

function extractGoogleFonts(haystack: string): string[] {
  const fonts: string[] = [];
  const regex = /fonts\.googleapis\.com\/css[^"']*family=([^&"']+)/gi;
  let match;
  while ((match = regex.exec(haystack)) !== null) {
    const families = decodeURIComponent(match[1])
      .split("|")
      .map((f) => f.split(":")[0].replace(/\+/g, " "));
    fonts.push(...families);
  }
  const familyRegex = /family=([^&"']+)/gi;
  while ((match = familyRegex.exec(haystack)) !== null) {
    const families = decodeURIComponent(match[1])
      .split("|")
      .map((f) => f.split(":")[0].replace(/\+/g, " "));
    fonts.push(...families);
  }
  return [...new Set(fonts)];
}

function extractAdobeFonts(haystack: string): string[] {
  if (!haystack.includes("use.typekit.net")) return [];
  return ["Adobe Fonts (Typekit)"];
}

function extractFontFaces(css: string): string[] {
  const fonts: string[] = [];
  const regex = /font-family\s*:\s*([^;}{]+)/gi;
  let match;
  while ((match = regex.exec(css)) !== null) {
    const raw = match[1]
      .split(",")[0]
      .trim()
      .replace(/['"]/g, "");
    if (
      raw &&
      !raw.startsWith("var(") &&
      !["inherit", "initial", "unset", "system-ui", "sans-serif", "serif", "monospace"].includes(raw.toLowerCase())
    ) {
      fonts.push(raw);
    }
  }
  return fonts;
}

function detectHeadingBodyFonts(css: string): {
  heading?: string;
  body?: string;
  mono?: string;
} {
  const headingMatch = css.match(
    /h[1-3][^{]*\{[^}]*font-family\s*:\s*([^;}{]+)/i,
  );
  const bodyMatch = css.match(
    /body[^{]*\{[^}]*font-family\s*:\s*([^;}{]+)/i,
  );
  const monoMatch = css.match(
    /(?:code|pre|mono)[^{]*\{[^}]*font-family\s*:\s*([^;}{]+)/i,
  );

  const clean = (s?: string) =>
    s?.split(",")[0].trim().replace(/['"]/g, "") ?? undefined;

  return {
    heading: clean(headingMatch?.[1]),
    body: clean(bodyMatch?.[1]),
    mono: clean(monoMatch?.[1]),
  };
}

async function fetchStylesheetText(url: string): Promise<string> {
  try {
    const res = await fetchWithTimeout(url, { timeoutMs: 8000 });
    if (!res.ok) return "";
    return await res.text();
  } catch {
    return "";
  }
}

export async function detectFonts(
  scraped: ScrapedData,
): Promise<AnalysisResult["fonts"]> {
  const haystack = [
    scraped.html,
    ...scraped.linkTags.map((l) => l.href),
    ...scraped.stylesheetUrls,
  ].join("\n");

  const googleFonts = extractGoogleFonts(haystack);
  const adobeFonts = extractAdobeFonts(haystack);

  let allCss = scraped.inlineStyles.join("\n");
  const sheets = await Promise.all(
    scraped.stylesheetUrls.slice(0, 3).map(fetchStylesheetText),
  );
  allCss += "\n" + sheets.join("\n");

  const selfHosted = extractFontFaces(allCss);
  const { heading, body, mono } = detectHeadingBodyFonts(allCss);

  const allDetected = [
    ...new Set([...googleFonts, ...adobeFonts, ...selfHosted]),
  ];

  const pickSource = (name: string): string => {
    if (googleFonts.some((f) => f.toLowerCase() === name.toLowerCase()))
      return "Google Fonts";
    if (adobeFonts.length > 0 && name.includes("Adobe")) return "Adobe Fonts";
    return "self-hosted";
  };

  const defaultName = allDetected[0] ?? "system-ui";
  const headingName = heading ?? googleFonts[0] ?? allDetected[0] ?? "Unknown";
  const bodyName = body ?? googleFonts[1] ?? googleFonts[0] ?? allDetected[0] ?? "Unknown";

  return {
    heading: { name: headingName, source: pickSource(headingName) },
    body: { name: bodyName, source: pickSource(bodyName) },
    mono: mono ? { name: mono, source: pickSource(mono) } : undefined,
    allDetected: allDetected.length > 0 ? allDetected : [defaultName],
  };
}
