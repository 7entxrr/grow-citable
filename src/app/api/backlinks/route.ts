import { NextResponse } from "next/server";
import { z } from "zod";
import { analyzeBacklinks } from "@/lib/backlinkAnalyzer";
import { log } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 90;

const bodySchema = z.object({
  targetUrl: z
    .string()
    .min(1, "targetUrl is required")
    .refine((value) => {
      try {
        new URL(value.startsWith("http") ? value : `https://${value}`);
        return true;
      } catch {
        return false;
      }
    }, "targetUrl must be a valid URL"),
  candidates: z
    .array(z.string().min(1))
    .min(1, "Provide at least one candidate URL")
    .max(50, "Up to 50 candidates per request"),
  matchMode: z.enum(["strict", "loose"]).optional(),
});

export async function POST(req: Request) {
  log.start("[api:backlinks:analyze]", "Incoming request");
  try {
    const json = await req.json();
    const { targetUrl, candidates, matchMode } = bodySchema.parse(json);

    const result = await analyzeBacklinks({
      targetUrl,
      candidates,
      matchMode,
    });

    log.ok("[api:backlinks:analyze]", "Analysis complete", {
      target: result.targetDomain,
      verified: result.summary.verified,
      missing: result.summary.missing,
      errors: result.summary.errors,
    });

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      log.warn("[api:backlinks:analyze]", "400 invalid body", err.issues);
      return NextResponse.json(
        { error: "Invalid request", issues: err.issues },
        { status: 400 },
      );
    }
    log.fail("[api:backlinks:analyze]", "Failed", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Backlink analysis failed",
      },
      { status: 500 },
    );
  }
}
