import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { getBrowser } from '@/lib/puppeteerBrowser';

interface VoiceDialog {
  query: string;
  response: string;
}

interface AuditedSentence {
  original: string;
  difficulty: 'High' | 'Medium' | 'Low';
  reason: string;
  alternative: string;
}

interface GvoReport {
  voiceReadabilityIndex: number;
  pronunciationClarity: number;
  syntaxFlow: number;
  faqIntentMatch: number;
  acousticGroundingLevel: 'Excellent' | 'Good' | 'Sub-optimal' | 'Critical Bloat';
  avgSentenceLength: number;
  complexWordsPercentage: number;
  geminiLive: VoiceDialog;
  chatgptVoice: VoiceDialog;
  siri: VoiceDialog;
  sentenceAudits: AuditedSentence[];
  voiceInjections: string[];
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

async function scrapePageForVoice(targetUrl: string) {
  try {
    const clean = cleanUrl(targetUrl);
    let html = '';
    let finalUrl = clean;

    try {
      const res = await fetch(clean, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        next: { revalidate: 3600 }
      });
      if (res.ok) {
        html = await res.text();
        finalUrl = res.url;
      }
    } catch (fetchErr) {
      console.warn(`Standard fetch failed for ${targetUrl}:`, fetchErr);
    }

    if (!html) {
      try {
        console.log(`Attempting Puppeteer crawl fallback for ${targetUrl}...`);
        const browser = await getBrowser();
        const page = await browser.newPage();
        await page.setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, y Gecko) Chrome/120.0.0.0 Safari/537.36");
        await page.setViewport({ width: 1280, height: 800 });
        
        await page.goto(clean, { waitUntil: 'domcontentloaded', timeout: 20000 });
        html = await page.content();
        finalUrl = page.url();
        await page.close();
      } catch (puppeteerErr) {
        console.error("Puppeteer crawl fallback failed:", puppeteerErr);
        return null;
      }
    }

    if (!html) return null;
    const $ = cheerio.load(html);

    const title = $('title').text().trim() || '';
    const description = $('meta[name="description"]').attr('content')?.trim() || '';

    $('script, style, iframe, nav, header, footer').remove();
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim().substring(0, 3000);

    return {
      title,
      description,
      bodyText
    };
  } catch {
    return null;
  }
}

