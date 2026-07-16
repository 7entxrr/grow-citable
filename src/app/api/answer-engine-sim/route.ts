import { NextResponse } from 'next/server';

interface QuerySimulation {
  query: string;
  simulatedAnswer: string;
  visibilityScore: number;
  sentiment: 'Positive' | 'Neutral' | 'Negative' | 'Not Mentioned';
  citations: number;
}

interface EngineSimulation {
  engine: 'ChatGPT' | 'Perplexity' | 'Gemini' | 'Claude';
  status: 'success' | 'failed';
  error?: string;
  queries?: QuerySimulation[];
}

interface SimResponse {
  simulations: EngineSimulation[];
  geoVisibilityIndex: number;
  overallSentiment: 'Positive' | 'Neutral' | 'Negative' | 'Not Mentioned';
  directives: string[];
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

// Helper to prompt engine-specific simulator content
function makePrompt(engine: string, brandName: string, domainName: string, category: string): string {
  return `You are simulating a search engine conversational audit. For the brand "${brandName}" (website: "${domainName}") in the niche "${category}", simulate the ${engine} answer to these three queries:
1. "Is ${brandName} (${domainName}) a reliable source to buy ${category}?"
2. "What are the differences between ${brandName} and other popular online ${category} sellers?"
3. "Recommend the top websites to purchase ${category} online."

For each query, write a conversational answer that perfectly matches ${engine}'s personality and query formatting conventions (e.g. Perplexity should have citations like [1][2], Claude should be clean and objective, ChatGPT direct and conversational). Estimate a visibilityScore (0 to 100) representing brand prominence, a sentiment rating ("Positive" | "Neutral" | "Negative" | "Not Mentioned"), and citations count.

Output absolute raw JSON matching this format:
{
  "queries": [
    {
      "query": "string",
      "simulatedAnswer": "string",
      "visibilityScore": number,
      "sentiment": "Positive" | "Neutral" | "Negative" | "Not Mentioned",
      "citations": number
    }
  ]
}`;
}

// 1. ChatGPT API call
async function runOpenAI(apiKey: string, prompt: string): Promise<QuerySimulation[]> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      response_format: { type: 'json_object' }
    }),
    signal: AbortSignal.timeout(20000)
  });
  if (!res.ok) {
    throw new Error(`OpenAI HTTP ${res.status}`);
  }
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('Empty OpenAI response');
  const parsed = JSON.parse(text.trim());
  return parsed.queries;
}

// 2. Perplexity API call
async function runPerplexity(apiKey: string, prompt: string): Promise<QuerySimulation[]> {
  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      response_format: { type: 'json_object' }
    }),
    signal: AbortSignal.timeout(20000)
  });
  if (!res.ok) {
    throw new Error(`Perplexity HTTP ${res.status}`);
  }
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('Empty Perplexity response');
  const parsed = JSON.parse(text.trim());
  return parsed.queries;
}

