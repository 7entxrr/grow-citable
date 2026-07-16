import { NextResponse } from "next/server";
import { z } from "zod";
import { spellCheckSite } from "@/lib/siteSpellChecker";
import { log } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 300;

const bodySchema = z.object({
  seedUrl: z
    .string()
    .min(1, "seedUrl is required")
    .refine((value) => {
      try {
        new URL(value.startsWith("http") ? value : `https://${value}`);
        return true;
      } catch {
        return false;
      }
    }, "seedUrl must be a valid URL"),
  maxPages: z.number().int().min(1).max(300).optional(),
});

export async function POST(req: Request) {
  log.start("[api:spellcheck]", "Incoming request");
  try {
    const json = await req.json();
    const params = bodySchema.parse(json);

    const report = await spellCheckSite(params);

    log.ok("[api:spellcheck]", "Spell-check complete", {
      domain: report.domain,
      pagesChecked: report.summary.pagesChecked,
      totalSpelling: report.summary.totalSpellingIssues,
      totalGrammar: report.summary.totalGrammarIssues,
      durationMs: report.durationMs,
    });

    return NextResponse.json(report);
  } catch (err) {
    if (err instanceof z.ZodError) {
      log.warn("[api:spellcheck]", "400 invalid body", err.issues);
      return NextResponse.json(
        { error: "Invalid request", issues: err.issues },
        { status: 400 },
      );
    }
    log.fail("[api:spellcheck]", "Spell-check failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Spell-check failed" },
      { status: 500 },
    );
  }
}
