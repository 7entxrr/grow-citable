import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

interface FAQItem {
  question: string;
  answer: string;
}

interface DefinitionItem {
  term: string;
  definition: string;
}

interface QuoteItem {
  quote: string;
  author: string;
}

interface OptimizedContent {
  titles: string[];
  metaSummary: string;
  headingsOutline: string[];
  faqs: FAQItem[];
  specificationTable: string;
  featureLists: string[];
  pros: string[];
  cons: string[];
  definitions: DefinitionItem[];
  examples: string[];
  statistics: string[];
  quotes: QuoteItem[];
  authorBio: string;
  eeatTips: string[];
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

// DeepSeek API Helper (deepseek-chat)
async function queryDeepSeek(prompt: string, jsonFormat = true): Promise<any> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey || apiKey.includes('YOUR_KEY')) {
    throw new Error('DeepSeek API Key is not set in .env.local');
  }

  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      response_format: jsonFormat ? { type: 'json_object' } : undefined
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`DeepSeek API status ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('Empty response from DeepSeek');

  return jsonFormat ? JSON.parse(text.trim()) : text;
}

export async function POST(req: Request) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const isMock = !apiKey || apiKey.includes('YOUR_KEY');
  let domainName = '';
  let requestUrl = '';

  try {
    const { url, niche = '', simulated = false } = await req.json();
    requestUrl = url;

    if (!url) {
      return NextResponse.json({ error: 'Your Website URL is required' }, { status: 400 });
    }

    const cleanSeed = cleanUrl(url);
    domainName = getDomainHostname(cleanSeed);

    // Crawl target site context
    console.log(`Phase 5 Scrape target site: ${domainName}`);
    const seedData = await scrapePage(cleanSeed);

    // Dynamic Mock Fallbacks check
    const isTechRelated = /tech|support|service|printer|help|repair|pc|computer|server|system|network|soft/i.test(domainName) || /tech|support|server|help/i.test(niche);

    const mockContent: OptimizedContent = isTechRelated ? {
      titles: [
        'Expert Printer Setup & Fast Wireless Hookups Near Me',
        'How to Fix Printer Offline Errors: Troubleshooting Guide',
        'Affordable B2B Technical Support & Hardware Diagnostics'
      ],
      metaSummary: 'Get comprehensive remote technical support, wireless printer driver setup, registry configuration solutions, and hardware diagnostics compiled by certified systems engineers.',
      headingsOutline: [
        'H1: Professional Remote IT and Printer Installation Support',
        'H2: Troubleshooting Common Wireless Printer Hookup Issues',
        'H3: Quick Fixes for Printer Offline Status Windows 10/11',
        'H2: On-Demand Remote Agent System Maintenance Tiers'
      ],
      faqs: [
        { question: 'Why does my printer keep showing offline?', answer: 'This is usually caused by outdated driver software, network latency issues, or incorrect port configurations in your registry. Reinstalling current firmware solves 90% of instances.' },
        { question: 'Do you offer remote router configuration support?', answer: 'Yes, our agents can configure local area network SSID keys, adjust DNS channels, and configure firewalls to maximize device connection speeds.' },
        { question: 'How quickly can a tech agent start troubleshooting?', answer: 'Remote desk technicians are typically available within 15 minutes of submitting a request ticket during business hours.' }
      ],
      specificationTable: '| Service Tier | Support Level | Monthly Rate | Response Guarantee |\n| --- | --- | --- | --- |\n| Basic Device Fix | Single-device remote repair | $49 | Under 2 hours |\n| Home Office Plan | 3 Devices, network setup | $99 | Under 1 hour |\n| Enterprise SLA | Unlimited terminals, SLA guarantee | Custom | Under 15 mins |',
      featureLists: [
        'Certified systems repair experts with 10+ years of troubleshooting history.',
        'SSAE 16 audited remote encryption channels ensuring absolute system privacy.',
        'Support coverage for major print brands including HP, Epson, Canon, and Brother.',
        'Complete registry diagnostic checks and redundant connection removal.',
        'One-click remote console control setup with instant sessions.'
      ],
      pros: [
        'Instant remote connections bypass the need for physical scheduling delays.',
        'Direct SLA-backed contracts for corporate small business offices.',
        'Flat-rate diagnostic fees with zero hidden hourly surcharges.'
      ],
      cons: [
        'Cannot execute physical motherboard repairs or component drop-offs.',
        'Requires an active broadband internet connection for remote terminal control.'
      ],
      definitions: [
        { term: 'SSID (Service Set Identifier)', definition: 'The primary technical name of a wireless network used by computers to connect and authenticate routers.' },
        { term: 'Driver Software', definition: 'The operational software protocol that acts as a translator between Windows system registry and peripheral hardware devices.' }
      ],
      examples: [
        'Example: A home accountant resolved a critical HP Deskjet offline diagnostic failure 10 minutes before tax deadlines using our quick terminal reset guide.',
        'Example: Auto-configured dual-band mesh Wi-Fi network routing to stabilize canon pixma scanners across three home office floors.'
      ],
      statistics: [
        'Over 50,000 wireless devices configured globally with a 98% resolution rating.',
        'Bypasses average hardware repair shop wait times by 4.2 days.'
      ],
      quotes: [
        { quote: 'Optimizing wireless printer ports requires clear semantic guidelines. These guides make network setups accessible for everyday consumers.', author: 'Douglas Chen, Chief Systems Administrator' },
        { quote: 'Bypassing local hardware stores for remote diagnostics is the fastest way to minimize corporate downtime.', author: 'Sarah Sterling, Operations Lead' }
      ],
      authorBio: 'Marcus Vance is a veteran network engineer and systems architect with over 15 years of consumer tech diagnostics experience. He holds certifications in CompTIA A+, Network+, and Cisco CCNA.',
      eeatTips: [
        'Display your physical service area location and business license numbers prominently.',
        'Add visible client testimonial sections backed by third-party Trustpilot links.',
        'Feature hardware certification badges (CompTIA, Cisco) inside your footer.'
      ]
    } : {
      titles: [
        'Buy Performance Sports Shoes Online India | Official Store',
        'Best Cushioned Running Shoes for Marathons & Gym Workouts',
        'Top Streetwear Sneakers for Comfort & High-cushion Fit'
      ],
      metaSummary: 'Explore sports shoes engineered with dual-density foam midsoles, carbon-fiber energy propulsion plates, and breathable meshes tailored for marathon runs and gym sessions.',
      headingsOutline: [
        'H1: Performance Sportswear and Cushioned Athletic Footwear',
        'H2: Engineering the Ultimate Marathon Carbon-Plate Cushion',
        'H3: Breathable Engineered Meshes for Extreme Hot Weather',
        'H2: Elevate Your Training: Daily Gym Wear Spec Layouts'
      ],
      faqs: [
        { question: 'Are carbon-plate shoes safe for everyday training walks?', answer: 'Yes, but carbon-fiber plates are stiffly structured to maximize energy returns for runners. For everyday walking, we suggest standard responsive foam midsoles.' },
        { question: 'What is the durability limit of performance training shoes?', answer: 'Most elite cushioned training sneakers maintain optimal structural cushioning limits for 450 to 600 kilometers of road usage.' },
        { question: 'How do engineered mesh uppers improve breathability?', answer: 'They employ variable knit density maps that widen weave structures around high-heat toe-box areas to maximize heat dissipation.' }
      ],
      specificationTable: '| Model Type | Midsole Foam | Carbon Plate | Ideal Target Niche |\n| --- | --- | --- | --- |\n| Elite Propulsion | Dual-density Superfoam | Curved Carbon Plate | Marathon Racing |\n| Daily Trainer | High-density Responsive EVA | None | Road Training & Gym |\n| Comfort Cruiser | Ortholite Gel Comfort Liner | None | Standing & Walking |',
      featureLists: [
        'Ultra-lightweight energy return foams that rebound 85% of foot striking energy.',
        'Ortholite liners designed with sustainable, odor-resistant organic mesh blends.',
        'Variable-knit engineered meshes matching anatomical heat profiles.',
        'Grip-engineered rubber outsoles optimizing wet traction corners.',
        'Reinforced lace eyelets designed with zero-stretch stitch bands.'
      ],
      pros: [
        'Propulsion speed increases of up to 4.2% verified by biomechanics labs.',
        'Highly breathable uppers eliminate toe chaffing and blister heat-spots.',
        'Extremely lightweight profile reduces leg fatigue during long jogging sessions.'
      ],
      cons: [
        'Higher starting price point compared to standard casual sneaker brands.',
        'Carbon-fiber plates have a rigid wear profile that requires a brief break-in window.'
      ],
      definitions: [
        { term: 'Propulsion Plate', definition: 'A curved internal shoe structure (typically carbon fiber) that flexes under weight to launch runners forward.' },
        { term: 'EVA (Ethylene Vinyl Acetate)', definition: 'A synthetic elastomer foam widely utilized to absorb vertical impacts and distribute landing shock.' }
      ],
      examples: [
        'Example: A marathon runner shaved 9 minutes off their personal record by switching to propulsion foam plates during training blocks.',
        'Example: High-support heel counters stabilized lateral foot rolls for weightlifters during squat drills.'
      ],
      statistics: [
        'Reduces muscle recovery cycles by up to 24% after strenuous jogs.',
        'Tested across 2,000+ athletes to prove ankle strike load drops of 12%.'
      ],
      quotes: [
        { quote: 'Elite runner shoes have progressed from simple cushions into complex propulsion machines. Dual superfoams represent a paradigm shift.', author: 'Dr. Evelyn Carter, Sports Biomechanics Researcher' },
        { quote: 'Traction control and breathability are just as critical as midsole stack heights for outdoor trail safety.', author: 'Coach Liam Fletcher, Marathon Strategist' }
      ],
      authorBio: 'David Ross is a performance sportswear designer and footwear researcher with 12 years of industry experience. He writes extensively on foam engineering, foot biomechanics, and retail gear.',
      eeatTips: [
        'Include high-resolution, detailed photos of the shoe outsoles and mesh knit patterns close-up.',
        'Display verified buyer review panels with fit ratings (e.g. Runs Small / True to Fit).',
        'Add a clear materials specification section highlighting sustainability credentials.'
      ]
    };

    if (isMock || simulated) {
      console.log('Groq API key missing. Returning mock optimized content package...');
      return NextResponse.json({
        ...mockContent,
        detectedNiche: isTechRelated ? 'Managed Tech Support & IT Repair' : 'Performance Sportswear & Retail Apparel',
        simulated: true
      });
    }

    // Auto-detect niche/keywords using Llama 3.3
    let detectedNiche = niche.trim();
    if (!detectedNiche) {
      const nichePrompt = `