async function queryDeepSeek(prompt: string): Promise<any> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey || apiKey.includes('YOUR_KEY')) {
    throw new Error('DeepSeek API Key is not set in env');
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
      temperature: 0.2,
      response_format: { type: 'json_object' }
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`DeepSeek status ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('Empty response');
  return JSON.parse(text.trim());
}

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    if (!url) {
      return NextResponse.json({ error: 'Website URL is required' }, { status: 400 });
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey || apiKey.includes('YOUR_KEY')) {
      return NextResponse.json({ 
        error: 'DeepSeek API Key is unconfigured. Please configure DEEPSEEK_API_KEY in your .env.local file to run GVO voice audits.' 
      }, { status: 400 });
    }

    const cleanSeed = cleanUrl(url);
    const domainName = getDomainHostname(cleanSeed);

    const scrapResult = await scrapePageForVoice(cleanSeed);
    if (!scrapResult) {
      return NextResponse.json({ error: 'Failed to crawl website page for voice audit. Verify the URL is public.' }, { status: 400 });
    }

    // Server-side baseline lexical counts
    const sentences = scrapResult.bodyText.split(/[.!?]+/).filter(s => s.trim().length > 5);
    const totalWords = scrapResult.bodyText.split(/\s+/).length;
    const avgSentenceLength = sentences.length > 0 ? Math.round(totalWords / sentences.length) : 15;

    // Detect complex words (simple regex approximation: words longer than 8 characters)
    const longWords = scrapResult.bodyText.split(/\s+/).filter(w => w.length > 8).length;
    const complexWordsPercentage = totalWords > 0 ? Math.round((longWords / totalWords) * 100) : 12;

    const prompt = `
You are an expert Generative Voice Optimization (GVO) auditor. Evaluate the following website text for acoustic grounding, voice search compatibility (Siri, Gemini Live, ChatGPT Voice), and speech clarity:
Domain: "${domainName}"
Scraped Title: "${scrapResult.title}"
Scraped Description: "${scrapResult.description}"
Scraped Copy: "${scrapResult.bodyText}"

Key structural stats from crawler:
- Avg Sentence Length: ${avgSentenceLength} words
- Complex Words Percentage: ${complexWordsPercentage}%

Perform a detailed auditory analysis of this copy.
1. Assign metrics (0 to 100):
   - "voiceReadabilityIndex": How easily a voice engine converts this to spoken summaries.
   - "pronunciationClarity": Frequency of words causing tongue-twisters or robotic speech stumbles.
   - "syntaxFlow": How natural the rhythm sounds when read aloud.
   - "faqIntentMatch": Directness in matching typical spoken voice query prompts.
2. Select "acousticGroundingLevel": "Excellent" | "Good" | "Sub-optimal" | "Critical Bloat".
3. Generate Simulated Conversations for 3 Voice Agents:
   - "geminiLive": A verbal dialogue. Provide "query" (what the user speaks verbally) and the "response" (what Gemini speaks back, keeping it under 25 words, conversational, and direct).
   - "chatgptVoice": A verbal dialogue. Provide "query" and the "response" (under 25 words).
   - "siri": A verbal dialogue. Provide "query" and the "response" (super short, under 15 words).
4. Find 3-4 "sentenceAudits": complex, robotic, or wordy sentences from the copy. For each:
   - "original": The exact text from the page.
   - "difficulty": "High" | "Medium" | "Low".
   - "reason": Why it sounds poor when read aloud (e.g. "passive voice", "multiple commas causing stumbles", "too many jargon syllables").
   - "alternative": A revised conversational version (short, simple words, active voice).
5. Generate 3 GVO trust injections "voiceInjections" (e.g., highly rhythmic, verbal summary snippets under 20 words to place at the top of headers).

Return ONLY valid JSON matching this layout:
{
  "voiceReadabilityIndex": number,
  "pronunciationClarity": number,
  "syntaxFlow": number,
  "faqIntentMatch": number,
  "acousticGroundingLevel": "Excellent" | "Good" | "Sub-optimal" | "Critical Bloat",
  "geminiLive": {
    "query": "string",
    "response": "string"
  },
  "chatgptVoice": {
    "query": "string",
    "response": "string"
  },
  "siri": {
    "query": "string",
    "response": "string"
  },
  "sentenceAudits": [
    {
      "original": "string",
      "difficulty": "High" | "Medium" | "Low",
      "reason": "string",
      "alternative": "string"
    }
  ],
  "voiceInjections": ["string"]
}
`;

    const report = await queryDeepSeek(prompt);

    const finalReport: GvoReport = {
      voiceReadabilityIndex: report.voiceReadabilityIndex || 70,
      pronunciationClarity: report.pronunciationClarity || 70,
      syntaxFlow: report.syntaxFlow || 70,
      faqIntentMatch: report.faqIntentMatch || 70,
      acousticGroundingLevel: report.acousticGroundingLevel || 'Good',
      avgSentenceLength,
      complexWordsPercentage,
      geminiLive: report.geminiLive || { query: '', response: '' },
      chatgptVoice: report.chatgptVoice || { query: '', response: '' },
      siri: report.siri || { query: '', response: '' },
      sentenceAudits: report.sentenceAudits || [],
      voiceInjections: report.voiceInjections || []
    };

    return NextResponse.json(finalReport);

  } catch (error: any) {
    console.error('GVO Auditor API error:', error);
    return NextResponse.json({ error: error.message || 'Failed to complete Voice Search audit.' }, { status: 500 });
  }
}
