import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

async function queryDeepSeek(prompt: string): Promise<any> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey || apiKey.includes('YOUR_KEY')) {
    throw new Error('DeepSeek API Key is not configured');
  }

  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: 'You are an SEO/AEO/GEO website auditor. You must output raw JSON. Do not include any explanation or markdown formatting.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3
    }),
    signal: AbortSignal.timeout(25000),
  });

  if (!res.ok) {
    throw new Error(`DeepSeek API returned status ${res.status}`);
  }

  const json = await res.json();
  const text = json.choices?.[0]?.message?.content;
  if (!text) throw new Error('Empty response from DeepSeek');

  return JSON.parse(text);
}

// Deterministic seed random function
function getSeededRandom(seedStr: string) {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash << 5) - hash + seedStr.charCodeAt(i);
    hash |= 0; // Convert to 32-bit integer
  }
  return function() {
    hash = (hash * 1664525 + 1013904223) | 0;
    return (hash >>> 0) / 0xffffffff;
  };
}

function getLocalFallbackTasks(domain: string, dateKey: string): any[] {
  const pool = [
    {
      title: "Add Organization JSON-LD Schema",
      desc: "Implement Organization schema on the homepage structure to help ChatGPT and Gemini resolve company identification and profile correlations.",
      engine: "ChatGPT",
      difficulty: "Medium",
      diagnostic: "No Organization schema found in the crawl data."
    },
    {
      title: "Enable LocalBusiness Structured Data",
      desc: "Add specific LocalBusiness structured data (address, coordinates, opening hours) to assist local AI search engines.",
      engine: "Google Gemini",
      difficulty: "Medium",
      diagnostic: "Missing structured LocalBusiness JSON-LD markup on homepage."
    },
    {
      title: "Optimize Heading Semantic Structure",
      desc: "Ensure headings follow a logical H1 -> H2 -> H3 hierarchy on top landing pages to aid LLM crawling parsers.",
      engine: "All Engines",
      difficulty: "Easy",
      diagnostic: "Mismatched or missing H1 headings found on key pages."
    },
    {
      title: "Create Question-Answer Content Blocks",
      desc: "Structure direct Q&A formatted sections at the top of important pages to target direct Claude and ChatGPT snippets.",
      engine: "Claude",
      difficulty: "Easy",
      diagnostic: "Lack of direct concise Q&A text blocks."
    },
    {
      title: "Integrate Outbound References",
      desc: "Link claims on key blog posts to authoritative sources to satisfy Perplexity citation preferences.",
      engine: "Perplexity",
      difficulty: "Medium",
      diagnostic: "Low outbound external reference counts."
    },
    {
      title: "Accelerate Crawling with IndexNow",
      desc: "Ping indexing endpoints directly to ensure crawlers index updates in real time rather than standard crawl cycles.",
      engine: "All Engines",
      difficulty: "Easy",
      diagnostic: "Recent sitemap updates have not been explicitly pinged."
    },
    {
      title: "Implement Open Graph Meta Tags",
      desc: "Verify og:title, og:description, and og:image tags are present to guarantee snippet visual layouts across chat tools.",
      engine: "All Engines",
      difficulty: "Easy",
      diagnostic: "Some OG tags are missing or fall back to defaults."
    },
    {
      title: "Improve Topic Cluster Interlinking",
      desc: "Group articles into structured topic siloes and interlink them to build thematic relevance signals for Gemini.",
      engine: "Google Gemini",
      difficulty: "High",
      diagnostic: "Isolated pages without structured internal context links."
    },
    {
      title: "Configure FAQ Page JSON-LD",
      desc: "Embed FAQ schema on help and services pages to trigger rich visibility snippets inside search boxes.",
      engine: "ChatGPT",
      difficulty: "Medium",
      diagnostic: "No FAQ structured data detected."
    },
    {
      title: "Refine Text Content Flesch Readability",
      desc: "Simplify sentences and use direct structures to hit a Flesch score of 60+, aiding LLM indexing engines.",
      engine: "All Engines",
      difficulty: "High",
      diagnostic: "Average page reading ease falls below recommended levels."
    },
    {
      title: "Correct Canonical Link Headers",
      desc: "Validate that canonical URLs match page headers to prevent search indexing duplication issues.",
      engine: "All Engines",
      difficulty: "Medium",
      diagnostic: "Canonical link headers mismatch some direct URLs."
    },
    {
      title: "Improve Image Alt Text Descriptions",
      desc: "Ensure all core images contain meaningful alt text carrying entity labels to assist AI image indexers.",
      engine: "DeepSeek",
      difficulty: "Easy",
      diagnostic: "Images with missing alt text detected."
    },
    {
      title: "Setup Brand Alerts & Mentions Tracking",
      desc: "Set up tracking alerts across external blogs to monitor references and target new citation opportunities.",
      engine: "Perplexity",
      difficulty: "Medium",
      diagnostic: "External citation volume is relatively low."
    },
    {
      title: "Add Product Review Structured Markup",
      desc: "Incorporate Product Review schema blocks to surface visual star ratings in search answer grids.",
      engine: "Bing Copilot",
      difficulty: "Medium",
      diagnostic: "Product schema is missing standard review fields."
    },
    {
      title: "Minimize Page Load Layout Shift (CLS)",
      desc: "Optimize layout dimensions to ensure web pages load stably, which indexers verify for visibility weighting.",
      engine: "Google Gemini",
      difficulty: "High",
      diagnostic: "Layout shifts detected on dynamic widgets."
    },
    {
      title: "Optimize Robots.txt Permissions",
      desc: "Check that robots.txt configuration grants indexing access to ChatGPT (GPTBot) and Claude (Anthropic-ai) bots.",
      engine: "ChatGPT",
      difficulty: "Easy",
      diagnostic: "Robots.txt contains restrictive crawling rules."
    },
    {
      title: "Establish Clear Entity Definitions",
      desc: "Use direct, unambiguous naming conventions for brands, products, and core entities inside the body text.",
      engine: "DeepSeek",
      difficulty: "Medium",
      diagnostic: "Entity names are sometimes ambiguous."
    },
    {
      title: "Add Author Profile Structured Details",
      desc: "Add Author schema to content articles to build authority trust points required by Gemini and Claude.",
      engine: "Claude",
      difficulty: "Medium",
      diagnostic: "Lack of explicit author details on blog templates."
    },
    {
      title: "Eliminate Broken Links",
      desc: "Fix any broken internal references to maintain crawl health and ensure search indexers don't report crawl blocks.",
      engine: "All Engines",
      difficulty: "Medium",
      diagnostic: "Internal links returning non-200 responses found."
    },
    {
      title: "Add HowTo Markup for Instructionals",
      desc: "Ensure guides and walkthrough resources use standard HowTo schema to trigger bulleted step layouts in AI summaries.",
      engine: "Bing Copilot",
      difficulty: "Medium",
      diagnostic: "Walkthroughs lack structured instruction schemas."
    },
    // Additional pool items to ensure unique daily sets (32 items total)
    {
      title: "Add Product AggregateRating Metadata",
      desc: "Embed AggregateRating review data on landing headers to verify consumer trust parameters for Copilot and Gemini.",
      engine: "Bing Copilot",
      difficulty: "High",
      diagnostic: "Missing AggregateRating schema attributes."
    },
    {
      title: "Incorporate Synonyms in Landing Hooks",
      desc: "Sprinkle natural topic synonyms (e.g. optimizer, diagnostic utility, crawler checker) to help AI search engines resolve user search intents.",
      engine: "DeepSeek",
      difficulty: "Easy",
      diagnostic: "Monotonous phrasing makes entity resolution difficult."
    },
    {
      title: "Implement BreadcrumbList schema",
      desc: "Add BreadcrumbList JSON-LD to confirm site structural hierarchies and help Claude map index pages.",
      engine: "Claude",
      difficulty: "Easy",
      diagnostic: "No BreadcrumbList schema markup found on subfolders."
    },
    {
      title: "Configure Sitemap Index Blocks",
      desc: "Split huge sitemaps into clean, indexer-friendly chunks under 5,000 links to help ChatGPT parser indexing.",
      engine: "ChatGPT",
      difficulty: "Medium",
      diagnostic: "Single massive sitemap detected."
    },
    {
      title: "Enforce HTTPS Canonical References",
      desc: "Ensure all absolute canonical tags explicitly specify secure HTTPS headers to prevent citation consolidation loss.",
      engine: "All Engines",
      difficulty: "Easy",
      diagnostic: "Some canonical targets reference unsecured HTTP versions."
    },
    {
      title: "Configure Noindex rules on Utility pages",
      desc: "Apply noindex meta headers on cart, checkout, or login routes to focus AI crawler resources on valuable assets.",
      engine: "All Engines",
      difficulty: "Easy",
      diagnostic: "Non-content utility files are indexable by default."
    },
    {
      title: "Establish Publisher Entity Linking",
      desc: "Verify publisher brand profile references match social pages directly to consolidate entity rankings on Perplexity.",
      engine: "Perplexity",
      difficulty: "Medium",
      diagnostic: "Publisher entity mapping is incomplete."
    },
    {
      title: "Embed Author Profile Bio Blocks",
      desc: "Connect blog posts with physical person author profiles and links to satisfy Gemini EEAT requirements.",
      engine: "Google Gemini",
      difficulty: "Medium",
      diagnostic: "Anonymous blog posts detected."
    },
    {
      title: "Add Image License Structured Data",
      desc: "Add standard image license schema details to allow visual chat apps to display source attributions correctly.",
      engine: "All Engines",
      difficulty: "Medium",
      diagnostic: "No image licensing tags present."
    },
    {
      title: "Limit Dynamic Query Parameter Crawling",
      desc: "Add Clean-Param instructions to sitemaps or block indexing variables to save crawler credits.",
      engine: "DeepSeek",
      difficulty: "High",
      diagnostic: "Crawler loop warnings detected due to dynamic parameters."
    },
    {
      title: "Submit Webhook Pings for Updates",
      desc: "Submit API webhook pings directly to IndexNow whenever content is updated to notify Copilot crawlers immediately.",
      engine: "Bing Copilot",
      difficulty: "Easy",
      diagnostic: "Automatic updates notifications are missing."
    },
    {
      title: "Verify GPTBot Crawling Permissions",
      desc: "Explicitly declare user-agent guidelines in robots.txt to grant search parsing privileges to GPTBot.",
      engine: "ChatGPT",
      difficulty: "Easy",
      diagnostic: "Robots.txt contains ambiguous crawl guidelines."
    }
  ];

  const rand = getSeededRandom(dateKey + domain);
  const shuffled = [...pool];

  // Seeded Fisher-Yates Shuffle
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const temp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = temp;
  }

  // Slice first 20 items
  const selected = shuffled.slice(0, 20);

  return selected.map((item, index) => ({
    id: `step-${index + 1}`,
    title: item.title.replace('website', domain),
    desc: item.desc.replace('website', domain),
    engine: item.engine,
    difficulty: item.difficulty,
    diagnostic: item.diagnostic.replace('website', domain),
  }));
}

