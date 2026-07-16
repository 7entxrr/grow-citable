import { NextResponse } from "next/server";
import { z } from "zod";
import { runOnPageSeoCheck } from "@/lib/onPageSeoChecker";
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
  targetKeyword: z
    .string()
    .max(120, "Keyword too long")
    .optional()
    .nullable(),
});

export async function POST(req: Request) {
  log.start("[api:onpage:check]", "Incoming request");
  try {
    const json = await req.json();
    const { url, targetKeyword } = bodySchema.parse(json);

    const report = await runOnPageSeoCheck({
      url,
      targetKeyword: targetKeyword ?? null,
    });

    log.ok("[api:onpage:check]", "Audit complete", {
      finalUrl: report.finalUrl,
      score: report.score,
      grade: report.grade,
      pass: report.summary.pass,
      warn: report.summary.warn,
      fail: report.summary.fail,
    });

    return NextResponse.json(report);
  } catch (err) {
    if (err instanceof z.ZodError) {
      log.warn("[api:onpage:check]", "400 invalid body", err.issues);
      return NextResponse.json(
        { error: "Invalid request", issues: err.issues },
        { status: 400 },
      );
    }
    log.fail("[api:onpage:check]", "Audit failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Audit failed" },
      { status: 500 },
    );
  }
}
