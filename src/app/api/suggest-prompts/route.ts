import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

function cleanUrl(input: string): string {
  let clean = input.trim();
  if (!/^https?:\/\//i.test(clean)) {
    clean = `https://${clean}`;
  }
  return clean;
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
  let domainName = '';

  try {
    const { url, simulated = false } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'Website URL is required' }, { status: 400 });
    }

    const targetUrl = cleanUrl(url);
    let title = '';
    let description = '';

    // Quick fetch to extract meta values for Gemini context
    try {
      const response = await fetch(targetUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        next: { revalidate: 3600 }
      });
      if (response.ok) {
        const html = await response.text();
        const $ = cheerio.load(html);
        title = $('title').text().trim() || '';
        description = $('meta[name="description"]').attr('content')?.trim() || '';
      }
    } catch (e: any) {
      console.warn(`Scrape failed for prompt suggestions: ${e.message}`);
    }

    domainName = new URL(targetUrl).hostname.replace(/^www\./i, '');

    // Groq API Setup
    const apiKey = process.env.GROQ_API_KEY;
    const isMock = !apiKey || apiKey.includes('YOUR_KEY');

    if (isMock || simulated) {
      const isTechRelated = /tech|support|service|printer|help|repair|pc|computer|server|system|network|soft/i.test(domainName);
      
      const fallbackPrompts = isTechRelated ? [
        "best computer repair service near me",
        "fix wireless printer setup issues",
        "urgent remote tech support helper",
        "resolve printer offline error window",
        "slow wifi network optimization troubleshooting",
        "install hp deskjet driver software",
        "outlook email configuration help line",
        "recover deleted pst file outlook",
        "local smart home device configurations",
        "how to remove virus from windows 11",
        "best business it support companies",
        "router setup help support services",
        "fix scan to email printer errors",
        "affordable desktop support specialists",
        "uninstall duplicate printer drivers now"
      ] : [
        "buy running shoes online India",
        "best sportswear deals online store",
        "comfortable sneakers for standing all day",
        "durable training shoes for gym",
        "casual athletic wear for men",
        "running shoes with carbon fiber plates",
        "breathable socks for marathon running",
        "discount sportswear coupons coupon codes",
        "workout apparel for hot weather",
        "stylish street wear sneakers",
        "high support sports bras online",
        "cushioned walking shoes for seniors",
        "best water resistant trail runners",
        "sustainable athletic clothing brands",
        "lightweight track pants for jogging"
      ];

      return NextResponse.json({ prompts: fallbackPrompts, simulated: true });
    }

    const prompt = `
You are an expert SEO Content Strategist.
Analyze this website domain and metadata:
Domain: ${domainName}
Title: ${title}
Description: ${description}

Generate exactly 15 high-intent, transactional, NON-BRANDED Google search prompts/queries that potential customers would type into Google to search for and purchase the services or solutions offered by this website.

CRITICAL RULE:
- Do NOT include the brand name, company name, or domain name of the website itself in any of the search queries. For example, if the domain is "adidas.co.in", you must NEVER include the word "Adidas" in any query. If the domain is "northstartechnologiesusa.com", you must NEVER include the word "Northstar" in any query.
- Focus strictly on generic, transactional, action-oriented prompts (e.g. "buy running shoes online India", "best gym shoes deals online", "quick router installation assistance", "hp deskjet printer support troubleshooting").
- Do not generate informational queries like "what is a shoe" or "definition of router".

Format the response strictly as a JSON object with a single key "prompts" containing an array of 15 strings.
Example format:
{
  "prompts": [
    "query 1",
    "query 2"
  ]
}
`;

    const parsedData = await queryGroq(prompt, true);
    const prompts = Array.isArray(parsedData.prompts) ? parsedData.prompts : [];

    return NextResponse.json({
      prompts,
      simulated: false
    });

  } catch (err: any) {
    console.error('Groq prompt suggestions failed:', err.message);
    let errorMessage = 'Failed to suggest prompts. Please check your network and try again.';
    
    if (err.message.includes('429')) {
      errorMessage = 'Groq API Rate Limit exceeded (429). Please wait 1 minute before trying again.';
    } else {
      errorMessage = err.message;
    }
    
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
