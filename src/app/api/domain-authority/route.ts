import { NextResponse } from "next/server";
import { z } from "zod";
import { estimateDomainAuthority } from "@/lib/domainAuthorityEstimator";
import { log } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  url: z
    .string()
    .min(1, "url is required")
    .refine((value) => {
      try {
        new URL(value.startsWith("http") ? value : `https://${value}`);
        return true;
      } catch {
        return false;
      }
    }, "url must be a valid URL"),
});

export async function POST(req: Request) {
  log.start("[api:authority:estimate]", "Incoming request");
  try {
    const json = await req.json();
    const { url } = bodySchema.parse(json);

    const report = await estimateDomainAuthority({ url });

    log.ok("[api:authority:estimate]", "Estimate complete", {
      domain: report.domain,
      score: report.score,
      grade: report.grade,
    });

    return NextResponse.json(report);
  } catch (err) {
    if (err instanceof z.ZodError) {
      log.warn("[api:authority:estimate]", "400 invalid body", err.issues);
      return NextResponse.json(
        { error: "Invalid request", issues: err.issues },
        { status: 400 },
      );
    }
    log.fail("[api:authority:estimate]", "Estimate failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Estimate failed" },
      { status: 500 },
    );
  }
}
