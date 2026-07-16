import * as cheerio from "cheerio";
import { fetchSecurityHeaders, fetchWithTimeout } from "@/lib/fetcher";
import { log } from "@/lib/logger";
import type {
  AuthorityCategory,
  AuthoritySignal,
  DomainAuthorityReport,
  SignalStatus,
} from "@/types/domainAuthority";

/**
 * Free, DIY "domain authority" estimator.
 *
 * Real Moz Domain Authority requires a paid Moz API subscription. We instead
 * gather a handful of public, free signals and produce a 0–100 *estimate*
 * that's broadly proportional to how established + crawlable a domain is.
 *
 * Signal weights (total 100):
 *   - Domain age            (Wayback Machine first snapshot)   35
 *   - Sitemap depth         (URL count from /sitemap.xml)      25
 *   - Trust posture         (HTTPS + headers + robots + map)   25
 *   - Wayback activity      (CDX showNumPages × pageSize)      15
 */

const MAX_SITEMAP_INDEX_RECURSE = 5;
const SITEMAP_FETCH_TIMEOUT_MS = 10_000;
const WAYBACK_TIMEOUT_MS = 8_000;
const PAGE_SIZE = 10_000; // CDX showNumPages page size

interface EstimatorInput {
  url: string;
}

export async function estimateDomainAuthority(
  input: EstimatorInput,
): Promise<DomainAuthorityReport> {
  const inputUrl = input.url.trim();
  const origin = toOrigin(inputUrl);
  const domain = new URL(origin).hostname;

  log.start("[authority:estimate]", "Running authority estimate", { domain });

  // Kick off all I/O in parallel — every probe is independent.
  const [age, snapshots, sitemap, robots, secHeaders] = await Promise.all([
    fetchDomainAge(domain),
    fetchSnapshotCount(domain),
    fetchSitemapDepth(origin),
    fetchRobotsTxt(origin),
    fetchSecurityHeaders(origin),
  ]);

  const categories: AuthorityCategory[] = [
    buildAgeCategory(age),
    buildSitemapCategory(sitemap),
    buildTrustCategory(robots, sitemap, secHeaders),
    buildWaybackCategory(snapshots),
  ];

  const earned = categories.reduce((s, c) => s + c.earned, 0);
  const max = categories.reduce((s, c) => s + c.max, 0);
  const score = Math.round((earned / Math.max(1, max)) * 100);
  const grade = scoreToGrade(score);
  const verdict = scoreVerdict(score);

  log.ok("[authority:estimate]", "Estimate complete", {
    domain,
    score,
    grade,
    ageYears: age.years,
    sitemapCount: sitemap.urlCount,
    snapshots: snapshots.approxCount,
  });

  return {
    domain,
    inputUrl: origin,
    analyzedAt: new Date().toISOString(),
    score,
    grade,
    verdict,
    categories,
    raw: {
      firstSnapshotYear: age.year,
      firstSnapshotIso: age.iso,
      domainAgeYears: age.years,
      waybackSnapshotsApprox: snapshots.approxCount,
      sitemapUrlCount: sitemap.urlCount,
      sitemapIndexed: sitemap.urlCount > 0,
      sitemapsScanned: sitemap.scanned,
      robotsTxtFound: robots.found,
      isHttps: secHeaders.isHttps,
      hasXFrameOptions: Boolean(secHeaders.xFrameOptions),
      hasCsp: Boolean(secHeaders.csp),
      hasStrictTransport: false, // populated below if HSTS observed
    },
  };
}

/* ---------- Probes ---------- */

interface AgeResult {
  year: number | null;
  iso: string | null;
  years: number | null;
}

