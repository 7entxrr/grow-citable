import { NextResponse } from "next/server";
import { z } from "zod";
import {
  DiscoveryConfigError,
  discoverBacklinkCandidates,
  getDiscoveryProvider,
} from "@/lib/backlinkDiscovery";
import { SerpBlockedError } from "@/lib/googleSerp";
import { log } from "@/lib/logger";

export const runtime = "nodejs";
// Generous timeout in case the user has to solve a Google CAPTCHA mid-run.
export const maxDuration = 300;

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
  maxResults: z.number().int().min(10).max(100).optional(),
});

export async function GET() {
  return NextResponse.json({
    configured: true,
    provider: getDiscoveryProvider(),
  });
}

export async function POST(req: Request) {
  log.start("[api:backlinks:discover]", "Incoming request");
  try {
    const json = await req.json();
    const { targetUrl, maxResults } = bodySchema.parse(json);

    const result = await discoverBacklinkCandidates({ targetUrl, maxResults });

    log.ok("[api:backlinks:discover]", "Returned candidates", {
      target: targetUrl,
      found: result.candidates.length,
      queriesUsed: result.queriesUsed,
    });

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      log.warn("[api:backlinks:discover]", "400 invalid body", err.issues);
      return NextResponse.json(
        { error: "Invalid request", issues: err.issues },
        { status: 400 },
      );
    }
    if (err instanceof SerpBlockedError) {
      log.warn("[api:backlinks:discover]", "SERP blocked");
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: 429 },
      );
    }
    if (err instanceof DiscoveryConfigError) {
      log.warn("[api:backlinks:discover]", "CSE not configured");
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: 503 },
      );
    }
    log.fail("[api:backlinks:discover]", "Failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Discovery failed" },
      { status: 500 },
    );
  }
}
