import { NextResponse } from "next/server";
import { cancelCaptchaSolve } from "@/lib/captchaSolver";
import { log } from "@/lib/logger";

export const runtime = "nodejs";

export async function POST() {
  log.warn("[api:captcha:cancel]", "User cancelled CAPTCHA solve");
  const result = cancelCaptchaSolve();
  return NextResponse.json(result, { status: result.acknowledged ? 200 : 409 });
}
