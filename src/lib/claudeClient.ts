import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { AnalysisResult, ScrapedData } from "@/types/analysis";

const aiSchema = z.object({
  topic: z.string(),
  niche: z.string(),
  summary: z.string(),
  targetAudience: z.string(),
  tone: z.string(),
  designStyle: z.string(),
  contentQuality: z.number().min(0).max(100),
  suggestions: z.array(z.string()).min(1).max(5),
  ctaText: z.string(),
  hasCtaAboveFold: z.boolean(),
});

export async function getAISummary(input: {
  url: string;
  title: string;
  description: string;
  headings: ScrapedData["headings"];
  bodyText: string;
}): Promise<AnalysisResult["ai"]> {
  const groqApiKey = process.env.GROQ_API_KEY;
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

  if (!groqApiKey && !anthropicApiKey) {
    return {
      topic: "Analysis unavailable",
      niche: "Unknown",
      summary: "Set GROQ_API_KEY or ANTHROPIC_API_KEY in .env.local to enable AI analysis.",
      targetAudience: "Unknown",
      tone: "Unknown",
      designStyle: "Unknown",
      contentQuality: 0,
      suggestions: ["Add GROQ_API_KEY or ANTHROPIC_API_KEY to enable AI-powered insights."],
      ctaText: "",
      hasCtaAboveFold: false,
    };
  }

  const headingsText = Object.entries(input.headings)
    .map(([tag, texts]) => `${tag}: ${texts.slice(0, 3).join(" | ")}`)
    .join("\n");

  const prompt = `Analyze this website and return ONLY valid JSON matching this schema:
{
  "topic": string,
  "niche": string,
  "summary": string (2-3 sentences),
  "targetAudience": string,
  "tone": string (formal/casual/technical/etc),
  "designStyle": string,
  "contentQuality": number 0-100,
  "suggestions": string[] (top 3 improvements),
  "ctaText": string (primary CTA if any, else empty),
  "hasCtaAboveFold": boolean
}

URL: ${input.url}
Title: ${input.title}
Description: ${input.description}
Headings:
${headingsText}

Body excerpt:
${input.bodyText.slice(0, 3000)}`;

  // Use Groq if available
  if (groqApiKey) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${groqApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.1,
          response_format: { type: "json_object" },
        }),
      });

      if (!res.ok) {
        throw new Error(`Groq API status ${res.status}`);
      }

      const data = await res.json();
      const raw = data.choices?.[0]?.message?.content;
      if (!raw) throw new Error("Empty response from Groq");

      const parsed = aiSchema.parse(JSON.parse(raw.trim()));
      return parsed;
    } catch (err) {
      console.error("Groq API error in getAISummary:", err);
      if (!anthropicApiKey) {
        return getFallbackAIResult(input);
      }
    }
  }

  // Use Anthropic if available
  if (anthropicApiKey) {
    try {
      const client = new Anthropic({ apiKey: anthropicApiKey });
      const message = await client.messages.create({
        model: "claude-sonnet-5",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      });

      const textBlock = message.content.find((b) => b.type === "text");
      const raw = textBlock && "text" in textBlock ? textBlock.text : "";
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON in response");

      const parsed = aiSchema.parse(JSON.parse(jsonMatch[0]));
      return parsed;
    } catch (err) {
      console.error("Claude API error in getAISummary:", err);
      return getFallbackAIResult(input);
    }
  }

  return getFallbackAIResult(input);
}

function getFallbackAIResult(input: { title: string; description: string }): AnalysisResult["ai"] {
  return {
    topic: input.title || "Unknown",
    niche: "Unknown",
    summary: input.description || "Could not generate AI summary.",
    targetAudience: "General audience",
    tone: "Unknown",
    designStyle: "Unknown",
    contentQuality: 50,
    suggestions: [
      "Ensure API key is valid.",
      "Check API rate limits.",
      "Retry analysis later.",
    ],
    ctaText: "",
    hasCtaAboveFold: false,
  };
}
