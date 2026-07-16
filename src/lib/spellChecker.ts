import nspell, { type NSpell } from "nspell";
import enUsDictionary from "dictionary-en";
import enGbDictionary from "dictionary-en-gb";
import type {
  GrammarIssue,
  GrammarRuleId,
  SpellingIssue,
} from "@/types/spellCheck";

/**
 * Lazily build (and cache) BOTH an American and a British English nspell
 * instance. A word that's misspelt in US English is often valid British
 * (or vice-versa — "color" / "colour", "organize" / "organise") so a token
 * is only flagged when *both* dictionaries reject it. Loading the Hunspell
 * files takes ~50ms total, so we cache the instances for the process lifetime.
 */
let spellInstancesPromise: Promise<NSpell[]> | null = null;

interface HunspellDict {
  aff: Buffer;
  dic: Buffer;
}

async function loadDictionary(raw: unknown): Promise<HunspellDict> {
  // dictionary-en (>= v4) exports `{ aff, dic }` Buffers directly.
  // Some older versions exported a callback-style loader.
  if (typeof raw === "function") {
    return await new Promise<HunspellDict>((resolve, reject) => {
      (raw as (cb: (err: Error | null, d: HunspellDict) => void) => void)(
        (err, d) => (err ? reject(err) : resolve(d)),
      );
    });
  }
  return raw as HunspellDict;
}

function getSpellInstances(): Promise<NSpell[]> {
  if (!spellInstancesPromise) {
    spellInstancesPromise = (async () => {
      const [us, gb] = await Promise.all([
        loadDictionary(enUsDictionary),
        loadDictionary(enGbDictionary),
      ]);
      return [nspell(us), nspell(gb)];
    })();
  }
  return spellInstancesPromise;
}

function isCorrectAnyDialect(spells: NSpell[], word: string): boolean {
  for (const s of spells) if (s.correct(word)) return true;
  return false;
}

/**
 * Common tech / brand / web vocabulary that's "correct" but not in Hunspell.
 * Lowercased; tokens are matched case-insensitively against this set.
 */