async function fetchDomainAge(domain: string): Promise<AgeResult> {
  try {
    const res = await fetchWithTimeout(
      `https://archive.org/wayback/available?url=${encodeURIComponent(domain)}&timestamp=19900101`,
      { timeoutMs: WAYBACK_TIMEOUT_MS },
    );
    if (!res.ok) return { year: null, iso: null, years: null };
    const data = (await res.json()) as {
      archived_snapshots?: {
        closest?: { timestamp?: string; available?: boolean };
      };
    };
    const ts = data.archived_snapshots?.closest?.timestamp;
    if (!ts || ts.length < 8 || !data.archived_snapshots?.closest?.available) {
      return { year: null, iso: null, years: null };
    }
    const year = Number(ts.slice(0, 4));
    const month = Number(ts.slice(4, 6)) - 1;
    const day = Number(ts.slice(6, 8));
    const iso = new Date(Date.UTC(year, month, day)).toISOString();
    const years = Math.max(
      0,
      Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24 * 365.25)),
    );
    return { year, iso, years };
  } catch (err) {
    log.warn("[authority:age]", "Wayback availability failed", err);
    return { year: null, iso: null, years: null };
  }
}

interface SnapshotResult {
  approxCount: number | null;
}

async function fetchSnapshotCount(domain: string): Promise<SnapshotResult> {
  try {
    const res = await fetchWithTimeout(
      `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(domain)}&matchType=domain&showNumPages=true&pageSize=${PAGE_SIZE}`,
      { timeoutMs: WAYBACK_TIMEOUT_MS },
    );
    if (!res.ok) return { approxCount: null };
    const raw = (await res.text()).trim();
    const pages = Number(raw);
    if (!Number.isFinite(pages) || pages < 0) return { approxCount: null };
    // pages × pageSize is an upper bound; the true count is somewhere in
    // (pages-1)*PAGE_SIZE … pages*PAGE_SIZE. We use that upper bound as the
    // estimate — it's good enough since the scoring log-scales it anyway.
    return { approxCount: pages * PAGE_SIZE };
  } catch (err) {
    log.warn("[authority:snapshots]", "Wayback CDX failed", err);
    return { approxCount: null };
  }
}

interface SitemapResult {
  urlCount: number;
  scanned: string[];
  /** Whether *any* sitemap loaded (vs hard 404). */
  found: boolean;
}

async function fetchSitemapDepth(origin: string): Promise<SitemapResult> {
  const scanned: string[] = [];
  let totalUrls = 0;
  let found = false;

  // Standard locations to probe.
  const seedSitemaps = [`${origin}/sitemap.xml`, `${origin}/sitemap_index.xml`];

  for (const seed of seedSitemaps) {
    const visited = new Set<string>();
    const queue: string[] = [seed];
    let depth = 0;

    while (queue.length > 0 && depth < MAX_SITEMAP_INDEX_RECURSE) {
      const next = queue.shift();
      if (!next || visited.has(next)) continue;
      visited.add(next);

      const parsed = await fetchSitemapDocument(next);
      if (parsed == null) continue;

      found = true;
      scanned.push(next);
      if (parsed.kind === "index") {
        queue.push(...parsed.sitemaps);
        depth++;
      } else {
        totalUrls += parsed.urls;
      }
    }
    if (found) break;
  }

  return { urlCount: totalUrls, scanned, found };
}

async function fetchSitemapDocument(
  url: string,
): Promise<
  | { kind: "urlset"; urls: number }
  | { kind: "index"; sitemaps: string[] }
  | null
> {
  try {
    const res = await fetchWithTimeout(url, {
      timeoutMs: SITEMAP_FETCH_TIMEOUT_MS,
    });
    if (!res.ok) return null;
    const xml = await res.text();
    if (!xml.includes("<")) return null;
    const $ = cheerio.load(xml, { xmlMode: true });

    const indexLocs = $("sitemapindex > sitemap > loc")
      .map((_, el) => $(el).text().trim())
      .get()
      .filter(Boolean);
    if (indexLocs.length > 0) {
      return { kind: "index", sitemaps: indexLocs };
    }

    const urlCount = $("urlset > url").length;
    if (urlCount > 0) return { kind: "urlset", urls: urlCount };
    return null;
  } catch (err) {
    log.warn("[authority:sitemap]", `Sitemap fetch failed for ${url}`, err);
    return null;
  }
}

interface RobotsResult {
  found: boolean;
  declaresSitemap: boolean;
}

