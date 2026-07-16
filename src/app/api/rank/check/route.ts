import { NextResponse } from "next/server";
import { z } from "zod";
import { DiscoveryConfigError } from "@/lib/backlinkDiscovery";
import { SerpBlockedError } from "@/lib/googleSerp";
import {
  checkKeywordRanks,
  getRankProvider,
  type RankDepth,
} from "@/lib/rankChecker";
import { log } from "@/lib/logger";

export const runtime = "nodejs";
// Generous timeout because a single keyword can pause for ~5 minutes while
// the user solves an interactive Google CAPTCHA in the desktop window.
export const maxDuration = 300;

const bodySchema = z.object({
  targetDomain: z
    .string()
    .min(1, "targetDomain is required")
    .refine((value) => {
      try {
        new URL(value.startsWith("http") ? value : `https://${value}`);
        return true;
      } catch {
        return false;
      }
    }, "targetDomain must be a valid domain or URL"),
  keywords: z
    .array(z.string().min(1))
    .min(1, "At least one keyword is required")
    .max(25, "Up to 25 keywords per request"),
  depth: z.union([z.literal(10), z.literal(30), z.literal(50), z.literal(100)]).optional(),
  geo: z
    .string()
    .regex(/^[a-zA-Z]{2}$/u, "geo must be a 2-letter country code")
    .optional(),
  hl: z
    .string()
    .regex(/^[a-zA-Z]{2}$/u, "hl must be a 2-letter language code")
    .optional(),
});

export async function GET() {
  return NextResponse.json({
    configured: true,
    provider: getRankProvider(),
  });
}

export async function POST(req: Request) {
  log.start("[api:rank:check]", "Incoming request");
  try {
    const json = await req.json();
    const parsed = bodySchema.parse(json);

    const result = await checkKeywordRanks({
      targetDomain: parsed.targetDomain,
      keywords: parsed.keywords,
      depth: parsed.depth as RankDepth | undefined,
      geo: parsed.geo?.toLowerCase(),
      hl: parsed.hl?.toLowerCase(),
    });

    log.ok("[api:rank:check]", "Rank check complete", {
      target: result.targetDomain,
      ranking: result.summary.ranking,
      notFound: result.summary.notFound,
      errors: result.summary.errors,
      queriesUsed: result.summary.totalQueriesUsed,
    });

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      log.warn("[api:rank:check]", "400 invalid body", err.issues);
      return NextResponse.json(
        { error: "Invalid request", issues: err.issues },
        { status: 400 },
      );
    }
    if (err instanceof SerpBlockedError) {
      log.warn("[api:rank:check]", "SERP blocked");
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: 429 },
      );
    }
    if (err instanceof DiscoveryConfigError) {
      log.warn("[api:rank:check]", "CSE not configured");
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: 503 },
      );
    }
    log.fail("[api:rank:check]", "Failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Rank check failed" },
      { status: 500 },
    );
  }
}