const ALLOWLIST = new Set<string>([
  // Web platform
  "html", "css", "js", "json", "url", "uri", "api", "apis", "http", "https",
  "dns", "ip", "tcp", "udp", "ssl", "tls", "cdn", "cors", "sso", "saas",
  "paas", "iaas", "ux", "ui", "seo", "sem", "ssr", "csr", "spa", "ssg",
  "isr", "ctr", "cta", "kpi", "roi", "btw", "faq", "faqs",
  // Languages / frameworks
  "javascript", "typescript", "nodejs", "node.js", "react", "reactjs",
  "vue", "vuejs", "nextjs", "next.js", "nuxt", "svelte", "sveltekit",
  "angular", "ember", "express", "fastify", "hono", "remix", "astro",
  "tailwind", "tailwindcss", "vite", "vitejs", "esbuild", "webpack",
  "rollup", "turbo", "turbopack", "swc", "rspack",
  "python", "pytorch", "pandas", "numpy", "tensorflow", "fastapi", "django",
  "flask", "rust", "rustlang", "golang", "kotlin", "swiftui", "flutter",
  "ruby", "rails", "php", "laravel", "symfony", "scala", "kafka",
  "graphql", "rest", "grpc", "websocket", "websockets", "webhook", "webhooks",
  "oauth", "jwt", "openid", "saml", "openapi", "swagger", "yaml", "toml",
  "markdown", "mdx",
  // Companies / products / brands
  "google", "googles", "youtube", "facebook", "instagram", "tiktok",
  "linkedin", "twitter", "twitch", "whatsapp", "telegram", "discord",
  "slack", "notion", "figma", "miro", "canva", "vercel", "netlify",
  "cloudflare", "aws", "gcp", "azure", "stripe", "paypal", "razorpay",
  "shopify", "wordpress", "wix", "squarespace", "github", "gitlab",
  "bitbucket", "atlassian", "jira", "trello", "asana", "openai", "anthropic",
  "claude", "gemini", "gpt", "llm", "llms", "chatgpt", "perplexity",
  "huggingface", "supabase", "firebase", "mongodb", "postgres", "postgresql",
  "mysql", "sqlite", "redis", "kafka", "rabbitmq", "elastic", "elasticsearch",
  "kibana", "grafana", "prometheus", "datadog", "sentry",
  // Internet vocabulary
  "online", "offline", "internet", "ecommerce", "e-commerce", "ecom",
  "fintech", "edtech", "healthtech", "saas", "b2b", "b2c", "d2c", "p2p",
  "podcast", "podcasts", "newsletter", "newsletters", "blog", "blogs",
  "blogging", "blogger", "vlog", "vlogger", "subreddit", "upvote", "downvote",
  "retweet", "hashtag", "emoji", "emojis", "gif", "gifs", "png", "jpg",
  "jpeg", "webp", "svg", "mp3", "mp4", "ogg", "webm",
  // Office / business
  "ai", "ml", "nlp", "ocr", "etl", "crm", "erp", "hrms", "ats", "saas",
  "kpi", "okr", "okrs", "mvp", "moat", "tam", "sam", "som", "arr", "mrr",
  "cac", "ltv", "cogs", "ebitda",
  // Common abbreviations
  "vs", "etc", "eg", "ie", "fyi", "asap", "wfh", "wfo", "tba", "tbd",
  // Modern tech / product vocabulary that's missing from base Hunspell.
  "scalable", "scalability", "wireframe", "wireframes", "wireframed",
  "wireframing", "chatbot", "chatbots", "voicebot", "deepfake", "deepfakes",
  "metaverse", "blockchain", "blockchains", "crypto", "cryptocurrency",
  "cryptocurrencies", "nft", "nfts", "dao", "daos", "defi", "web3",
  "lowcode", "nocode", "low-code", "no-code", "headless", "serverless",
  "microservices", "kubernetes", "docker", "containerized", "containerised",
  "agile", "scrum", "kanban", "retrospective", "retro", "standup", "standups",
  "onboarding", "offboarding", "upsell", "upselling", "cross-sell",
  "retargeting", "remarketing", "geotargeting", "lookalike", "lookalikes",
  "personalisation", "personalization", "gamification", "gamified",
  // Legal / business loanwords
  "majeure", "vis-à-vis", "vice-versa", "rsvp", "voila", "voilà",
  // SaaS / startup terminology
  "monetise", "monetize", "monetisation", "monetization", "monetised",
  "modularize", "modularise", "modularization", "modularisation",
  // Indian English / Hinglish — currency and units
  "lakh", "lakhs", "crore", "crores", "rupee", "rupees", "paisa",
  // Indian states + states' shorthand forms
  "andhra", "arunachal", "assam", "bihar", "chhattisgarh", "goa", "gujarat",
  "haryana", "himachal", "jharkhand", "karnataka", "kerala", "maharashtra",
  "manipur", "meghalaya", "mizoram", "nagaland", "odisha", "punjab",
  "rajasthan", "sikkim", "tamilnadu", "telangana", "tripura", "uttar",
  "uttarakhand",
  // Major Indian cities + neighbourhoods (lowercased for case-insensitive match)
  "mumbai", "delhi", "bangalore", "bengaluru", "hyderabad", "ahmedabad",
  "chennai", "kolkata", "surat", "pune", "jaipur", "lucknow", "kanpur",
  "nagpur", "indore", "thane", "bhopal", "visakhapatnam", "patna",
  "vadodara", "ghaziabad", "ludhiana", "agra", "nashik", "faridabad",
  "meerut", "rajkot", "varanasi", "srinagar", "aurangabad", "dhanbad",
  "amritsar", "allahabad", "prayagraj", "ranchi", "howrah", "coimbatore",
  "jabalpur", "gwalior", "vijayawada", "jodhpur", "madurai", "raipur",
  "kota", "guwahati", "chandigarh", "solapur", "hubli", "dharwad",
  "bareilly", "moradabad", "mysore", "mysuru", "gurugram", "gurgaon",
  "aligarh", "jalandhar", "tiruchirappalli", "trichy", "bhubaneswar",
  "salem", "warangal", "jalgaon", "guntur", "bhiwandi", "saharanpur",
  "gorakhpur", "bikaner", "amravati", "noida", "jamshedpur", "bhilai",
  "cuttack", "firozabad", "kochi", "ernakulam", "bhavnagar", "dehradun",
  "durgapur", "asansol", "rourkela", "nanded", "kolhapur", "ajmer",
  "akola", "gulbarga", "jamnagar", "ujjain", "siliguri", "jhansi",
  "ulhasnagar", "jammu", "sangli", "mangalore", "mangaluru", "erode",
  "belgaum", "tirunelveli", "malegaon", "gaya", "tirupur", "kozhikode",
  "calicut", "vaishali", "mahagun", "rishabh", "navi",
  // Indian languages
  "hindi", "marathi", "punjabi", "bengali", "tamil", "telugu", "kannada",
  "malayalam", "odia", "assamese", "konkani", "sindhi", "urdu", "sanskrit",
  // Common Hindi loanwords
  "namaste", "namaskar", "shukriya", "dhanyavad", "achcha", "haan", "nahi",
  "chai", "paneer", "samosa", "biryani", "dosa", "idli", "vada", "paratha",
  "naan", "roti", "chapati", "sabzi", "daal", "dal", "lassi", "paan",
  "masala", "garam", "haldi", "jeera", "dhania", "methi", "mirchi",
  "bhai", "behen", "beta", "beti", "papa", "mummy", "dadi", "dada", "nana",
  "nani", "mama", "mami", "masi", "chacha", "chachi", "saheb", "sahib",
  "memsahib", "babu", "didi", "bhaiya", "uncle", "auntie",
  "karma", "dharma", "mantra", "guru", "yoga", "yogi", "nirvana", "moksha",
  "samsara", "ahimsa", "bhakti", "puja", "mandir", "masjid", "gurudwara",
  "desi", "videshi", "swadeshi", "swaraj", "bharat", "hindustan",
  "diwali", "holi", "dussehra", "navratri", "ganesh", "chaturthi", "rakhi",
  "raksha", "bandhan", "onam", "pongal", "baisakhi", "lohri",
  "bazaar", "bazar", "mela", "chowk", "mandi", "ghat", "gully", "galli",
  "sari", "saree", "salwar", "kameez", "dhoti", "kurta", "lehenga",
  "churidar", "dupatta", "chunni", "bindi", "sindoor",
  "gaadi", "dukaan", "ghar", "kamra", "basti", "mohalla", "sadak",
  "wala", "wali", "walla", "ji",
  // Indian institutions (initialisms commonly written as words)
  "iit", "iim", "nit", "aiims", "bhu", "jnu", "isro", "drdo",
]);