async function fetchRobotsTxt(origin: string): Promise<RobotsResult> {
  try {
    const res = await fetchWithTimeout(`${origin}/robots.txt`, {
      timeoutMs: 6000,
    });
    if (!res.ok) return { found: false, declaresSitemap: false };
    const txt = await res.text();
    const declaresSitemap = /^\s*sitemap\s*:/im.test(txt);
    return { found: true, declaresSitemap };
  } catch {
    return { found: false, declaresSitemap: false };
  }
}

/* ---------- Category builders ---------- */

function buildAgeCategory(age: AgeResult): AuthorityCategory {
  const max = 35;
  let earned = 0;
  let status: SignalStatus = "unknown";
  let value = "Unknown";
  let detail = "Couldn't reach the Wayback Machine.";

  if (age.years != null && age.year != null) {
    // Linear up to 10 years, then flat at max.
    earned = Math.min(max, Math.round(age.years * 3.5));
    value = `${age.years} year${age.years === 1 ? "" : "s"} (since ${age.year})`;
    if (age.years >= 10) {
      status = "good";
      detail = "Strong age signal — sites this old tend to earn more trust.";
    } else if (age.years >= 5) {
      status = "ok";
      detail = "Reasonably mature domain.";
    } else if (age.years >= 1) {
      status = "weak";
      detail = "Young domain — trust takes time to accumulate.";
    } else {
      status = "weak";
      detail = "Brand new — ranking will be harder until age accrues.";
    }
  } else {
    detail = "No Wayback snapshot found — domain may be brand new or blocked.";
    status = "missing";
  }

  const signals: AuthoritySignal[] = [
    {
      id: "domain-age",
      label: "Domain age",
      status,
      value,
      detail,
      points: earned,
      maxPoints: max,
    },
  ];

  return {
    id: "age",
    title: "Age",
    description: "How long the domain has existed (per Wayback Machine)",
    earned,
    max,
    signals,
  };
}

function buildSitemapCategory(sitemap: SitemapResult): AuthorityCategory {
  const max = 25;
  let earned = 0;
  let status: SignalStatus;
  let detail: string;

  if (!sitemap.found) {
    status = "missing";
    detail =
      "No sitemap.xml found — search engines have to discover pages by crawling links.";
  } else if (sitemap.urlCount === 0) {
    status = "weak";
    detail = "Sitemap loaded but no URLs detected.";
  } else {
    // log10(N) × 8, capped at 25. 1k URLs ≈ 24 points.
    earned = Math.min(
      max,
      Math.round(Math.log10(Math.max(1, sitemap.urlCount)) * 8),
    );
    if (sitemap.urlCount >= 1000) {
      status = "good";
      detail = "Deep, well-indexed site.";
    } else if (sitemap.urlCount >= 100) {
      status = "ok";
      detail = "Healthy content footprint.";
    } else {
      status = "weak";
      detail = "Small site — more content will help.";
    }
  }

  const signals: AuthoritySignal[] = [
    {
      id: "sitemap-depth",
      label: "Sitemap URL count",
      status,
      value:
        sitemap.urlCount > 0
          ? sitemap.urlCount.toLocaleString()
          : sitemap.found
            ? "0"
            : "missing",
      detail,
      points: earned,
      maxPoints: max,
    },
  ];

  return {
    id: "sitemap",
    title: "Content depth",
    description: "Indexable pages discoverable via sitemap",
    earned,
    max,
    signals,
  };
}

