import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

interface PresentEntityItem {
  entity: string;
  salience: number;
}

interface MissingEntityItem {
  entity: string;
  reason: string;
  suggestedCopy: string;
}

interface KeywordIntentItem {
  query: string;
  requiredEntity: string;
  status: 'connected' | 'broken';
}

interface EntityAnalysis {
  primaryEntityType: string;
  coverageScore: number;
  presentEntities: PresentEntityItem[];
  missingEntities: MissingEntityItem[];
  keywordIntentMap: KeywordIntentItem[];
  jsonLdSchema: string;
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
    console.log(`Phase 6 Scrape target site: ${domainName}`);
    const seedData = await scrapePage(cleanSeed);

    // Dynamic Mock Fallbacks check
    const isTechRelated = /tech|support|service|printer|help|repair|pc|computer|server|system|network|soft/i.test(domainName);
    const isRestaurant = /restaurant|food|cafe|bistro|dine|grill|kitchen|pizza/i.test(domainName);

    // Set fallback structures
    let mockAnalysis: EntityAnalysis;
    if (isRestaurant) {
      mockAnalysis = {
        primaryEntityType: 'Restaurant & Dining Establishment',
        coverageScore: 35,
        presentEntities: [
          { entity: 'Cuisine Name', salience: 0.85 },
          { entity: 'Menu Offerings', salience: 0.72 },
          { entity: 'Physical Location', salience: 0.65 }
        ],
        missingEntities: [
          {
            entity: 'Chef & Culinary Team',
            reason: 'Search engines look for authoritative chef entities to associate expertise and trustworthiness with dining brands.',
            suggestedCopy: 'Led by Executive Chef Elena Rostova, our culinary team designs menus celebrating contemporary farm-to-table traditions.'
          },
          {
            entity: 'Reservation Portal Schema',
            reason: 'AI assistants query active reservation availabilities and timings to suggest reservation slots directly in voice search.',
            suggestedCopy: 'Online reservations are available 24/7. Call or book via OpenTable for parties exceeding 6 guests.'
          },
          {
            entity: 'Dietary Options & Allergens',
            reason: 'Critical attribute filters in local map packs allow users to search for "Gluten-free restaurants near me".',
            suggestedCopy: 'We offer extensive vegetarian, vegan, and gluten-free menus. Please inform your server regarding any allergen restrictions.'
          },
          {
            entity: 'Neighborhood / Proximity details',
            reason: 'Associates the business with regional micro-graphs to capture specific local search queries.',
            suggestedCopy: 'Located in the heart of the historic Midtown District, just two blocks east of Central Park.'
          },
          {
            entity: 'Parking Availability',
            reason: 'High-intent logistical search query that users expect to confirm before booking tables.',
            suggestedCopy: 'Complimentary valet parking is available for dinner guests. Public parking decks are located on 4th Ave.'
          }
        ],
        keywordIntentMap: [
          { query: 'best neighborhood bistro Midtown', requiredEntity: 'Neighborhood / Proximity details', status: 'broken' },
          { query: 'book dinner table OpenTable', requiredEntity: 'Reservation Portal Schema', status: 'broken' },
          { query: 'midtown vegan fusion cuisine', requiredEntity: 'Dietary Options & Allergens', status: 'broken' },
          { query: 'dining room menu price range', requiredEntity: 'Menu Offerings', status: 'connected' }
        ],
        jsonLdSchema: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Restaurant',
          'name': domainName,
          'image': `https://${domainName}/images/hero.jpg`,
          'servesCuisine': 'Contemporary Fusion',
          'priceRange': '$$$',
          'address': {
            '@type': 'PostalAddress',
            'streetAddress': '123 Midtown Lane',
            'addressLocality': 'New York',
            'addressRegion': 'NY',
            'postalCode': '10018',
            'addressCountry': 'US'
          },
          'hasMenu': `https://${domainName}/menu`,
          'acceptsReservations': 'True'
        }, null, 2)
      };
    } else if (isTechRelated) {
      mockAnalysis = {
        primaryEntityType: 'IT Support & Hardware Diagnostics Provider',
        coverageScore: 50,
        presentEntities: [
          { entity: 'Remote Terminal Support', salience: 0.92 },
          { entity: 'SSID Router Hookups', salience: 0.78 },
          { entity: 'Printer offline fixes', salience: 0.65 }
        ],
        missingEntities: [
          {
            entity: 'Service Rates & Transparency',
            reason: 'Pricing transparency increases consumer trust scores inside LLM commercial search comparisons.',
            suggestedCopy: 'Standard remote repairs start at $49 flat-rate per session, with zero hidden hourly fees.'
          },
          {
            entity: 'Warranties & Resolution Guarantee',
            reason: 'Validates service authority and compliance standards under Google quality rater guidelines.',
            suggestedCopy: 'All diagnostic resets are backed by a 30-day resolution guarantee. If the error recurs, we fix it for free.'
          },
          {
            entity: 'Brand Hardware Coverage',
            reason: 'Extends entity links to specific device manufacturers in the knowledge graph.',
            suggestedCopy: 'We support all major manufacturer models including HP, Canon, Epson, Brother, Cisco, and Netgear.'
          },
          {
            entity: 'Response Time SLA',
            reason: 'Critical commercial factor matching time-sensitive search intents.',
            suggestedCopy: 'Our desk technicians respond to all diagnostic support tickets in under 15 minutes.'
          },
          {
            entity: 'Customer Review Citations',
            reason: 'Third-party sentiment audits build high trust variables for semantic search.',
            suggestedCopy: 'Rated 4.9/5 stars by over 10,000 satisfied home and small business users across the United States.'
          }
        ],
        keywordIntentMap: [
          { query: 'urgent hp printer offline reset support', requiredEntity: 'Printer offline fixes', status: 'connected' },
          { query: 'wireless router configuration flat rate cost', requiredEntity: 'Service Rates & Transparency', status: 'broken' },
          { query: 'epson scan to email warranty guarantee', requiredEntity: 'Warranties & Resolution Guarantee', status: 'broken' },
          { query: 'home office network troubleshooting time', requiredEntity: 'Response Time SLA', status: 'broken' }
        ],
        jsonLdSchema: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'LocalBusiness',
          'name': domainName,
          'image': `https://${domainName}/images/logo.png`,
          'priceRange': '$$',
          'address': {
            '@type': 'PostalAddress',
            'streetAddress': '456 Tech Boulevard',
            'addressLocality': 'San Francisco',
            'addressRegion': 'CA',
            'postalCode': '94105',
            'addressCountry': 'US'
          },
          'telephone': '+1-800-555-0199',
          'areaServed': 'US',
          'knowsAbout': ['Printer Diagnostics', 'Router SSID setup', 'Registry cleaning']
        }, null, 2)
      };
    } else {
      mockAnalysis = {
        primaryEntityType: 'Performance Sportswear & Footwear Retailer',
        coverageScore: 40,
        presentEntities: [
          { entity: 'Midsole Cushioning', salience: 0.88 },
          { entity: 'Athletic Wear', salience: 0.74 },
          { entity: 'Running Shoes', salience: 0.62 }
        ],
        missingEntities: [
          {
            entity: 'Cushioning Type / Stack Height',
            reason: 'Technical shoe specs are heavily cataloged by search engines for comparative shopping queries.',
            suggestedCopy: 'Engineered with 38mm dual-density superfoam midsoles to absorb maximum foot impact during runs.'
          },
          {
            entity: 'Tread Grip / Traction specs',
            reason: 'Determines specialized product usage categories (e.g. trail running vs. indoor track training).',
            suggestedCopy: 'Outfitted with high-traction wet-grip rubber outsoles optimizing safety on slippery street corners.'
          },
          {
            entity: 'Sustainability Credentials',
            reason: 'Search engines filter products for environmental and carbon-neutral keywords.',
            suggestedCopy: 'Crafted with 75% recycled polyester upper meshes and bio-based responsive midsoles.'
          },
          {
            entity: 'Fit Guide / Sizing guidance',
            reason: 'Logistical buyer intent attribute highly valued in LLM retail selections.',
            suggestedCopy: 'This shoe runs true-to-size. Wide foot runners should select a half-size larger for optimal toe-box spacing.'
          },
          {
            entity: 'Returns and Exchange Policies',
            reason: 'Consumer risk-mitigation factors prioritized in commercial search recommendations.',
            suggestedCopy: 'We offer a hassle-free 30-day return policy on all unworn footwear items in their original packaging.'
          }
        ],
        keywordIntentMap: [
          { query: 'buy cushioned running shoes for marathons', requiredEntity: 'Cushioning Type / Stack Height', status: 'broken' },
          { query: 'athletic streetwear collections near me', requiredEntity: 'Athletic Wear', status: 'connected' },
          { query: 'recycled mesh upper sneaker reviews', requiredEntity: 'Sustainability Credentials', status: 'broken' },
          { query: 'running shoes size exchange policy shipping', requiredEntity: 'Returns and Exchange Policies', status: 'broken' }
        ],
        jsonLdSchema: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'OnlineStore',
          'name': domainName,
          'image': `https://${domainName}/assets/banner.jpg`,
          'offers': {
            '@type': 'AggregateOffer',
            'priceCurrency': 'INR',
            'lowPrice': '2499',
            'highPrice': '19999',
            'offerCount': '120'
          },
          'shippingDetails': {
            '@type': 'OfferShippingDetails',
            'shippingRate': {
              '@type': 'MonetaryAmount',
              'value': '0',
              'currency': 'INR'
            }
          }
        }, null, 2)
      };
    }

    if (isMock || simulated) {
      console.log('Groq API key missing. Returning mock entity coverage analysis...');
      return NextResponse.json({
        ...mockAnalysis,
        simulated: true
      });
    }

    // Live Llama 3.3 entity analysis prompt
    const prompt = `
You are an expert AI Search Engine Optimization (AEO/GEO) Analyst specializing in Semantic Web Entity Graphs and Natural Language Processing.
Analyze this website's crawled homepage title, description, and content to evaluate its Entity Coverage.

Website Domain: ${domainName}
Title: ${seedData.title}
Description: ${seedData.description}
Homepage Copy:
${seedData.text}

Tasks:
1. Identify the Primary Business Entity Type (e.g. "Restaurant", "Footwear Retailer", "SaaS CRM Provider", "Managed IT Services").
2. Extract all Present Entities / attributes mentioned in the copy, and assign each a "salience" prominence score between 0.1 (low prominence) and 1.0 (highly salient) representing how prominent it is inside the copy.
3. Identify exactly 5 Missing Entities / expected schema properties matching the business graph type.
4. Calculate an Entity Coverage Score (0 to 100) representing semantic coverage.
5. Auto-generate exactly 4 high-intent user search queries (Google search intents) matching this niche, map each query to its required entity property, and specify whether the connection status is "connected" (present on page) or "broken" (missing from page).
6. Auto-generate a valid, fully formed, well-structured JSON-LD Schema Script (matching schema.org specifications, e.g. type Restaurant, LocalBusiness, or Product depending on primary entity) representing this business domain and populating recommended properties (including address, pricing, and services placeholders matching the niche).

Format the response strictly as a JSON object with these keys:
{
  "primaryEntityType": "string",
  "coverageScore": number,
  "presentEntities": [
    { "entity": "entity name", "salience": 0.85 }
  ],
  "missingEntities": [
    {
      "entity": "name of missing entity",
      "reason": "why expected",
      "suggestedCopy": "optimized copy snippet to insert"
    }
  ],
  "keywordIntentMap": [
    { "query": "search query phrase", "requiredEntity": "schema property required", "status": "connected" | "broken" }
  ],
  "jsonLdSchema": "string containing a copyable formatted JSON-LD script, do not include backticks inside the value"
}
Do not write markdown codeblocks or extra conversational text.
`;

    const parsedAnalysis = await queryGroq(prompt, true);

    // Schema structure normalization
    let cleanSchema = '';
    if (typeof parsedAnalysis.jsonLdSchema === 'object') {
      cleanSchema = JSON.stringify(parsedAnalysis.jsonLdSchema, null, 2);
    } else {
      cleanSchema = String(parsedAnalysis.jsonLdSchema || '').trim();
    }

    return NextResponse.json({
      primaryEntityType: parsedAnalysis.primaryEntityType || 'Generic Entity',
      coverageScore: Math.min(100, Math.max(0, parsedAnalysis.coverageScore || 40)),
      presentEntities: Array.isArray(parsedAnalysis.presentEntities) ? parsedAnalysis.presentEntities : [],
      missingEntities: Array.isArray(parsedAnalysis.missingEntities) ? parsedAnalysis.missingEntities : [],
      keywordIntentMap: Array.isArray(parsedAnalysis.keywordIntentMap) ? parsedAnalysis.keywordIntentMap : [],
      jsonLdSchema: cleanSchema,
      simulated: false
    });

  } catch (err: any) {
    console.error('Groq entity engine analysis failed:', err.message);
    let errorMessage = 'Failed to analyze page entities. Please check your network and try again.';
    
    if (err.message.includes('429')) {
      errorMessage = 'Groq API Rate Limit exceeded (429). Please wait 1 minute before trying again.';
    } else {
      errorMessage = err.message;
    }
    
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