/**
 * Tokenise body text into "candidate words" suitable for spell-checking.
 * Drops anything that's almost certainly a code identifier, URL, number,
 * etc., so we don't drown the report in false positives. Also tracks
 * sentence position so the checker can heuristically skip proper nouns.
 */
function* iterateWords(text: string): Generator<{
  word: string;
  index: number;
  isSentenceStart: boolean;
}> {
  // Strip URLs and emails outright so we don't try to spell-check them.
  const cleaned = text
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, " ");

  // Word: letters with optional internal apostrophe ("don't", "it's").
  // Hyphenated compounds get split into their parts intentionally.
  const re = /\b[A-Za-z][A-Za-z']*\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(cleaned)) !== null) {
    const word = m[0];
    // Walk backwards over whitespace to find the previous non-space char.
    // If it's a sentence terminator (or we're at the start of text), the
    // current word is at the start of a sentence and capitalisation is
    // meaningless as a proper-noun signal.
    let i = m.index - 1;
    while (i >= 0 && /\s/.test(cleaned[i])) i--;
    const prev = i >= 0 ? cleaned[i] : "";
    const isSentenceStart = prev === "" || /[.!?]/.test(prev);
    yield { word, index: m.index, isSentenceStart };
  }
}

function isSkippableToken(word: string): boolean {
  if (word.length < 3) return true;
  if (ALLOWLIST.has(word.toLowerCase())) return true;
  // Tokens with internal capitals after the first char are almost certainly
  // a code identifier or brand (camelCase, PascalCase, iPhone, eBay).
  if (/[A-Z]/.test(word.slice(1))) return true;
  // SCREAMING_SNAKE-like; if it's an actual word the dictionary would
  // accept the lowercase form.
  return false;
}

/**
 * Heuristic: a capitalised word appearing in the middle of a sentence is
 * almost always a proper noun (place name, person name, brand). Real
 * English typos generally appear lowercased, and capitalisation typos at
 * sentence-start are still caught because we only skip mid-sentence.
 *
 * This is exactly how Grammarly / LanguageTool / Word handle Hinglish
 * place names and Indian English content.
 */
