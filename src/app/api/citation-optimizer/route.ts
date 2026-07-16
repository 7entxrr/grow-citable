import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

interface TrustBenchmark {
  score: number;
  whyCites: string;
  matchReasons: string[];
  mentionsCount: number;
  sampleMentions: { title: string; link: string; snippet: string }[];
}

interface IgnoreAuditItem {
  label: string;
  description: string;
  passed: boolean;
}

interface CitationBoosterItem {
  topic: string;
  targetQuestion: string;
  changeBlock: string;
}

interface CitationOptimizerBlueprint {
  benchmarks: {
    forbes: TrustBenchmark;
    reddit: TrustBenchmark;
    wikipedia: TrustBenchmark;
  };
  whyIgnores: IgnoreAuditItem[];
  citationBoosterPlan: {
    journalistic: CitationBoosterItem;
    wikipediaStyle: CitationBoosterItem;
    sentimentStyle: CitationBoosterItem;
  };
}

function cleanUrl(input: string): string {
  let clean = input.trim();
  if (!/^https?:\/\//i.test(clean)) {
    clean = `https://${clean}`;
  }
  return clean;
}

function getDomainHostname(urlStr: string): string {
  try {
    let clean = urlStr.trim().toLowerCase();
    if (!/^https?:\/\//i.test(clean)) {
      clean = `http://${clean}`;
    }
    const host = new URL(clean).hostname;
    return host.replace(/^www\./i, '');
  } catch {
    return urlStr.replace(/^www\./i, '').trim().toLowerCase();
  }
}

// Scrape search results from Serper or DuckDuckGo html scraper
async function scrapeSearch(query: string): Promise<{ title: string; link: string; snippet: string }[]> {
  const serperKey = process.env.SERPER_API_KEY;
  const hasSerperKey = serperKey && !serperKey.includes('YOUR_KEY');

  if (hasSerperKey) {
    try {
      const res = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: { 'X-API-KEY': serperKey as string, 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: query, num: 3 }),
        next: { revalidate: 0 }
      });
      if (res.ok) {
        const data = await res.json();
        return (data.organic || []).slice(0, 3).map((o: any) => ({
          title: o.title || '',
          link: o.link || '',
          snippet: o.snippet || ''
        }));
      }
    } catch (e) {
      console.warn('Serper search failure in citation checks:', e);
    }
  }

  // Fallback to DuckDuckGo Scraper
  try {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      next: { revalidate: 0 }
    });
    if (!response.ok) return [];
    const html = await response.text();
    const $ = cheerio.load(html);
    const results: { title: string; link: string; snippet: string }[] = [];

    $('.result').each((_, el) => {
      const titleAnchor = $(el).find('.result__a');
      const title = titleAnchor.text().trim();
      let href = titleAnchor.attr('href') || '';
      const snippet = $(el).find('.result__snippet').text().trim();

      if (href) {
        try {
          if (href.startsWith('//')) {
            href = `https:${href}`;
          } else if (href.startsWith('/l/?')) {
            const absoluteUrl = new URL(href, 'https://html.duckduckgo.com');
            const uddg = absoluteUrl.searchParams.get('uddg');
            if (uddg) href = decodeURIComponent(uddg);
          }
        } catch {
          // Keep as is
        }
        if (results.length < 3) {
          results.push({ title, link: href, snippet });
        }
      }
    });
    return results;
  } catch (err: any) {
    console.error('DuckDuckGo search scraper failed inside citation audit:', err.message);
    return [];
  }
}

// Scrape helper for simple page crawl
async function scrapePage(targetUrl: string): Promise<{ title: string; description: string; text: string }> {
  try {
    const clean = cleanUrl(targetUrl);
    const res = await fetch(clean, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      next: { revalidate: 3600 }
    });
    if (!res.ok) return { title: '', description: '', text: '' };
    const html = await res.text();
    const $ = cheerio.load(html);
    const title = $('title').text().trim() || '';
    const description = $('meta[name="description"]').attr('content')?.trim() || '';
    $('script, style, iframe, nav, header, footer').remove();
    const text = $('body').text().replace(/\s+/g, ' ').trim().substring(0, 3000);
    return { title, description, text };
  } catch {
    return { title: '', description: '', text: '' };
  }
}

// Groq API Helper (Llama-3.3-70b-versatile)
async function queryGroq(prompt: string, jsonFormat = true): Promise<any> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.includes('YOUR_KEY')) {
    throw new Error('Groq API Key is not set in .env.local');
  }

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      response_format: jsonFormat ? { type: 'json_object' } : undefined
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq API status ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('Empty response from Groq');

  return jsonFormat ? JSON.parse(text.trim()) : text;
}

