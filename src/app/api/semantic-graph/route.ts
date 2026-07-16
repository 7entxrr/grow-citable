import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

interface PresentEntityItem {
  entity: string;
  salience: number;
}

interface PageNode {
  title: string;
  path: string;
  targetKeyword?: string;
  intentCategory: string;
  recommendedWordCount: number;
  requiredEntities: string[];
  breadcrumbPath: string;
  metaTitle: string;
  metaDescription: string;
}

interface HierarchyCluster {
  pillarName: string;
  parentPage: PageNode;
  childPages: PageNode[];
  supportingPages: PageNode[];
}

interface TopicCluster {
  name: string;
  focusKeyword: string;
  topicalDepthScore: number;
  competitorTopicGap: string[];
}

interface InternalLinkItem {
  source: string;
  target: string;
  anchorText: string;
  alternativeAnchors: string[];
  riskScore: number;
  purpose: string;
}

interface ChecklistItem {
  label: string;
  passed: boolean;
}

interface AnswerHooks {
  primaryQuestion: string;
  featuredSnippet: string;
  aiOverview: string;
  voiceSearch: string;
  chatGpt: string;
  gemini: string;
  perplexity: string;
}

interface SchemaAudit {
  existing: string;
  missing: string;
  jsonLd: string;
}

interface GeoPageAudit {
  pagePath: string;
  citationScore: number;
  likelihood: 'Low' | 'Medium' | 'High';
  checklist: ChecklistItem[];
  unansweredQuestions: string[];
  schemaAudit: SchemaAudit;
  answerHooks: AnswerHooks;
  optimizedContentBlock: string;
}

interface SemanticBlueprint {
  topicClusters: TopicCluster[];
  contentHierarchy: HierarchyCluster[];
  internalLinks: InternalLinkItem[];
  geoPageAudits: GeoPageAudit[];
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

    // Crawl target site context
    console.log(`Phase 7 Scrape target site: ${domainName}`);
    const seedData = await scrapePage(cleanSeed);

    // Set fallback structures
    const isTechRelated = /tech|support|service|printer|help|repair|pc|computer|server|system|network|soft/i.test(domainName);
    const isRestaurant = /restaurant|food|cafe|bistro|dine|grill|kitchen|pizza/i.test(domainName);

