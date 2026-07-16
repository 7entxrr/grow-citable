import { NextResponse } from "next/server";
import { z } from "zod";
import { getAISummary } from "@/lib/claudeClient";

export const runtime = "nodejs";

const bodySchema = z.object({
  url: z.string(),
  title: z.string(),
  description: z.string(),
  headings: z.record(z.string(), z.array(z.string())),
  bodyText: z.string(),
});

export async function POST(req: Request) {
  try {
    const input = bodySchema.parse(await req.json());
    const ai = await getAISummary({
      url: input.url,
      title: input.title,
      description: input.description,
      headings: input.headings as Parameters<typeof getAISummary>[0]["headings"],
      bodyText: input.bodyText,
    });
    return NextResponse.json(ai);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AI summary failed" },
      { status: 500 },
    );
  }
}