// 3. Gemini API call
async function runGemini(apiKey: string, prompt: string): Promise<QuerySimulation[]> {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2
      }
    }),
    signal: AbortSignal.timeout(20000)
  });
  if (!res.ok) {
    throw new Error(`Gemini HTTP ${res.status}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty Gemini response');
  const parsed = JSON.parse(text.trim());
  return parsed.queries;
}

// 4. Claude API call
async function runClaude(apiKey: string, prompt: string): Promise<QuerySimulation[]> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }]
    }),
    signal: AbortSignal.timeout(20000)
  });
  if (!res.ok) {
    throw new Error(`Claude HTTP ${res.status}`);
  }
  const data = await res.json();
  const text = data?.content?.[0]?.text;
  if (!text) throw new Error('Empty Claude response');
  const parsed = JSON.parse(text.trim());
  return parsed.queries;
}

export async function POST(req: Request) {
  try {
    const { url, niche = '' } = await req.json();
    if (!url) {
      return NextResponse.json({ error: 'Website URL is required' }, { status: 400 });
    }

    const cleanSeed = cleanUrl(url);
    const domainName = getDomainHostname(cleanSeed);
    const domainPart = domainName.split('.')[0];
    const brandName = domainPart.charAt(0).toUpperCase() + domainPart.slice(1);
    const category = niche.trim() || 'services';

    const openaiKey = process.env.OPENAI_API_KEY;
    const perplexityKey = process.env.PERPLEXITY_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    const hasAnyKey =
      (openaiKey && !openaiKey.includes('YOUR_KEY')) ||
      (perplexityKey && !perplexityKey.includes('YOUR_KEY')) ||
      (geminiKey && !geminiKey.includes('YOUR_KEY')) ||
      (anthropicKey && !anthropicKey.includes('YOUR_KEY'));

    if (!hasAnyKey) {
      return NextResponse.json({ 
        error: 'No AI Engine API Keys are configured. Please add at least one key (OPENAI_API_KEY, PERPLEXITY_API_KEY, GEMINI_API_KEY, or ANTHROPIC_API_KEY) to your .env.local file to run simulations.' 
      }, { status: 400 });
    }

    const simulations: EngineSimulation[] = [];

    // Setup tasks
    const tasks: Promise<void>[] = [];

    // ChatGPT task
    if (openaiKey && !openaiKey.includes('YOUR_KEY') && openaiKey !== '') {
      tasks.push(
        runOpenAI(openaiKey, makePrompt('ChatGPT', brandName, domainName, category))
          .then(queries => {
            simulations.push({ engine: 'ChatGPT', status: 'success', queries });
          })
          .catch(err => {
            simulations.push({ engine: 'ChatGPT', status: 'failed', error: err.message || 'API error' });
          })
      );
    } else {
      simulations.push({ engine: 'ChatGPT', status: 'failed', error: 'No OPENAI_API_KEY configured in environmental variables.' });
    }

    // Perplexity task
    if (perplexityKey && !perplexityKey.includes('YOUR_KEY') && perplexityKey !== '') {
      tasks.push(
        runPerplexity(perplexityKey, makePrompt('Perplexity', brandName, domainName, category))
          .then(queries => {
            simulations.push({ engine: 'Perplexity', status: 'success', queries });
          })
          .catch(err => {
            simulations.push({ engine: 'Perplexity', status: 'failed', error: err.message || 'API error' });
          })
      );
    } else {
      simulations.push({ engine: 'Perplexity', status: 'failed', error: 'No PERPLEXITY_API_KEY configured in environmental variables.' });
    }

    // Gemini task
    if (geminiKey && !geminiKey.includes('YOUR_KEY') && geminiKey !== '') {
      tasks.push(
        runGemini(geminiKey, makePrompt('Gemini', brandName, domainName, category))
          .then(queries => {
            simulations.push({ engine: 'Gemini', status: 'success', queries });
          })
          .catch(err => {
            simulations.push({ engine: 'Gemini', status: 'failed', error: err.message || 'API error' });
          })
      );
    } else {
      simulations.push({ engine: 'Gemini', status: 'failed', error: 'No GEMINI_API_KEY configured in environmental variables.' });
    }

    // Claude task
    if (anthropicKey && !anthropicKey.includes('YOUR_KEY') && anthropicKey !== '') {
      tasks.push(
        runClaude(anthropicKey, makePrompt('Claude', brandName, domainName, category))
          .then(queries => {
            simulations.push({ engine: 'Claude', status: 'success', queries });
          })
          .catch(err => {
            simulations.push({ engine: 'Claude', status: 'failed', error: err.message || 'API error' });
          })
      );
    } else {
      simulations.push({ engine: 'Claude', status: 'failed', error: 'No ANTHROPIC_API_KEY configured in environmental variables.' });
    }

    await Promise.all(tasks);

    const successSims = simulations.filter(s => s.status === 'success' && s.queries);
    if (successSims.length === 0) {
      return NextResponse.json({
        error: 'Simulation failed: None of the configured AI search engine APIs responded successfully. Please verify your API keys in .env.local.'
      }, { status: 400 });
    }

    let avgVisibility = 0;
    let totalCitations = 0;
    let positiveCount = 0;
    let negativeCount = 0;

    let scoreSum = 0;
    let queryCount = 0;
    for (const sim of successSims) {
      if (sim.queries) {
        for (const q of sim.queries) {
          scoreSum += q.visibilityScore;
          totalCitations += q.citations;
          if (q.sentiment === 'Positive') positiveCount++;
          if (q.sentiment === 'Negative') negativeCount++;
          queryCount++;
        }
      }
    }
    avgVisibility = Math.round(scoreSum / queryCount);

    const overallSentiment = 
      positiveCount > negativeCount ? 'Positive' : negativeCount > positiveCount ? 'Negative' : 'Neutral';

    // Directives generated based on results
    const directives: string[] = [
      `Optimize headers on ${domainName} containing brand variations to improve direct visibility search indexing.`,
      `Implement structured JSON-LD schemas matching category specifications to increase recommendation engine crawl confidence.`
    ];

    if (avgVisibility < 60) {
      directives.push(`Acquire authority backlinks from niche-specific directories to establish domain relevance across LLM databases.`);
    } else {
      directives.push(`Develop comparison sheets directly addressing alternative competitors to capture citations in user comparison lookups.`);
    }

    if (totalCitations === 0) {
      const hasPerplexity = simulations.some(s => s.engine === 'Perplexity' && s.status === 'success');
      if (hasPerplexity) {
        directives.push(`Increase citations on Reddit threads and citation platforms like Wikipedia to support Perplexity citations.`);
      } else {
        directives.push(`Increase citations on third-party forums and platforms like Wikipedia to support conversational answer engine citations.`);
      }
    }

    return NextResponse.json({
      simulations,
      geoVisibilityIndex: avgVisibility,
      overallSentiment,
      directives
    });

  } catch (error: any) {
    console.error('GEO Simulator Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to run Answer Engine Simulation.' }, { status: 500 });
  }
}
