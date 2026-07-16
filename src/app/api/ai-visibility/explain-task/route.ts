import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

async function queryDeepSeekChat(messages: any[]): Promise<string> {
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
      messages,
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

  return text;
}

function getLocalFallbackExplanation(title: string, desc: string, diagnostic: string, engine: string, domain: string, query: string, isFollowUp: boolean): string {
  if (isFollowUp) {
    const q = query.toLowerCase().trim();
    if (q === 'listen') {
      return "I am listening to your query. What specific question do you have about implementing this task?";
    }
    if (q.includes('where') || q.includes('paste') || q.includes('put') || q.includes('file')) {
      return `For **${title}**, you should insert the code block inside the \`<head>\` tag section of your website templates (e.g., \`index.html\` or \`layout.tsx\`). Let me know if you are using Next.js or raw HTML!`;
    }
    if (q.includes('code') || q.includes('example') || q.includes('template')) {
      return `The code templates are listed above in our chat history. Let me know if you need to customize any specific field.`;
    }
    return `Understood. Regarding "${query}": Make sure to apply this change to your HTML source, clear cache, and click 'Submit & Re-Audit Site' to verify the fix.`;
  }

  const cleanTitle = title.toLowerCase();
  
  if (cleanTitle.includes('organization') || cleanTitle.includes('schema') || cleanTitle.includes('json-ld')) {
    return `### How to implement **${title}** for **${domain}**

Here is the exact JSON-LD schema template you need to deploy.

#### Code Snippet
\`\`\`html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "${domain.split('.')[0]}",
  "url": "https://${domain}",
  "logo": "https://${domain}/logo.png",
  "sameAs": [
    "https://twitter.com/${domain.split('.')[0]}",
    "https://linkedin.com/company/${domain.split('.')[0]}"
  ]
}
</script>
\`\`\`

#### Instructions
1. Copy the code block above.
2. Open your website's primary layout template file (e.g. \`src/app/layout.tsx\` or main HTML layout).
3. Paste the code snippet inside the \`<head>\` tag section.
4. Verify deployment using the Schema Markup Validator tool.`;
  }
  
  if (cleanTitle.includes('open graph') || cleanTitle.includes('og:') || cleanTitle.includes('meta')) {
    return `### How to deploy **${title}** for **${domain}**

Include these standard meta tags in your landing templates.

#### Code Snippet
\`\`\`html
<!-- Open Graph Metadata for AI Crawlers -->
<meta property="og:title" content="${domain.split('.')[0]} - Visibility & Optimization Platform" />
<meta property="og:description" content="Analyze and boost your visibility across generative search engines." />
<meta property="og:url" content="https://${domain}" />
<meta property="og:image" content="https://${domain}/og-image.png" />
<meta name="twitter:card" content="summary_large_image" />
\`\`\`

#### Instructions
1. Paste these tags inside the HTML \`<head>\` section of your target pages.
2. Confirm crawlers have access by inspecting using Social Debugger utilities.`;
  }

  if (cleanTitle.includes('canonical')) {
    return `### How to set Canonical Tags for **${domain}**

Ensure every indexing landing page points to its source of truth.

#### Code Snippet
\`\`\`html
<link rel="canonical" href="https://${domain}" />
\`\`\`

#### Instructions
1. Replace \`https://${domain}\` with the absolute address of the current page.
2. Place this tag inside the page's \`<head>\` layout block.`;
  }

  // Generic detailed developer response fallback
  return `### Implementation Guide: **${title}** (Target: **${engine}**)

**Goal:** ${desc}
**Diagnostic Concern:** ${diagnostic}

To fix this for **${domain}**, follow these standard guidelines:

1. **Locate the target asset**: Identify which page templates or static configs (e.g. \`robots.txt\`, \`sitemap.xml\`) need modification.
2. **Implement code changes**: Make the necessary edits (e.g. adding structural metadata, improving word readability, or submitting ping signals).
3. **Verify Deployment**: Use our automated **Re-Audit Site** validation checker in the visibility dashboard to verify that our crawler successfully detects the change.

Is there a specific template framework (like Next.js, WordPress, or raw HTML) you are using? Let me know so I can format custom instructions for you!`;
}

export async function POST(request: NextRequest) {
  try {
    const { title, desc, diagnostic, engine, domain, messages } = await request.json();
    
    if (!title || !domain || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Title, domain, and messages history are required' }, { status: 400 });
    }

    const systemPrompt = `You are a technical SEO, AEO (Answer Engine Optimization), and GEO optimization co-pilot helping a developer.
Your goal is to provide a clear explanation and specific implementation templates to accomplish this task:
Task Title: "${title}"
Task Description: "${desc}"
Diagnostic Alert: "${diagnostic}"
Target Engine: "${engine}"
Website Domain: "${domain}"

Be technical and direct.
Provide copy-pasteable code examples (JSON-LD scripts, Open Graph meta tags, HTML structure, or config snippets) in Markdown code blocks.
Explain exactly where to paste/insert the code (e.g., inside the <head> block, root folder, sitemap structure).

CRITICAL CONSTRAINTS: 
- Provide short, concise, and focused replies according to what the user asks.
- If the user is asking a follow-up query, answer it directly and shortly in 1-2 paragraphs max. 
- Do not repeat the full initial code templates or setup guide unless explicitly asked by the user.`;

    const promptMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m: any) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content
      }))
    ];

    try {
      const reply = await queryDeepSeekChat(promptMessages);
      return NextResponse.json({ reply });
    } catch (apiErr: any) {
      console.warn('DeepSeek chat failed or key is missing. Calling local fallback responder:', apiErr.message);
      
      const lastUserQuery = messages[messages.length - 1]?.content || '';
      const isFollowUp = messages.length > 1; // More than initial trigger query
      const fallbackReply = getLocalFallbackExplanation(title, desc, diagnostic, engine, domain, lastUserQuery, isFollowUp);
      return NextResponse.json({ reply: fallbackReply });
    }

  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