function buildTrustCategory(
  robots: RobotsResult,
  sitemap: SitemapResult,
  sec: Awaited<ReturnType<typeof fetchSecurityHeaders>>,
): AuthorityCategory {
  const signals: AuthoritySignal[] = [];

  const httpsPts = sec.isHttps ? 8 : 0;
  signals.push({
    id: "https",
    label: "HTTPS",
    status: sec.isHttps ? "good" : "missing",
    value: sec.isHttps ? "Enabled" : "Plain HTTP",
    detail: sec.isHttps
      ? "All modern browsers and search engines expect HTTPS."
      : "HTTPS missing — major trust + ranking hit.",
    points: httpsPts,
    maxPoints: 8,
  });

  const robotsPts = robots.found ? 5 : 0;
  signals.push({
    id: "robots",
    label: "robots.txt",
    status: robots.found ? "good" : "missing",
    value: robots.found ? "Found" : "Missing",
    detail: robots.found
      ? robots.declaresSitemap
        ? "robots.txt found and declares a Sitemap line."
        : "robots.txt found but no Sitemap line."
      : "No /robots.txt — crawlers use defaults.",
    points: robotsPts,
    maxPoints: 5,
  });

  const sitemapPts = sitemap.found ? 5 : 0;
  signals.push({
    id: "sitemap-found",
    label: "Sitemap present",
    status: sitemap.found ? "good" : "missing",
    value: sitemap.found ? "Yes" : "No",
    detail: sitemap.found
      ? "Sitemap is reachable — easier indexing."
      : "No discoverable sitemap.",
    points: sitemapPts,
    maxPoints: 5,
  });

  const xfoPts = sec.xFrameOptions ? 3 : 0;
  signals.push({
    id: "xfo",
    label: "X-Frame-Options",
    status: sec.xFrameOptions ? "good" : "weak",
    value: sec.xFrameOptions ?? "missing",
    detail: sec.xFrameOptions
      ? "Header set — basic click-jacking defense."
      : "Header missing — minor trust signal lost.",
    points: xfoPts,
    maxPoints: 3,
  });

  const cspPts = sec.csp ? 4 : 0;
  signals.push({
    id: "csp",
    label: "Content-Security-Policy",
    status: sec.csp ? "good" : "weak",
    value: sec.csp ? "Present" : "missing",
    detail: sec.csp
      ? "CSP header present — strong security posture."
      : "No CSP — most sites still rank fine without one.",
    points: cspPts,
    maxPoints: 4,
  });

  const earned = signals.reduce((s, x) => s + x.points, 0);
  const max = signals.reduce((s, x) => s + x.maxPoints, 0);

  return {
    id: "trust",
    title: "Trust posture",
    description: "HTTPS, robots, sitemap and security headers",
    earned,
    max,
    signals,
  };
}

function buildWaybackCategory(snap: SnapshotResult): AuthorityCategory {
  const max = 15;
  let earned = 0;
  let status: SignalStatus = "unknown";
  let value = "Unknown";
  let detail = "Wayback CDX did not respond.";

  if (snap.approxCount != null && snap.approxCount > 0) {
    earned = Math.min(
      max,
      Math.round(Math.log10(Math.max(1, snap.approxCount)) * 4),
    );
    value = `${snap.approxCount.toLocaleString()}+ archived URLs`;
    if (snap.approxCount >= 100_000) {
      status = "good";
      detail = "Heavily archived — sustained crawler activity over time.";
    } else if (snap.approxCount >= 10_000) {
      status = "ok";
      detail = "Healthy archive footprint.";
    } else {
      status = "weak";
      detail = "Modest archive — domain has limited public history.";
    }
  } else if (snap.approxCount === 0) {
    status = "missing";
    value = "0";
    detail = "No Wayback archives — likely a brand-new or private domain.";
  }

  const signals: AuthoritySignal[] = [
    {
      id: "wayback-count",
      label: "Wayback snapshots",
      status,
      value,
      detail,
      points: earned,
      maxPoints: max,
    },
  ];

  return {
    id: "wayback",
    title: "Archive footprint",
    description: "How much of the site has been crawled by the Wayback Machine",
    earned,
    max,
    signals,
  };
}

/* ---------- Score helpers ---------- */

function scoreToGrade(score: number): "A" | "B" | "C" | "D" | "F" {
  if (score >= 80) return "A";
  if (score >= 60) return "B";
  if (score >= 40) return "C";
  if (score >= 20) return "D";
  return "F";
}

function scoreVerdict(score: number): string {
  if (score >= 80)
    return "Strong authority — ranking against established sites is realistic.";
  if (score >= 60)
    return "Solid mid-tier authority — competitive for niche keywords.";
  if (score >= 40)
    return "Developing authority — focus on age + content + backlinks.";
  if (score >= 20)
    return "Low authority — high-difficulty SERPs will be tough.";
  return "Very low authority — long-tail keywords + steady publishing needed.";
}

function toOrigin(input: string): string {
  const withProto = input.startsWith("http") ? input : `https://${input}`;
  const u = new URL(withProto);
  return `${u.protocol}//${u.host}`;
}
