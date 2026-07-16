import { NextResponse } from "next/server";
import { z } from "zod";
import { runFullAnalysis } from "@/lib/runAnalysis";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  url: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const { url } = bodySchema.parse(await req.json());
    const result = await runFullAnalysis(url);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Analyze error:", err);
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Analysis failed" },
      { status: 500 },
    );
  }
}
