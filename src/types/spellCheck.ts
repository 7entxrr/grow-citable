/**
 * Types for the "Spelling & Grammar" tab.
 *
 * Reuses the crawler's page discovery (BFS + sitemap.xml) to walk every URL
 * on the domain, then runs each page's body text through:
 *   - nspell (Hunspell-based English spell-checker)
 *   - a small set of regex-based grammar rules (repeated words, double
 *     spaces, etc.) — high-precision wins without LLM noise.
 */

export type GrammarRuleId =
  | "repeated-word"
  | "double-space"
  | "space-before-punct"
  | "missing-space-after-punct"
  | "lowercase-sentence-start";

export interface SpellingIssue {
  /** The token as it appears on the page. */
  word: string;
  /** Top suggestions from the dictionary. */
  suggestions: string[];
  /** ~30 characters of context on each side. */
  context: string;
}

export interface GrammarIssue {
  ruleId: GrammarRuleId;
  /** Short, user-facing message ("Repeated word: 'the the'"). */
  message: string;
  /** The exact text that triggered the rule. */
  match: string;
  /** ~30 characters of context on each side. */
  context: string;
}

export interface PageSpellReport {
  url: string;
  status: number;
  title: string;
  wordCount: number;
  spellingIssues: SpellingIssue[];
  grammarIssues: GrammarIssue[];
  /** True if the page was reachable + had text we could check. */
  checked: boolean;
  skipReason?: string;
}

export interface TopMisspelling {
  word: string;
  count: number;
  suggestions: string[];
  /** Pages where this misspelling was seen (capped to keep payload small). */
  pages: string[];
}

export interface SpellCheckSummary {
  pagesCrawled: number;
  pagesChecked: number;
  totalSpellingIssues: number;
  uniqueMisspellings: number;
  totalGrammarIssues: number;
}

export interface SpellCheckReport {
  seedUrl: string;
  domain: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  summary: SpellCheckSummary;
  topMisspellings: TopMisspelling[];
  /** Per-page details, sorted by total issue count (worst first). */
  pages: PageSpellReport[];
}