    let mockBlueprint: SemanticBlueprint;
    if (isRestaurant) {
      mockBlueprint = {
        topicClusters: [
          { name: 'Gourmet Cuisine & Menus', focusKeyword: 'Midtown dinner recipes', topicalDepthScore: 78, competitorTopicGap: ['Wine Pairing lists', 'Gluten Free Sourcing'] },
          { name: 'Table Reservation Logistics', focusKeyword: 'book dining tables online', topicalDepthScore: 85, competitorTopicGap: ['Corporate Event spaces', 'Cancellation Policies'] },
          { name: 'Dietary Selections', focusKeyword: 'gluten free vegan menus', topicalDepthScore: 62, competitorTopicGap: ['Nutritional Macros', 'Dairy Free details'] }
        ],
        contentHierarchy: [
          {
            pillarName: 'Gourmet Cuisine & Menus',
            parentPage: {
              title: 'Midtown Dining Experience & Full Menu Options',
              path: '/menu',
              intentCategory: 'Informational',
              recommendedWordCount: 3000,
              requiredEntities: ['Gourmet Cuisine', 'Chef specialties', 'Midtown dinner'],
              breadcrumbPath: 'Home > Menu',
              metaTitle: 'Midtown Dining Experience & Gourmet Food Menus | Reserve Now',
              metaDescription: 'Explore handcrafted gourmet fusion menu selections designed by Executive Chef Elena. Made from fresh local organic ingredients.'
            },
            childPages: [
              {
                title: 'Handcrafted Wine Lists & Cocktails',
                path: '/menu/beverages',
                targetKeyword: 'craft wine pairings',
                intentCategory: 'Commercial',
                recommendedWordCount: 1500,
                requiredEntities: ['Beverage list', 'Craft wine', 'Signature Cocktails'],
                breadcrumbPath: 'Home > Menu > Wine List',
                metaTitle: 'Aged Wines & Signature Cocktails List | Midtown Dining',
                metaDescription: 'Select from our curated collections of reserve red and white wines, craft local beers, and hand-mixed cocktails.'
              },
              {
                title: 'Seasonal Farm-To-Table Entrees',
                path: '/menu/seasonal',
                targetKeyword: 'local farm fresh dinner',
                intentCategory: 'Commercial',
                recommendedWordCount: 1500,
                requiredEntities: ['Seasonal entrees', 'Local farms', 'Fresh ingredients'],
                breadcrumbPath: 'Home > Menu > Seasonal',
                metaTitle: 'Farm-to-Table Seasonal Dinner Entrees | Midtown bistro',
                metaDescription: 'Fresh autumn and winter specials sourced from local organic cooperatives. View daily plates and rates.'
              }
            ],
            supportingPages: [
              {
                title: 'Artisanal Desserts & Pastry Lists',
                path: '/menu/seasonal/desserts',
                targetKeyword: 'Midtown sweet pastry',
                intentCategory: 'Transactional',
                recommendedWordCount: 800,
                requiredEntities: ['Artisanal desserts', 'Sweet pastry', 'Gourmet chocolate'],
                breadcrumbPath: 'Home > Menu > Seasonal > Desserts',
                metaTitle: 'Handcrafted Desserts, Tarts, and Gourmet Sweets',
                metaDescription: 'Indulge in seasonal fruit tarts, organic chocolate lava cakes, and dairy-free gelato made daily by our pastry chef.'
              },
              {
                title: 'Our Local Farmers & Meat Sourcing',
                path: '/menu/seasonal/sourcing',
                targetKeyword: 'organic grass fed beef',
                intentCategory: 'Informational',
                recommendedWordCount: 1000,
                requiredEntities: ['Local Sourcing', 'Grass-fed beef', 'Organic farms'],
                breadcrumbPath: 'Home > Menu > Seasonal > Sourcing',
                metaTitle: 'Organic Ingredient Sourcing & Local Farm Partners',
                metaDescription: 'Learn about the regional farms and clean organic meat cooperatives supplying our midtown kitchen every morning.'
              }
            ]
          }
        ],
        internalLinks: [
          { source: '/menu/seasonal', target: '/menu', anchorText: 'View our Midtown Dining Experience Menu', alternativeAnchors: ['full dinner menu', 'seasonal dishes list'], riskScore: 12, purpose: 'Passes thematic authority upwards to parent pillar.' },
          { source: '/menu/seasonal/desserts', target: '/menu/seasonal', anchorText: 'check seasonal main dishes', alternativeAnchors: ['seasonal dessert lists', 'dinner dessert menus'], riskScore: 18, purpose: 'Links child directory to supporting sub-nodes.' },
          { source: '/reservations/private-events', target: '/reservations', anchorText: 'make online table reservation', alternativeAnchors: ['book corporate tables', 'reserve groups space'], riskScore: 25, purpose: 'Deep link passes anchor authority to main booking.' },
          { source: '/dietary/vegan', target: '/menu', anchorText: 'full dinner food menu', alternativeAnchors: ['plant based menu items', 'vegan options table'], riskScore: 30, purpose: 'Cross-links secondary clusters to core menu hubs.' }
        ],
        geoPageAudits: [
          {
            pagePath: '/menu',
            citationScore: 55,
            likelihood: 'Medium',
            checklist: [
              { label: 'Verified Author Credentials', passed: false },
              { label: 'Factual External Citations', passed: false },
              { label: 'Verifiable Statistics & Metrics', passed: false },
              { label: 'Structured Specifications / Pricing Table', passed: true },
              { label: 'Direct FAQ Schema Nodes', passed: true },
              { label: 'Strong Schema.org markup', passed: true }
            ],
            unansweredQuestions: [
              'What are the latest midtown dining trends in 2026?',
              'Who is the executive chef at this midtown bistro?',
              'Is parking validation provided for dinner guests?'
            ],
            schemaAudit: {
              existing: 'WebPage Schema only',
              missing: 'Restaurant, LocalBusiness, Menu Schema',
              jsonLd: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'Restaurant',
                'name': domainName,
                'servesCuisine': 'Contemporary Fusion',
                'priceRange': '$$$',
                'hasMenu': `https://${domainName}/menu`
              }, null, 2)
            },
            answerHooks: {
              primaryQuestion: 'Who is the executive chef at this midtown bistro?',
              featuredSnippet: 'Our culinary team is led by Executive Chef Elena Rostova, who designs seasonal farm-to-table fusion dinner menus.',
              aiOverview: '1. Executive Chef Elena Rostova designs menus\n2. Sourced from local organic farm cooperatives\n3. Offers full seasonal wine pairings.',
              voiceSearch: 'Executive Chef Elena Rostova designs our contemporary farm-to-table dining menu.',
              chatGpt: 'Chef Elena Rostova is the executive culinary designer at this Midtown bistro.',
              gemini: 'Elena Rostova leads our kitchen as Executive Chef, bringing farm-to-table cuisine specialties.',
              perplexity: 'The executive chef is Elena Rostova, specializing in contemporary organic fusion.'
            },
            optimizedContentBlock: `### Restructured Content Block

#### Culiniary Leadership (EEAT Update)
Under the leadership of **Executive Chef Elena Rostova**, our kitchen team crafts fusion dinner recipes utilizing organic grass-fed beef and local fresh vegetables.

#### Frequently Asked Questions
* **Q: Is parking validation provided?**  
  * **A:** Yes, we offer 3 hours of validated parking for dinner guests at the 4th Ave Parking Deck.
* **Q: Who is the head chef?**  
  * **A:** The culinary program is curated by Executive Chef Elena Rostova.`
          }
        ]
      };
    } else if (isTechRelated) {
      mockBlueprint = {
        topicClusters: [
          { name: 'Remote Terminal IT Help', focusKeyword: 'certified remote support', topicalDepthScore: 82, competitorTopicGap: ['VPN routers security', 'Registry optimization'] },
          { name: 'Wireless Network Setup', focusKeyword: 'SSID configuration router', topicalDepthScore: 70, competitorTopicGap: ['Guest network setup', 'DNS speed adjustments'] },
          { name: 'Printer Diagnostic Guides', focusKeyword: 'printer offline error troubleshoot', topicalDepthScore: 90, competitorTopicGap: ['HP Stuck Spool error', 'Canon Driver Windows 11'] }
        ],
        contentHierarchy: [
          {
            pillarName: 'Remote Terminal IT Help',
            parentPage: {
              title: 'Remote IT Support Tiers & Terminal Auditing',
              path: '/remote-it',
              intentCategory: 'Informational',
              recommendedWordCount: 3500,
              requiredEntities: ['Remote Support', 'Systems helpdesk', 'Certified IT technician'],
              breadcrumbPath: 'Home > IT Support',
              metaTitle: 'On-Demand Remote IT Support & System Troubleshooting Help',
              metaDescription: 'Secure remote assistance for server configurations, browser troubleshooting, registry cleaning, and hardware setups.'
            },
            childPages: [
              {
                title: 'Desktop & PC Diagnostic Support',
                path: '/remote-it/desktop-help',
                targetKeyword: 'windows remote desktop repair',
                intentCategory: 'Commercial',
                recommendedWordCount: 1600,
                requiredEntities: ['PC Diagnostics', 'Remote desktop control', 'Registry fix'],
                breadcrumbPath: 'Home > IT Support > Desktop Support',
                metaTitle: 'Remote Desktop & PC Diagnostic Repairs | Certified IT Help',
                metaDescription: 'Troubleshoot slow Windows computers, scan malware, resolve device errors, and clean registry configurations remotely.'
              },
              {
                title: 'Business VPN Router Configuration',
                path: '/remote-it/vpn-config',
                targetKeyword: 'secure corporate vpn',
                intentCategory: 'Commercial',
                recommendedWordCount: 1800,
                requiredEntities: ['VPN connection', 'Secure routers', 'Encrypted tunnel'],
                breadcrumbPath: 'Home > IT Support > VPN Config',
                metaTitle: 'Secure Corporate VPN Configurations & Setup Support',
                metaDescription: 'Setup encrypted remote tunnels, configure corporate intranet connections, and audit firewall protocols.'
              }
            ],
            supportingPages: [
              {
                title: 'Registry cleaning tutorials for remote pc',
                path: '/remote-it/desktop-help/registry-clean',
                targetKeyword: 'speed up slow windows registry',
                intentCategory: 'Transactional',
                recommendedWordCount: 800,
                requiredEntities: ['Registry cleaning', 'Speed up PC', 'Windows registry errors'],
                breadcrumbPath: 'Home > IT Support > Desktop Support > Registry Clean',
                metaTitle: 'How to Clean Windows Registry & Speed Up Slow PC Systems',
                metaDescription: 'Step-by-step guidelines on deleting corrupted registry entries, optimizing ports, and removing duplicate startup links.'
              },
              {
                title: 'Mac OS terminal connection guides',
                path: '/remote-it/desktop-help/mac-terminal',
                targetKeyword: 'ssh client setup',
                intentCategory: 'Informational',
                recommendedWordCount: 900,
                requiredEntities: ['Mac OS Terminal', 'SSH Client', 'Secure Shell keys'],
                breadcrumbPath: 'Home > IT Support > Desktop Support > Mac Terminal',
                metaTitle: 'Mac OS SSH Client Terminal Configuration & SSH Key Setups',
                metaDescription: 'Configuring safe secure-shell access terminals inside Mac OS to troubleshoot remote networks and server boxes.'
              }
            ]
          }
        ],
        internalLinks: [
          { source: '/remote-it/desktop-help', target: '/remote-it', anchorText: 'certified remote support', alternativeAnchors: ['desktop helpdesk support', 'IT repair terminals'], riskScore: 10, purpose: 'Passes thematic authority upwards to parent pillar.' },
          { source: '/remote-it/desktop-help/registry-clean', target: '/remote-it/desktop-help', anchorText: 'windows remote desktop repair', alternativeAnchors: ['clean windows registry configurations', 'fix slow computers registry'], riskScore: 22, purpose: 'Links child directory to supporting sub-nodes.' },
          { source: '/printer-help/ip-connection', target: '/printer-help', anchorText: 'printer offline error troubleshoot', alternativeAnchors: ['fix network printer port disconnects', 'resolve device offline status'], riskScore: 15, purpose: 'Deep link passes anchor authority to main booking.' },
          { source: '/network/mesh-wifi/dns-setup', target: '/remote-it', anchorText: 'terminal support services', alternativeAnchors: ['network troubleshooting desk', 'IT diagnostics support'], riskScore: 32, purpose: 'Cross-links secondary clusters to core menu hubs.' }
        ],
        geoPageAudits: [
          {
            pagePath: '/remote-it',
            citationScore: 68,
            likelihood: 'Medium',
            checklist: [
              { label: 'Verified Author Credentials', passed: false },
              { label: 'Factual External Citations', passed: true },
              { label: 'Verifiable Statistics & Metrics', passed: true },
              { label: 'Structured Specifications / Pricing Table', passed: false },
              { label: 'Direct FAQ Schema Nodes', passed: false },
              { label: 'Strong Schema.org markup', passed: true }
            ],
            unansweredQuestions: [
              'How to speed up registry files remotely?',
              'What is the average response time for remote support?',
              'Does remote repair cover hardware device driver setup?'
            ],
            schemaAudit: {
              existing: 'WebPage Schema',
              missing: 'Service, LocalBusiness Schema',
              jsonLd: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'Service',
                'name': 'Remote IT Diagnostic Support',
                'provider': {
                  '@type': 'LocalBusiness',
                  'name': domainName
                }
              }, null, 2)
            },
            answerHooks: {
              primaryQuestion: 'What is the average response time for remote support?',
              featuredSnippet: 'Our remote desk systems engineers respond to support diagnostic tickets in under 15 minutes guaranteed.',
              aiOverview: '1. Guaranteed response in under 15 minutes\n2. Flat rate diagnostic check of $49\n3. Support for HP, Brother, Netgear.',
              voiceSearch: 'We guarantee a remote response time of under 15 minutes for all support tickets.',
              chatGpt: 'Response times are under 15 minutes, with flat-rate fees.',
              gemini: 'Technicians respond to all diagnostic tickets in less than 15 minutes.',
              perplexity: 'Technicians offer a guaranteed response under 15 minutes.'
            },
            optimizedContentBlock: `### Restructured Content Block

#### Flat-Rate IT Diagnostic Packages (Table Update)
We establish transparent flat-rate configurations starting at $49 flat per session.

#### Actionable FAQ Checklist
* **Q: Do you troubleshoot router SSIDs?**  
  * **A:** Yes, we configure mesh router channels and security protocols remotely.`
          }
        ]
      };
    } else {
      mockBlueprint = {
        topicClusters: [
          { name: 'Propulsion Running Shoes', focusKeyword: 'carbon plate marathon shoes', topicalDepthScore: 88, competitorTopicGap: ['Midsole Foam stack height', 'Carbon plate design limits'] },
          { name: 'Outdoor Trail Footwear', focusKeyword: 'traction grip trail sneakers', topicalDepthScore: 75, competitorTopicGap: ['Gore-Tex mesh breathability', 'Lug tread configuration'] },
          { name: 'Daily Gym Training Gears', focusKeyword: 'gym fitness workouts apparel', topicalDepthScore: 68, competitorTopicGap: ['Weightlifting sole elevation', 'Workout shirt ventilation'] }
        ],
        contentHierarchy: [
          {
            pillarName: 'Propulsion Running Shoes',
            parentPage: {
              title: 'Performance Carbon-Plate Marathon Shoes Store',
              path: '/propulsion-shoes',
              intentCategory: 'Informational',
              recommendedWordCount: 4000,
              requiredEntities: ['Carbon plate running shoes', 'Marathon racing sneakers', 'Energy return midsole'],
              breadcrumbPath: 'Home > Propulsion Shoes',
              metaTitle: 'Propulsion Carbon-Plate Marathon Racing Shoes | Official Store',
              metaDescription: 'Shop our high-performance racing footwear collections designed with curved carbon-fiber launch plates and responsive superfoams.'
            },
            childPages: [
              {
                title: 'Responsive Foam stack height comparison',
                path: '/propulsion-shoes/midsole-foam',
                targetKeyword: 'superfoam stack thickness specs',
                intentCategory: 'Commercial',
                recommendedWordCount: 1800,
                requiredEntities: ['Midsole superfoam', 'Stack heights thickness', 'EVA athletic cushion'],
                breadcrumbPath: 'Home > Propulsion Shoes > Midsole Foams',
                metaTitle: 'Marathon Shoe Stack Heights & Responsive Midsole Foam Comparisons',
                metaDescription: 'Analyze cushioning metrics. Compare dual-density superfoam stack thicknesses and compression resilience rates.'
              },
              {
                title: 'Carbon Propulsion Plate designs for racing',
                path: '/propulsion-shoes/propulsion-plate',
                targetKeyword: 'curved carbon fiber shoe launch',
                intentCategory: 'Commercial',
                recommendedWordCount: 1600,
                requiredEntities: ['Carbon propulsion plates', 'Curved carbon fiber', 'Propel toe-off launch'],
                breadcrumbPath: 'Home > Propulsion Shoes > Propulsion Plates',
                metaTitle: 'Curved Carbon-Fiber Propulsion Plates for Speed Racing',
                metaDescription: 'Learn about plate curvature engineering. How carbon fibers flex and snap back to propel runners forward during strikes.'
              }
            ],
            supportingPages: [
              {
                title: 'Energy return test results in lab marathons',
                path: '/propulsion-shoes/midsole-foam/energy-rebound',
                targetKeyword: 'foam rebound percentage charts',
                intentCategory: 'Transactional',
                recommendedWordCount: 900,
                requiredEntities: ['Energy rebound ratings', 'Superfoam compression tests', 'Runner efficiency logs'],
                breadcrumbPath: 'Home > Propulsion Shoes > Midsole Foams > Energy Return',
                metaTitle: 'Energy Return & Compression Recovery lab tests on Superfoams',
                metaDescription: 'Scientific evaluations. How dual-density midsoles bounce back to conserve leg muscle energy over 42 kilometers.'
              },
              {
                title: 'How stiff carbon plates prevent knee stress',
                path: '/propulsion-shoes/propulsion-plate/injury-prevention',
                targetKeyword: 'joint load reduction runner',
                intentCategory: 'Informational',
                recommendedWordCount: 1000,
                requiredEntities: ['Joint load reduction', 'Ankle strike stability', 'Runner injury prevention'],
                breadcrumbPath: 'Home > Propulsion Shoes > Propulsion Plates > Injury Prevention',
                metaTitle: 'Knee Joint Load Reductions & Ankle Strike Stabilizer designs',
                metaDescription: 'Orthopedic research. Exploring how curved carbon plates reduce metatarsal flex and stabilize foot rolls during marathons.'
              }
            ]
          }
        ],
        internalLinks: [
          { source: '/propulsion-shoes/midsole-foam', target: '/propulsion-shoes', anchorText: 'carbon plate marathon shoes', alternativeAnchors: ['marathon racing sneakers', 'performance marathon footwear'], riskScore: 10, purpose: 'Passes thematic authority upwards to parent pillar.' },
          { source: '/propulsion-shoes/midsole-foam/energy-rebound', target: '/propulsion-shoes/midsole-foam', anchorText: 'superfoam stack thickness specs', alternativeAnchors: ['responsive superfoam heights', 'midsole stack comparisons'], riskScore: 22, purpose: 'Links child directory to supporting sub-nodes.' },
          { source: '/trail-footwear/tread-pattern', target: '/trail-footwear', anchorText: 'traction grip trail sneakers', alternativeAnchors: ['all-terrain hiking footwear', 'deep lug trail outsoles'], riskScore: 15, purpose: 'Deep link passes anchor authority to main booking.' },
          { source: '/gym-training/airflow-apparel', target: '/propulsion-shoes', anchorText: 'athletic performance footwears', alternativeAnchors: ['propulsion racing shoes', 'cushioned athletic trainers'], riskScore: 32, purpose: 'Cross-links secondary clusters to core menu hubs.' }
        ],
        geoPageAudits: [
          {
            pagePath: '/propulsion-shoes',
            citationScore: 82,
            likelihood: 'Medium',
            checklist: [
              { label: 'Verified Author Credentials', passed: true },
              { label: 'Factual External Citations', passed: false },
              { label: 'Verifiable Statistics & Metrics', passed: false },
              { label: 'Structured Specifications / Pricing Table', passed: true },
              { label: 'Direct FAQ Schema Nodes', passed: true },
              { label: 'Strong Schema.org markup', passed: true }
            ],
            unansweredQuestions: [
              'What are the latest carbon plate shoe trends in 2026?',
              'Which marathon shoe midsole foam has the best energy return?',
              'How to choose traction patterns for wet trail races?'
            ],
            schemaAudit: {
              existing: 'Product Schema',
              missing: 'ItemList Schema link mapping',
              jsonLd: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'ItemList',
                'name': 'Propulsion Running Shoes Cluster',
                'numberOfItems': 3,
                'itemListElement': [
                  { '@type': 'ListItem', 'position': 1, 'url': `https://${domainName}/propulsion-shoes` }
                ]
              }, null, 2)
            },
            answerHooks: {
              primaryQuestion: 'Which marathon shoe midsole foam has the best energy return?',
              featuredSnippet: 'Our dual-density superfoam midsoles deliver an 85% energy rebound rating, reducing vertical foot landing loads by 12%.',
              aiOverview: '1. 85% energy rebound foam midsole\n2. Stabilizes heel rolls during marathon jogs\n3. Bounded by curved carbon propulsion plates.',
              voiceSearch: 'Our dual-density superfoam midsoles return 85% of striking energy.',
              chatGpt: 'Our superfoam midsoles have an 85% energy rebound rating.',
              gemini: 'Athletes get 85% energy return using our dual-density superfoams.',
              perplexity: 'The dual-density superfoams deliver 85% energy rebound.'
            },
            optimizedContentBlock: `### Restructured Content Block

#### Biomechanical Performance Testing (Metrics Update)
Our footwear models are tested in lab settings to ensure an **85% energy rebound rating**.

#### Actionable FAQ Checklist
* **Q: Do carbon plates cause shin splints?**  
  * **A:** No, their curved geometry stabilizes ankle rolls, lowering joint stress by 12%.`
          }
        ]
      };
    }

    if (isMock || simulated) {
      console.log('Groq API key missing. Returning mock semantic blueprint...');
      return NextResponse.json({
        ...mockBlueprint,
        simulated: true
      });
    }

    // Live Llama 3.3 Semantic Blueprint prompt
    const prompt = `
You are an expert Content Architect, GEO/AEO Strategist, and Semantic Search Analyst.
Analyze this website's crawled homepage title, description, and copy to construct an advanced Topic Cluster, Content Hierarchy, and Internal Linking Blueprint.

Website Domain: ${domainName}
Title: ${seedData.title}
Description: ${seedData.description}
Homepage Copy:
${seedData.text}

Tasks:
1. Identify exactly 3 core Topic Clusters (pillars) matching this business domain. For each, assign a "topicalDepthScore" (0-100%) and list exactly 2 "competitorTopicGap" topics that competitors cover but this domain does not.
2. For each Topic Cluster, construct a 3-tier Content Hierarchy containing:
   - "parentPage": The main high-authority Pillar page.
   - "childPages": Exactly 2 subtopic pages targeting secondary keywords.
   - "supportingPages": Exactly 2 highly specific articles targeting long-tail queries.
   For ALL of these page nodes, you must generate:
     - "title": Clean page title.
     - "path": URL path (e.g. /crm/sales).
     - "targetKeyword": Main keyword focus.
     - "intentCategory": Search intent (e.g., "Informational", "Commercial", "Transactional").
     - "recommendedWordCount": Word count targets.
     - "requiredEntities": Exactly 3 secondary entity words that must reside on the page.
     - "breadcrumbPath": Breadcrumb navigation structure.
     - "metaTitle": Optimized meta title.
     - "metaDescription": Optimized meta description.
3. Design exactly 4 internal linking instructions to tie the topic cluster together. For each, provide exactly 2 "alternativeAnchors" and a "riskScore" (0-100%).
4. Auto-generate exactly 3 "geoPageAudits" (one matching each path structure) representing a detailed business audit layout containing:
   - "pagePath": The relative URL path matching the hierarchy.
   - "citationScore": A score from 0 to 100 indicating readiness.
   - "likelihood": "Low", "Medium", or "High" chance of citation.
   - "checklist": A list of exactly 6 EEAT/AEO indicators checked for compliance, formatted as { "label": string, "passed": boolean }. (e.g. Author Credentials, External Citations, Stats, Tables, FAQs, Schema).
   - "unansweredQuestions": Exactly 3 specific target query opportunities.
   - "schemaAudit": An object containing "existing": string, "missing": string, and "jsonLd": string representing the correct schema block.
   - "answerHooks": An object containing "primaryQuestion": string, "featuredSnippet": string, "aiOverview": string, "voiceSearch": string, "chatGpt": string, "gemini": string, and "perplexity": string.
   - "optimizedContentBlock": A complete markdown copy block resolving all checklist issues in one click (incorporates stats, quotes, tables, and FAQs).

Format the response strictly as a JSON object with these exact keys. Do not include markdown codeblocks or extra conversational text.
`;

    const parsedBlueprint = await queryGroq(prompt, true);

    // Normalize casing for all keys returned by Groq
    const clusters = parsedBlueprint.topicClusters || parsedBlueprint.topic_clusters || [];
    const hierarchy = parsedBlueprint.contentHierarchy || parsedBlueprint.content_hierarchy || [];
    const links = parsedBlueprint.internalLinks || parsedBlueprint.internal_links || [];
    const audits = parsedBlueprint.geoPageAudits || parsedBlueprint.geo_page_audits || [];

    // Map Clusters
    const mappedClusters = clusters.map((c: any) => ({
      name: c.name || '',
      focusKeyword: c.focusKeyword || c.focus_keyword || '',
      topicalDepthScore: c.topicalDepthScore || c.topical_depth_score || 70,
      competitorTopicGap: c.competitorTopicGap || c.competitor_topic_gap || []
    }));

    // Map Audits
    const mappedAudits = audits.map((a: any) => {
      const checklist = a.checklist || [];
      const mappedChecklist = checklist.map((c: any) => ({
        label: c.label || '',
        passed: c.passed !== undefined ? c.passed : false
      }));

      const schema = a.schemaAudit || a.schema_audit || {};
      const mappedSchema = {
        existing: schema.existing || '',
        missing: schema.missing || '',
        jsonLd: schema.jsonLd || schema.json_ld || '{}'
      };

      const hooks = a.answerHooks || a.answer_hooks || {};
      const mappedHooks = {
        primaryQuestion: hooks.primaryQuestion || hooks.primary_question || '',
        featuredSnippet: hooks.featuredSnippet || hooks.featured_snippet || '',
        aiOverview: hooks.aiOverview || hooks.ai_overview || '',
        voiceSearch: hooks.voiceSearch || hooks.voice_search || '',
        chatGpt: hooks.chatGpt || hooks.chat_gpt || '',
        gemini: hooks.gemini || '',
        perplexity: hooks.perplexity || ''
      };

      return {
        pagePath: a.pagePath || a.page_path || '',
        citationScore: a.citationScore || a.citation_score || 50,
        likelihood: a.likelihood || 'Medium',
        checklist: mappedChecklist,
        unansweredQuestions: a.unansweredQuestions || a.unanswered_questions || [],
        schemaAudit: mappedSchema,
        answerHooks: mappedHooks,
        optimizedContentBlock: a.optimizedContentBlock || a.optimized_content_block || ''
      };
    });

    // Map Hierarchy
    const mappedHierarchy = hierarchy.map((h: any) => {
      const mapNode = (n: any) => {
        if (!n) return { title: '', path: '', intentCategory: '', recommendedWordCount: 1000, requiredEntities: [], breadcrumbPath: '', metaTitle: '', metaDescription: '' };
        return {
          title: n.title || '',
          path: n.path || '',
          targetKeyword: n.targetKeyword || n.target_keyword || '',
          intentCategory: n.intentCategory || n.intent_category || 'Informational',
          recommendedWordCount: n.recommendedWordCount || n.recommended_word_count || 1200,
          requiredEntities: n.requiredEntities || n.required_entities || [],
          breadcrumbPath: n.breadcrumbPath || n.breadcrumb_path || '',
          metaTitle: n.metaTitle || n.meta_title || '',
          metaDescription: n.metaDescription || n.meta_description || ''
        };
      };

      return {
        pillarName: h.pillarName || h.pillar_name || '',
        parentPage: mapNode(h.parentPage || h.parent_page),
        childPages: Array.isArray(h.childPages || h.child_pages) ? (h.childPages || h.child_pages).map(mapNode) : [],
        supportingPages: Array.isArray(h.supportingPages || h.supporting_pages) ? (h.supportingPages || h.supporting_pages).map(mapNode) : []
      };
    });

    // SELF-HEALING INTERPOLATOR: If Llama returned empty hierarchy arrays, dynamically rebuild using generated clusters & paths
    let finalHierarchy = mappedHierarchy;
    if (finalHierarchy.length === 0 && mappedClusters.length > 0) {
      console.log('Self-healing: Rebuilding content hierarchy from topic clusters and audits...');
      const primaryCluster = mappedClusters[0].name;
      const pages = mappedAudits.map((a: any) => a.pagePath);
      const parentPath = pages[0] || '/hub';
      const childPaths = pages.slice(1, 3);
      const supportingPaths = pages.slice(3);

      const defaultChildren = childPaths.length > 0 ? childPaths.map((p, idx) => ({
        title: `Advanced ${primaryCluster} Subtopic ${idx + 1}`,
        path: p,
        targetKeyword: `${primaryCluster.toLowerCase()} subtopic`,
        intentCategory: 'Commercial',
        recommendedWordCount: 1500,
        requiredEntities: [primaryCluster.toLowerCase(), 'benefits', 'performance'],
        breadcrumbPath: `Home > ${primaryCluster} > Subtopic`,
        metaTitle: `Advanced ${primaryCluster} Subtopic ${idx + 1}`,
        metaDescription: `Review advanced options for ${primaryCluster}.`
      })) : [
        {
          title: `${primaryCluster} Best Practices`,
          path: `${parentPath}/best-practices`,
          targetKeyword: `${primaryCluster.toLowerCase()} tips`,
          intentCategory: 'Commercial',
          recommendedWordCount: 1500,
          requiredEntities: [primaryCluster.toLowerCase(), 'benefits', 'performance'],
          breadcrumbPath: `Home > ${primaryCluster} > Tips`,
          metaTitle: `${primaryCluster} Best Practices & Strategies`,
          metaDescription: `Master the core strategies of ${primaryCluster}.`
        },
        {
          title: `${primaryCluster} Equipment & Tools`,
          path: `${parentPath}/tools`,
          targetKeyword: `${primaryCluster.toLowerCase()} gear`,
          intentCategory: 'Commercial',
          recommendedWordCount: 1500,
          requiredEntities: [primaryCluster.toLowerCase(), 'equipment', 'essentials'],
          breadcrumbPath: `Home > ${primaryCluster} > Gear`,
          metaTitle: `Top ${primaryCluster} Equipment & Essentials`,
          metaDescription: `Essential gear for optimizing ${primaryCluster} results.`
        }
      ];

      const defaultSupporting = supportingPaths.length > 0 ? supportingPaths.map((p, idx) => ({
        title: `Detailed Study on ${primaryCluster} - Part ${idx + 1}`,
        path: p,
        targetKeyword: `${primaryCluster.toLowerCase()} evaluation`,
        intentCategory: 'Informational',
        recommendedWordCount: 800,
        requiredEntities: ['rebound', 'lab tests', 'biomechanics'],
        breadcrumbPath: `Home > ${primaryCluster} > Details`,
        metaTitle: `Detailed Review - Part ${idx + 1}`,
        metaDescription: `Biomechanical analysis.`
      })) : [
        {
          title: `Choosing the Right ${primaryCluster}`,
          path: `${parentPath}/best-practices/how-to-choose`,
          targetKeyword: `how to choose ${primaryCluster.toLowerCase()}`,
          intentCategory: 'Transactional',
          recommendedWordCount: 800,
          requiredEntities: ['selection', 'comparison', 'guide'],
          breadcrumbPath: `Home > ${primaryCluster} > Tips > Choose`,
          metaTitle: `How to Choose the Best ${primaryCluster}`,
          metaDescription: `Step-by-step buyer guide.`
        },
        {
          title: `Common ${primaryCluster} Mistakes to Avoid`,
          path: `${parentPath}/best-practices/mistakes`,
          targetKeyword: `${primaryCluster.toLowerCase()} errors`,
          intentCategory: 'Informational',
          recommendedWordCount: 800,
          requiredEntities: ['mistakes', 'errors', 'prevention'],
          breadcrumbPath: `Home > ${primaryCluster} > Tips > Mistakes`,
          metaTitle: `5 Common ${primaryCluster} Mistakes to Avoid`,
          metaDescription: `Avoid these critical execution errors.`
        }
      ];

      finalHierarchy = [{
        pillarName: primaryCluster,
        parentPage: {
          title: `Ultimate Guide to ${primaryCluster}`,
          path: parentPath,
          intentCategory: 'Informational',
          recommendedWordCount: 3000,
          requiredEntities: [primaryCluster.toLowerCase(), 'guide', 'strategies'],
          breadcrumbPath: `Home > ${primaryCluster}`,
          metaTitle: `Ultimate Guide to ${primaryCluster} | Actionable Overview`,
          metaDescription: `Read our comprehensive guide to ${primaryCluster}. Explore expert tips and checklists.`
        },
        childPages: defaultChildren,
        supportingPages: defaultSupporting
      }];
    }

    // Map Links
    const mappedLinks = links.map((l: any) => ({
      source: l.source || '',
      target: l.target || '',
      anchorText: l.anchorText || l.anchor_text || '',
      alternativeAnchors: l.alternativeAnchors || l.alternative_anchors || [],
      riskScore: l.riskScore || l.risk_score || 10,
      purpose: l.purpose || ''
    }));

    // SELF-HEALING INTERPOLATOR: If Llama returned empty internal links, build relationship mapping anchors dynamically
    let finalLinks = mappedLinks;
    if (finalLinks.length === 0 && finalHierarchy.length > 0) {
      console.log('Self-healing: Rebuilding internal link directives matrix from hierarchy...');
      const h = finalHierarchy[0];
      const parent = h.parentPage.path;
      const children = h.childPages;
      const support = h.supportingPages;

      finalLinks = [
        {
          source: children[0]?.path || '/sub-1',
          target: parent,
          anchorText: `ultimate guide to ${h.pillarName.toLowerCase()}`,
          alternativeAnchors: [`go to main ${h.pillarName.toLowerCase()} resource`, `${h.pillarName.toLowerCase()} hub`],
          riskScore: 15,
          purpose: 'Passes anchor context up to the main pillar hub.'
        },
        {
          source: children[1]?.path || '/sub-2',
          target: parent,
          anchorText: `${h.pillarName.toLowerCase()} tutorial`,
          alternativeAnchors: [`main ${h.pillarName.toLowerCase()} training`, `${h.pillarName.toLowerCase()} guidelines`],
          riskScore: 20,
          purpose: 'Reinforces theme-level search relevance vectors.'
        },
        {
          source: support[0]?.path || '/sub-1/details',
          target: children[0]?.path || '/sub-1',
          anchorText: `advanced ${h.pillarName.toLowerCase()} subtopic`,
          alternativeAnchors: [`learn more about advanced ${h.pillarName.toLowerCase()}`, 'deep dive explanation'],
          riskScore: 10,
          purpose: 'Connects long-tail supporting page back to child category page.'
        },
        {
          source: support[1]?.path || '/sub-2/details',
          target: children[1]?.path || '/sub-2',
          anchorText: `${h.pillarName.toLowerCase()} equipment`,
          alternativeAnchors: [`recommended ${h.pillarName.toLowerCase()} gear`, 'essential items list'],
          riskScore: 25,
          purpose: 'Directs specific search intent upwards to the commercial hub.'
        }
      ];
    }

    return NextResponse.json({
      topicClusters: mappedClusters,
      contentHierarchy: finalHierarchy,
      internalLinks: finalLinks,
      geoPageAudits: mappedAudits,
      simulated: false
    });

  } catch (err: any) {
    console.error('Groq semantic graph generation failed:', err.message);
    let errorMessage = 'Failed to generate semantic graph. Please check your network and try again.';
    
    if (err.message.includes('429')) {
      errorMessage = 'Groq API Rate Limit exceeded (429). Please wait 1 minute before trying again.';
    } else {
      errorMessage = err.message;
    }
    
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
