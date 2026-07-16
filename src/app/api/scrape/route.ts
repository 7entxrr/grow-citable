import { NextResponse } from "next/server";
import { z } from "zod";
import { scrapeWebsite } from "@/lib/scraper";
import { parseMeta } from "@/lib/metaParser";

export const runtime = "nodejs";

const bodySchema = z.object({ url: z.string().min(1) });

export async function POST(req: Request) {
  try {
    const { url } = bodySchema.parse(await req.json());
    const scraped = await scrapeWebsite(url);
    const meta = parseMeta(scraped);
    return NextResponse.json({ scraped, meta });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Scrape failed" },
      { status: 500 },
    );
  }
}