function isLikelyProperNoun(word: string, isSentenceStart: boolean): boolean {
  if (isSentenceStart) return false;
  return /^[A-Z]/.test(word);
}

const MAX_ISSUES_PER_PAGE = 200;

export interface PageCheckResult {
  spelling: SpellingIssue[];
  grammar: GrammarIssue[];
}

export async function checkPageText(text: string): Promise<PageCheckResult> {
  const spells = await getSpellInstances();
  const spelling: SpellingIssue[] = [];
  const seenOnPage = new Set<string>();

  for (const { word, index, isSentenceStart } of iterateWords(text)) {
    if (spelling.length >= MAX_ISSUES_PER_PAGE) break;
    if (isSkippableToken(word)) continue;
    // Skip proper nouns (capitalised mid-sentence) — handles Hinglish place
    // names, Indian person names, brands, etc. without an explicit allowlist.
    if (isLikelyProperNoun(word, isSentenceStart)) continue;

    // Accept the word if any dialect dictionary recognises it (original
    // case OR lowercase OR stripped possessive).
    if (isCorrectAnyDialect(spells, word)) continue;
    if (isCorrectAnyDialect(spells, word.toLowerCase())) continue;
    if (
      word.endsWith("'s") &&
      isCorrectAnyDialect(spells, word.slice(0, -2))
    ) {
      continue;
    }

    // Dedupe by lowercased word so we report each typo once per page.
    const key = word.toLowerCase();
    if (seenOnPage.has(key)) continue;
    seenOnPage.add(key);

    // Suggestions come from the US dictionary by default; if it has nothing,
    // try the GB one.
    let suggestions = spells[0].suggest(word).slice(0, 4);
    if (suggestions.length === 0 && spells[1]) {
      suggestions = spells[1].suggest(word).slice(0, 4);
    }
    spelling.push({
      word,
      suggestions,
      context: extractContext(text, index, word.length),
    });
  }

  const grammar = findGrammarIssues(text);
  return { spelling, grammar };
}

function extractContext(text: string, start: number, length: number): string {
  const window = 35;
  const from = Math.max(0, start - window);
  const to = Math.min(text.length, start + length + window);
  const prefix = from > 0 ? "…" : "";
  const suffix = to < text.length ? "…" : "";
  return `${prefix}${text.slice(from, to).replace(/\s+/g, " ").trim()}${suffix}`;
}

/* ---------- Grammar rules (regex-based, high-precision) ---------- */

const GRAMMAR_RULES: {
  id: GrammarRuleId;
  re: RegExp;
  message: (match: RegExpExecArray) => string;
}[] = [
  {
    id: "repeated-word",
    // \b(\w{3,})\s+\1\b — repeated tokens. Min 3 chars to skip "is is" style
    // legit repetition like "had had". Case-insensitive.
    re: /\b([A-Za-z]{3,})\s+\1\b/gi,
    message: (m) => `Repeated word: "${m[0]}"`,
  },
  {
    id: "double-space",
    re: / {2,}/g,
    message: (m) => `Multiple consecutive spaces (${m[0].length} in a row)`,
  },
  {
    id: "space-before-punct",
    re: /\s+([,.;:!?])(?=\s|$)/g,
    message: (m) => `Space before punctuation "${m[1]}"`,
  },
  {
    id: "missing-space-after-punct",
    // Punct followed immediately by a letter, with no space. Ignore ellipses,
    // common abbreviations like "U.S." and decimals "3.14".
    re: /(?<![\d.])([.,;:!?])(?=[A-Za-z])(?![A-Z]\.)/g,
    message: (m) => `Missing space after "${m[1]}"`,
  },
];

const MAX_GRAMMAR_ISSUES_PER_PAGE = 100;

function findGrammarIssues(text: string): GrammarIssue[] {
  const out: GrammarIssue[] = [];
  for (const rule of GRAMMAR_RULES) {
    rule.re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = rule.re.exec(text)) !== null) {
      if (out.length >= MAX_GRAMMAR_ISSUES_PER_PAGE) return out;
      out.push({
        ruleId: rule.id,
        message: rule.message(m),
        match: m[0],
        context: extractContext(text, m.index, m[0].length),
      });
    }
  }
  return out;
}

/** Eagerly warm the dictionary cache. Safe to call concurrently. */
export async function warmSpellChecker(): Promise<void> {
  await getSpellInstances();
}