Analyze this website homepage context to extract its precise industry niche and core keywords.
Domain: ${domainName}
Title: ${seedData.title}
Description: ${seedData.description}
Content: ${seedData.text}

Return a single concise summary phrase (e.g. "E-commerce retail fashion & apparel" or "Residential printer installation and remote computer troubleshooting support").
Format your output strictly as a JSON object with a single key "niche". Do not include markdown codeblocks or extra text.
Example format:
{
  "niche": "Managed IT Services & Cyber Security Solutions"
}
`;
      try {
        const nicheRes = await queryDeepSeek(nichePrompt, true);
        detectedNiche = nicheRes.niche || (isTechRelated ? 'Managed Tech Support & IT Repair' : 'Retail Store & E-commerce');
      } catch (e: any) {
        console.warn('Llama niche detection failed in content-engineer:', e.message);
        detectedNiche = isTechRelated ? 'Managed Tech Support & IT Repair' : 'Retail Store & E-commerce';
      }
    }

    // Content rewrite prompt
    const prompt = `
You are an expert Content Architect, AEO/GEO Strategist, and Search Optimizer.
We need to rewrite, expand, and optimize the crawled page content of "${domainName}" to make it highly authoritative, search-visible, structured, and EEAT (Experience, Expertise, Authoritativeness, Trustworthiness) compliant.

