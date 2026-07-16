import { crawlSite } from "@/lib/siteCrawler";
import { checkPageText, warmSpellChecker } from "@/lib/spellChecker";
import { log } from "@/lib/logger";
import type {
  PageSpellReport,
  SpellCheckReport,
  TopMisspelling,
} from "@/types/spellCheck";

export interface SiteSpellCheckOptions {
  seedUrl: string;
  /** Max pages to crawl + check. Default 50, hard cap 300. */
  maxPages?: number;
}

const HARD_CAP = 300;
const TOP_MISSPELLINGS = 50;
const MAX_PAGES_PER_MISSPELLING = 5;

/**
 * Walks the whole site (BFS + sitemap, same as the Crawler tab) and runs the
 * spell + grammar checker on every page's body text. Returns a per-page
 * report plus a site-wide "top misspellings" leaderboard.
 */
export async function spellCheckSite(
  options: SiteSpellCheckOptions,
): Promise<SpellCheckReport> {
  const startedAt = new Date();
  const maxPages = Math.min(Math.max(1, options.maxPages ?? 50), HARD_CAP);

  log.start("[spellcheck:site]", "Starting site spell-check", {
    seedUrl: options.seedUrl,
    maxPages,
  });

  // Warm the dictionary while the crawler is fetching pages — saves ~50ms.
  const warmPromise = warmSpellChecker();

  const crawl = await crawlSite({
    seedUrl: options.seedUrl,
    maxPages,
    checkExternal: false,
    skipProbing: true,
  });

  await warmPromise;

  const pages: PageSpellReport[] = [];
  const misspellingTallies = new Map<
    string,
    {
      word: string;
      count: number;
      suggestions: string[];
      pages: Set<string>;
    }
  >();
  let totalSpelling = 0;
  let totalGrammar = 0;
  let pagesChecked = 0;

  for (const page of crawl.pages) {
    if (!page.bodyText || page.wordCount < 5) {
      pages.push({
        url: page.finalUrl || page.url,
        status: page.status,
        title: page.title,
        wordCount: page.wordCount,
        spellingIssues: [],
        grammarIssues: [],
        checked: false,
        skipReason: page.status === 0 || page.status >= 400
          ? `Page returned HTTP ${page.status || "ERR"}`
          : "Too little body text to check.",
      });
      continue;
    }

    const { spelling, grammar } = await checkPageText(page.bodyText);
    totalSpelling += spelling.length;
    totalGrammar += grammar.length;
    pagesChecked++;

    for (const issue of spelling) {
      const key = issue.word.toLowerCase();
      const existing = misspellingTallies.get(key);
      if (existing) {
        existing.count++;
        existing.pages.add(page.finalUrl || page.url);
      } else {
        misspellingTallies.set(key, {
          word: issue.word,
          count: 1,
          suggestions: issue.suggestions,
          pages: new Set([page.finalUrl || page.url]),
        });
      }
    }

    pages.push({
      url: page.finalUrl || page.url,
      status: page.status,
      title: page.title,
      wordCount: page.wordCount,
      spellingIssues: spelling,
      grammarIssues: grammar,
      checked: true,
    });
  }

  // Sort pages: worst (most issues) first.
  pages.sort(
    (a, b) =>
      b.spellingIssues.length +
      b.grammarIssues.length -
      (a.spellingIssues.length + a.grammarIssues.length),
  );

  const topMisspellings: TopMisspelling[] = Array.from(
    misspellingTallies.values(),
  )
    .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word))
    .slice(0, TOP_MISSPELLINGS)
    .map((t) => ({
      word: t.word,
      count: t.count,
      suggestions: t.suggestions,
      pages: Array.from(t.pages).slice(0, MAX_PAGES_PER_MISSPELLING),
    }));

  const finishedAt = new Date();
  const report: SpellCheckReport = {
    seedUrl: crawl.seedUrl,
    domain: crawl.domain,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    summary: {
      pagesCrawled: crawl.pages.length,
      pagesChecked,
      totalSpellingIssues: totalSpelling,
      uniqueMisspellings: misspellingTallies.size,
      totalGrammarIssues: totalGrammar,
    },
    topMisspellings,
    pages,
  };

  log.ok("[spellcheck:site]", "Site spell-check complete", {
    domain: crawl.domain,
    pagesChecked,
    totalSpelling,
    totalGrammar,
    durationMs: report.durationMs,
  });

  return report;
}
