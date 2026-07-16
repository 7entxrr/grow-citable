import { NextResponse } from "next/server";
import { z } from "zod";
import { crawlSite } from "@/lib/siteCrawler";
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
  maxPages: z.number().int().min(1).max(500).optional(),
  concurrency: z.number().int().min(1).max(10).optional(),
  checkExternal: z.boolean().optional(),
});

export async function POST(req: Request) {
  log.start("[api:crawl]", "Incoming request");
  try {
    const json = await req.json();
    const params = bodySchema.parse(json);

    const report = await crawlSite(params);

    log.ok("[api:crawl]", "Crawl complete", {
      domain: report.domain,
      pages: report.summary.pagesCrawled,
      broken: report.summary.brokenLinks,
      redirects: report.summary.redirects,
      duplicates: report.summary.duplicateGroups,
      missingMeta: report.summary.missingMetaPages,
      durationMs: report.durationMs,
    });

    return NextResponse.json(report);
  } catch (err) {
    if (err instanceof z.ZodError) {
      log.warn("[api:crawl]", "400 invalid body", err.issues);
      return NextResponse.json(
        { error: "Invalid request", issues: err.issues },
        { status: 400 },
      );
    }
    log.fail("[api:crawl]", "Crawl failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Crawl failed" },
      { status: 500 },
    );
  }
}
