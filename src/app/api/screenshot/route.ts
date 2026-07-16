import { NextResponse } from "next/server";
import { z } from "zod";
import { takeScreenshot } from "@/lib/screenshot";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({ url: z.string().min(1) });

export async function POST(req: Request) {
  try {
    const { url } = bodySchema.parse(await req.json());
    const result = await takeScreenshot(url);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Screenshot failed" },
      { status: 500 },
    );
  }
}