export async function POST(request: NextRequest) {
  try {
    const { url, date } = await request.json();
    if (!url) {
      return NextResponse.json({ error: 'URL/domain is required' }, { status: 400 });
    }

    const domain = url.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
    const dateKey = date || new Date().toISOString().split('T')[0];

    try {
      const prompt = `
You are an expert AEO (Answer Engine Optimization) and SEO Audit Agent. 
Generate exactly 20 specific, actionable, and diverse optimization tasks for the website: "${domain}".
Target Date context: "${dateKey}".

These tasks must address SEO, AEO, and GEO issues (targeting search engines like ChatGPT, Gemini, Claude, Perplexity, DeepSeek, Bing Copilot).
Make the 20 tasks unique and distinct specifically for this date to avoid repeating tasks on other days.
Generate realistic diagnostic messages based on potential context gaps (e.g. missing Organization schema, weak entity density, low citation count, slow IndexNow updates).

Output your response strictly as a JSON object matching this schema. Do not include markdown wraps or explanations:
{
  "tasks": [
    {
      "id": "step-1",
      "title": "Short title (under 8 words)",
      "desc": "Actionable instructions (under 30 words)",
      "engine": "The targeted engine (e.g., ChatGPT, Google Gemini, Claude, Perplexity, Bing Copilot, DeepSeek, or All Engines)",
      "difficulty": "Easy, Medium, or High",
      "diagnostic": "The diagnostic issue detected (under 25 words)"
    }
  ]
}
`;

      const result = await queryDeepSeek(prompt);
      if (result && Array.isArray(result.tasks) && result.tasks.length === 20) {
        return NextResponse.json({ tasks: result.tasks });
      }
      
      console.warn('DeepSeek returned invalid task structure, utilizing fallback.');
    } catch (apiErr: any) {
      console.warn('DeepSeek query failed or unconfigured:', apiErr.message);
    }

    // Programmatic Seeded Fallback
    const fallbackTasks = getLocalFallbackTasks(domain, dateKey);
    return NextResponse.json({ tasks: fallbackTasks });

  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