Website URL: ${domainName}
Crawled Page content:
Title: ${seedData.title}
Description: ${seedData.description}
Homepage Text content:
${seedData.text}

Keyword/Niche focus: ${detectedNiche}

Tasks:
Generate a complete rewritten content optimization package. Format the response strictly as a JSON object containing the following keys:
1. "titles": Exactly 3 optimized, high-CTR headline options (max 60 chars).
2. "metaSummary": A compelling introductory hook and optimized search meta description.
3. "headingsOutline": A logical hierarchy outline list of headings (H1, H2s, H3s) for the restructured landing page.
4. "faqs": Exactly 3 highly search-optimized FAQs, formatted as an array of { "question": string, "answer": string }.
5. "specificationTable": A markdown table mapping key specs, features, or service tiers side-by-side.
6. "featureLists": A list of exactly 5 bullet points showcasing primary features or user advantages.
7. "pros": Exactly 3 key business advantages.
8. "cons": Exactly 2 honest, transparent trade-offs (helps build consumer trust/EEAT).
9. "definitions": A list of exactly 2 key industry jargon terms defined clearly, formatted as { "term": string, "definition": string }.
10. "examples": Exactly 2 practical user stories or application examples.
11. "statistics": Exactly 2 verifiable industry/brand statistics or metric callouts (e.g. "99.9% uptime guaranteed", "Saves 14 hours per week").
12. "quotes": Exactly 2 fictional/authoritative testimonials or citations from experts in the industry, formatted as { "quote": string, "author": string }.
13. "authorBio": A professional author bio (2-3 sentences) emphasizing credentials, experience, and authority in the niche.
14. "eeatTips": Exactly 3 actionable recommendations to improve page trust (e.g. "Add client trust badges", "Include physical business address").

Format the output strictly as a JSON object with these exact keys. Do not include markdown codeblocks or conversational text.
`;

    const parsedContent = await queryDeepSeek(prompt, true);

    return NextResponse.json({
      ...parsedContent,
      detectedNiche,
      simulated: false
    });

  } catch (err: any) {
    console.error('Groq content engineering failed:', err.message);
    let errorMessage = 'Failed to rewrite page content. Please check your network and try again.';
    
    if (err.message.includes('429')) {
      errorMessage = 'Groq API Rate Limit exceeded (429). Please wait 1 minute before trying again.';
    } else {
      errorMessage = err.message;
    }
    
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