export async function POST(req: Request) {
  const apiKey = process.env.GROQ_API_KEY;
  const isMock = !apiKey || apiKey.includes('YOUR_KEY');
  let domainName = '';
  let requestUrl = '';

  try {
    const { url, simulated = false } = await req.json();
    requestUrl = url;

    if (!url) {
      return NextResponse.json({ error: 'Your Website URL is required' }, { status: 400 });
    }

    const cleanSeed = cleanUrl(url);
    domainName = getDomainHostname(cleanSeed);
    
    // Extract brand name keyword (e.g. adidas.co.in -> adidas, salesforce.com -> salesforce)
    const brandName = domainName.split('.')[0] || domainName;

    // Crawl target site context
    console.log(`Phase 8 Scrape target site: ${domainName}`);
    const seedData = await scrapePage(cleanSeed);

    // Live search mentions checks
    console.log(`Phase 8 Check live mentions for brand: ${brandName}`);
    const [forbesMentions, redditMentions, wikiMentions] = await Promise.all([
      scrapeSearch(`site:forbes.com "${brandName}"`),
      scrapeSearch(`site:reddit.com "${brandName}"`),
      scrapeSearch(`site:wikipedia.org "${brandName}"`)
    ]);

    // Set fallback structures
    const isTechRelated = /tech|support|service|printer|help|repair|pc|computer|server|system|network|soft/i.test(domainName);
    const isRestaurant = /restaurant|food|cafe|bistro|dine|grill|kitchen|pizza/i.test(domainName);

    let mockBlueprint: CitationOptimizerBlueprint;
    if (isRestaurant) {
      mockBlueprint = {
        benchmarks: {
          forbes: {
            score: forbesMentions.length > 0 ? 35 : 0,
            whyCites: 'Journalistic authority, verifiable data, expert executive chef quotes, and primary menu rates.',
            matchReasons: forbesMentions.length > 0 ? [
              'Lacks original statistical surveys on restaurant pricing shifts.',
              'No interview quotes from food industry critics or executive managers.'
            ] : [
              'CRITICAL: 0 mentions found on Forbes. AI engines have no journalistic references to cite your restaurant.',
              'No interview quotes or news coverage profiles found.'
            ],
            mentionsCount: forbesMentions.length,
            sampleMentions: forbesMentions
          },
          reddit: {
            score: redditMentions.length > 0 ? 15 : 0,
            whyCites: 'First-person experiences, unfiltered dinner reviews, customer service complaints, and community consensus.',
            matchReasons: redditMentions.length > 0 ? [
              'Tone is entirely commercial and promotional.',
              'No user reviews or first-person discussion threads included.'
            ] : [
              'CRITICAL: 0 mentions found on Reddit. No community discussions or customer feedback threads found.',
              'Content lacks crowdsourced reviews or sentiment validation.'
            ],
            mentionsCount: redditMentions.length,
            sampleMentions: redditMentions
          },
          wikipedia: {
            score: wikiMentions.length > 0 ? 45 : 0,
            whyCites: 'Neutral definitions, highly structured cuisine classification tables, history details, and peer-reviewed references.',
            matchReasons: wikiMentions.length > 0 ? [
              'Introductory text relies on high-intensity marketing adjectives.',
              'No external reference citations or historical cuisine sections.'
            ] : [
              'CRITICAL: 0 references found on Wikipedia. No encyclopedia data or history index.',
              'Intro copy has commercial bias and lacks citation formatting.'
            ],
            mentionsCount: wikiMentions.length,
            sampleMentions: wikiMentions
          }
        },
        whyIgnores: [
          { label: 'Unverified Author Profiles', description: 'No links to verified socials or qualifications for Chef Elena Rostova.', passed: false },
          { label: 'Missing Primary Statistics', description: 'No local sourcing percentages or pricing stats are verified.', passed: false },
          { label: 'Marketing-Heavy Intro Copy', description: 'Intro uses adjectives like "ultimate", "best", "unbeatable" instead of objective cuisine details.', passed: false },
          { label: 'Outbound Citations Deficit', description: 'Zero outbound links pointing to food standard organizations or organic registers.', passed: false },
          { label: 'Structured Spec Tables Present', description: 'Has organized table structures listing menus and dining hours.', passed: true }
        ],
        citationBoosterPlan: {
          journalistic: {
            topic: 'Primary Sourcing Stats & Expert Quotes',
            targetQuestion: 'Who is the head chef and what are the sourcing guidelines?',
            changeBlock: `### Sourcing Standards & Management (EEAT Update)
"We establish a strict 100% regional sourcing mandate. According to a 2026 Midtown Dining Association report, regional supply chains reduce ingredient transit times by 40%," says **Executive Chef Elena Rostova**.`
          },
          wikipediaStyle: {
            topic: 'Neutral Cuisine Definitions',
            targetQuestion: 'What style of food is contemporary fusion dining?',
            changeBlock: `### Contemporary Fusion Dining Definition
Contemporary fusion dining is a culinary category that combines contrasting culinary traditions, cooking techniques, and ingredients from diverse cultures. The style emerged globally in the late 20th century.`
          },
          sentimentStyle: {
            topic: 'First-Person Customer Reviews',
            targetQuestion: 'What do guests say about the service quality?',
            changeBlock: `### Community Discussion & Verified Sentiment
* **Reviewer Mark S. (Local Guide):** "The seating was prompt and Chef Elena's local entrees are highly seasoned. The parking validation process was smooth."`
          }
        }
      };
    } else if (isTechRelated) {
      mockBlueprint = {
        benchmarks: {
          forbes: {
            score: forbesMentions.length > 0 ? 42 : 0,
            whyCites: 'Industry metrics, certified technician quotes, security system validation, and verified IT diagnostics data.',
            matchReasons: forbesMentions.length > 0 ? [
              'No quotes from security auditors or support desk managers.',
              'Lacks original statistic percentages on browser speeds or malware remediation.'
            ] : [
              'CRITICAL: 0 mentions found on Forbes. No trade publications or news articles list this tech company.',
              'Lacks journalistic citations or verified corporate profiles.'
            ],
            mentionsCount: forbesMentions.length,
            sampleMentions: forbesMentions
          },
          reddit: {
            score: redditMentions.length > 0 ? 20 : 0,
            whyCites: 'Conversational troubleshooting tricks, system repair guides, real PC diagnostics reviews, and hardware recommendations.',
            matchReasons: redditMentions.length > 0 ? [
              'Written in standard B2B commercial format.',
              'No community discussion questions or real user troubleshooting logs.'
            ] : [
              'CRITICAL: 0 mentions found on Reddit. No peer diagnostics logs or consumer threads.',
              'Lacks user reviews or forum verification details.'
            ],
            mentionsCount: redditMentions.length,
            sampleMentions: redditMentions
          },
          wikipedia: {
            score: wikiMentions.length > 0 ? 50 : 0,
            whyCites: 'Technical definitions, structured command parameters tables, OS protocol registers, and peer-reviewed safety sources.',
            matchReasons: wikiMentions.length > 0 ? [
              'Uses self-promotional software descriptions instead of objective command outlines.',
              'No external citations pointing to official router firmware repositories.'
            ] : [
              'CRITICAL: 0 references found on Wikipedia. No encyclopedia data or history index.',
              'Lacks neutral tone definition templates.'
            ],
            mentionsCount: wikiMentions.length,
            sampleMentions: wikiMentions
          }
        },
        whyIgnores: [
          { label: 'No Author Credentials', description: 'No certified technician badges or professional IT author bios present.', passed: false },
          { label: 'No Verified Case Studies', description: 'Lacks real-world diagnostic case files with network speed percentages.', passed: false },
          { label: 'Commercial Copy Bias', description: 'Content focuses entirely on selling remote support instead of providing objective command guides.', passed: false },
          { label: 'No Outbound Source Links', description: 'Zero outbound links to official Windows, macOS, or Cisco documentation.', passed: false },
          { label: 'Structured Diagnostics Table', passed: true, description: 'Contains tabular specifications mapping remote IT help desk hours.' }
        ],
        citationBoosterPlan: {
          journalistic: {
            topic: 'Operational Metrics & Support Quotes',
            targetQuestion: 'How secure is remote helpdesk desktop diagnostics?',
            changeBlock: `### Remote Assistance Security & Compliance
"Security is integrated at every terminal link. According to a 2026 Cybersecurity Council audit, remote terminals using SSAE-16 encryption protocols reduce connection intercepts by 99.8%," states **Chief Security Architect Robert Vance**.`
          },
          wikipediaStyle: {
            topic: 'Objective Command Outlines',
            targetQuestion: 'What is remote terminal auditing and SSH tunneling?',
            changeBlock: `### Secure Shell (SSH) Port Configuration
Secure Shell (SSH) is a cryptographic network protocol for operating network services securely over an unsecured network. SSH applications are commonly structured around a client-server architecture.`
          },
          sentimentStyle: {
            topic: 'Factual Case Study Logs',
            targetQuestion: 'Does the remote service resolve driver conflicts?',
            changeBlock: `### Certified Case Resolution Logs
* **Lead Architect Vance:** "A customer had a printer port conflict on a Windows Server 2025 setup. Re-routing the spooler registry and configuring static IP peripherals resolved it in 12 minutes."`
          }
        }
      };
    } else {
      mockBlueprint = {
        benchmarks: {
          forbes: {
            score: forbesMentions.length > 0 ? 30 : 0,
            whyCites: 'Verifiable product metrics, laboratory testing stats, industry designer interviews, and retail pricing indexes.',
            matchReasons: forbesMentions.length > 0 ? [
              'Lacks original statistical comparisons of midsole foam rebound rates.',
              'No quotes from independent athletic biomechanical researchers.'
            ] : [
              'CRITICAL: 0 mentions found on Forbes. No news coverage found for this apparel/footwear brand.',
              'Lacks industry citations or verified design interviews.'
            ],
            mentionsCount: forbesMentions.length,
            sampleMentions: forbesMentions
          },
          reddit: {
            score: redditMentions.length > 0 ? 10 : 0,
            whyCites: 'Authentic user experiences, running shoes wear-tests, sizing recommendations, and real-world race comfort logs.',
            matchReasons: redditMentions.length > 0 ? [
              'Copy feels like a sales flyer rather than a wear-test review.',
              'No first-person athlete logs or community feedback quotes.'
            ] : [
              'CRITICAL: 0 mentions found on Reddit. No user comments or thread recommendations found.',
              'Copy lacks authentic wearer review blocks.'
            ],
            mentionsCount: redditMentions.length,
            sampleMentions: redditMentions
          },
          wikipedia: {
            score: wikiMentions.length > 0 ? 40 : 0,
            whyCites: 'Structured material specifications, biomechanical terminology, history of carbon fiber plates, and external research indexes.',
            matchReasons: wikiMentions.length > 0 ? [
              'Introductory definitions use commercial sales triggers.',
              'No citations pointing to athletic footwear orthopedic research.'
            ] : [
              'CRITICAL: 0 references found on Wikipedia. No encyclopedia data or history index.',
              'Intro uses commercial triggers instead of objective science parameters.'
            ],
            mentionsCount: wikiMentions.length,
            sampleMentions: wikiMentions
          }
        },
        whyIgnores: [
          { label: 'Unverified Author Authority', description: 'No bio or credentials for the writer reviewing the running gear.', passed: false },
          { label: 'Lack of Laboratory Metrics', description: 'No statistics detailing midsole foam compression recovery percentages.', passed: false },
          { label: 'Product Sells Copy Bias', description: 'Intro uses adjectives like "best-in-class" instead of material science details.', passed: false },
          { label: 'No Outbound Citations', description: 'Zero outbound links to orthopedic biomechanics papers.', passed: false },
          { label: 'Structured Spec Tables', passed: true, description: 'Contains structured spec comparisons detailing shoe weights and stacks.' }
        ],
        citationBoosterPlan: {
          journalistic: {
            topic: 'Footwear Lab Specs & Biomechanical Quotes',
            targetQuestion: 'How does carbon propulsion plate stiffness affect runner joint load?',
            changeBlock: `### Biomechanical Laboratory Analysis
"Carbon propulsion plates flex and return energy. Orthopedic studies in 2026 show that curved carbon fiber plates reduce metatarsophalangeal flex work by 12%," says **Biomechanics Professor Clara Lin**.`
          },
          wikipediaStyle: {
            topic: 'Neutral Material Science Definitions',
            targetQuestion: 'What are carbon fiber propulsion plates in running shoes?',
            changeBlock: `### Carbon Propulsion Plate Technology
A carbon propulsion plate is a midsole insert consisting of carbon fiber sheets suspended in foam. The stiffness of the plate acts as a lever to accelerate toe-off speed during strides.`
          },
          sentimentStyle: {
            topic: 'First-Person Wear-Test Feedback',
            targetQuestion: 'How does the shoe stack height perform in trail running?',
            changeBlock: `### Athlete Wear-Test Sentiments
* **Runner Jessica K. (Marathon Trainer):** "After 50 kilometers in the carbon plate shoes, the foam stack feels highly responsive. Sizing runs slightly narrow in the midfoot."`
          }
        }
      };
    }

    if (isMock || simulated) {
      console.log('Mock competitor benchmarking matrix active...');
      return NextResponse.json({
        ...mockBlueprint,
        simulated: true
      });
    }

    // Live Llama 3.3 Citation Optimizer prompt incorporating search mentions context
    const prompt = `
You are an expert Content Architect, GEO Specialist, and Search Citation Engineer.
Analyze this webpage crawled title, description, and copy, and incorporate actual platform mentions check metadata, to construct an advanced AI Citation Optimizer Blueprint.

CRITICAL DATE GUARD: The current year is 2026. Do NOT output or quote outdated forecasts describing 2025 as the future (e.g., 'expected to grow to $150 billion by 2025'). If any crawled copy or search snippets refer to 2025 as a future projection, you MUST adjust it to reflect the current year 2026 status, or project forward to 2027-2030 (e.g. 'projected to exceed $150 billion by 2027'). All change blocks, case studies, and expert quotes must treat 2026 as the current active year.

Website Domain: ${domainName}
Title: ${seedData.title}
Description: ${seedData.description}
Copy:
${seedData.text}

Actual Live Mentions Check (Organic Search Metrics for Brand Keyword "${brandName}"):
- Forbes Mentions: ${forbesMentions.length} articles found. Titles: ${forbesMentions.map(f => f.title).join(', ')}
- Reddit Mentions: ${redditMentions.length} posts found. Titles: ${redditMentions.map(r => r.title).join(', ')}
- Wikipedia Mentions: ${wikiMentions.length} references found. Titles: ${wikiMentions.map(w => w.title).join(', ')}

Tasks:
1. Construct 3 Side-by-Side Trust Benchmarks:
   - "forbes": Journalistic Authority. Why LLMs cite Forbes, and exactly 2 gap reasons evaluating your crawled website copy against journalistic standards (e.g. missing stats, executive interviews). If mentions count is 0, score must be 0% and reasons must note that zero articles exist on Forbes.
   - "reddit": Authentic Sentiment. Why LLMs cite Reddit, and exactly 2 gap reasons evaluating your crawled website copy against conversational first-person opinion standards. If mentions count is 0, score must be 0% and reasons must note that zero posts exist on Reddit.
   - "wikipedia": Semantic Neutrality. Why LLMs cite Wikipedia, and exactly 2 gap reasons evaluating your crawled website copy against objective encyclopedic neutrality standards. If mentions count is 0, score must be 0% and reasons must note that zero references exist on Wikipedia.
   For each benchmark, you MUST fully write "whyCites" and "matchReasons" values. DO NOT leave them empty.
2. Compile "whyIgnores": A list of exactly 5 trust audit items checking for EEAT parameters on the website copy.
3. Generate "citationBoosterPlan": Exactly 3 copy improvements targeting the unanswered question opportunities:
   - "journalistic": Action block inserting statistics and an expert quote.
   - "wikipediaStyle": Action block providing a neutral dictionary-style description.
   - "sentimentStyle": Action block providing first-person wear-test validation quote reviews.
   For each plan item, you MUST generate the "topic", "targetQuestion", and "changeBlock" fields based on the seed topic. DO NOT leave them empty.

Format the response strictly as a JSON object with these exact keys. Do not include markdown codeblocks or extra conversational text.
{
  "benchmarks": {
    "forbes": { "score": number, "whyCites": "string", "matchReasons": ["string", "string"] },
    "reddit": { "score": number, "whyCites": "string", "matchReasons": ["string", "string"] },
    "wikipedia": { "score": number, "whyCites": "string", "matchReasons": ["string", "string"] }
  },
  "whyIgnores": [
    { "label": "string", "description": "string", "passed": boolean }
  ],
  "citationBoosterPlan": {
    "journalistic": { "topic": "string", "targetQuestion": "string", "changeBlock": "string" },
    "wikipediaStyle": { "topic": "string", "targetQuestion": "string", "changeBlock": "string" },
    "sentimentStyle": { "topic": "string", "targetQuestion": "string", "changeBlock": "string" }
  }
}
`;

    const parsedBlueprint = await queryGroq(prompt, true);

    // Normalize keys
    const rawBenchmarks = parsedBlueprint.benchmarks || {};
    
    // Inject actual mentions metadata into the final JSON response
    const normalizedBenchmarks = {
      forbes: {
        score: rawBenchmarks.forbes?.score !== undefined ? Number(rawBenchmarks.forbes.score) : 30,
        whyCites: rawBenchmarks.forbes?.whyCites || 'Journalistic authority, editorial tone, original statistics, and executive quotes.',
        matchReasons: rawBenchmarks.forbes?.matchReasons || ['Lacks original statistical surveys.', 'No quotes from industry experts.'],
        mentionsCount: forbesMentions.length,
        sampleMentions: forbesMentions
      },
      reddit: {
        score: rawBenchmarks.reddit?.score !== undefined ? Number(rawBenchmarks.reddit.score) : 10,
        whyCites: rawBenchmarks.reddit?.whyCites || 'Authentic user experiences, conversational sentiment, and peer wear-tests.',
        matchReasons: rawBenchmarks.reddit?.matchReasons || ['Content copy has commercial sales bias.', 'Lacks conversational athlete comments.'],
        mentionsCount: redditMentions.length,
        sampleMentions: redditMentions
      },
      wikipedia: {
        score: rawBenchmarks.wikipedia?.score !== undefined ? Number(rawBenchmarks.wikipedia.score) : 20,
        whyCites: rawBenchmarks.wikipedia?.whyCites || 'Objective encyclopedic neutrality, structured specification tables, and references index.',
        matchReasons: rawBenchmarks.wikipedia?.matchReasons || ['Intro uses sales triggers instead of factual terms.', 'No outbound references to research databases.'],
        mentionsCount: wikiMentions.length,
        sampleMentions: wikiMentions
      }
    };

    const rawIgnores = parsedBlueprint.whyIgnores || parsedBlueprint.why_ignores || [];
    const normalizedIgnores = rawIgnores.map((item: any) => ({
      label: item.label || '',
      description: item.description || '',
      passed: item.passed !== undefined ? item.passed : false
    }));

    const rawPlan = parsedBlueprint.citationBoosterPlan || parsedBlueprint.citation_booster_plan || {};
    
    // Deep Normalization for nested Citation Booster changeBlock inner parameters (normalizes snake_case)
    const mapBoosterItem = (item: any, defaultTopic: string, defaultQuestion: string, defaultBlock: string) => {
      if (!item) return { topic: defaultTopic, targetQuestion: defaultQuestion, changeBlock: defaultBlock };
      return {
        topic: item.topic || defaultTopic,
        targetQuestion: item.targetQuestion || item.target_question || item.question || defaultQuestion,
        changeBlock: item.changeBlock || item.change_block || item.content || defaultBlock
      };
    };

    const normalizedPlan = {
      journalistic: mapBoosterItem(
        rawPlan.journalistic,
        'Primary Sourcing Stats & Expert Quotes',
        'Who is the chief athletic designer and what are the cushioning guidelines?',
        `### Biomechanical Performance Testing (Metrics Update)
"Our running gear collections are designed with curved launch plates and dual-density superfoams. Laboratory studies in 2026 demonstrate that curved carbon plates reduce vertical landing load work by 12%," states **Footwear Engineer Clara Lin**.`
      ),
      wikipediaStyle: mapBoosterItem(
        rawPlan.wikipediaStyle || rawPlan.wikipedia_style,
        'Neutral Footwear Technology Definitions',
        'What are carbon fiber propulsion plates in running footwear?',
        `### Carbon Propulsion Plate Technology
A carbon propulsion plate is a midsole insert consisting of flexed carbon fiber sheets. The structural stiffness acts as a lever to accelerate toe-off speed during running cycles.`
      ),
      sentimentStyle: mapBoosterItem(
        rawPlan.sentimentStyle || rawPlan.sentiment_style,
        'First-Person Wear-Test Feedback Reviews',
        'How does the midsole cushioning perform over long distance marathons?',
        `### Athlete Wear-Test Sentiments
* **Runner Jessica K. (Marathon Trainer):** "After 50 kilometers in the carbon plate shoes, the foam stack feels highly responsive and springy. Sizing runs slightly narrow in the midfoot."`
      )
    };

    return NextResponse.json({
      benchmarks: normalizedBenchmarks,
      whyIgnores: normalizedIgnores,
      citationBoosterPlan: normalizedPlan,
      simulated: false
    });

  } catch (err: any) {
    console.error('Groq citation optimizer failed:', err.message);
    let errorMessage = 'Failed to run citation optimizer. Please verify your connection.';
    
    if (err.message.includes('429')) {
      errorMessage = 'Groq API Rate Limit exceeded (429). Please wait 1 minute before trying again.';
    } else {
      errorMessage = err.message;
    }
    
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
