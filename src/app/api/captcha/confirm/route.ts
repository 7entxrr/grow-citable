import { NextResponse } from "next/server";
import { confirmCaptchaSolved } from "@/lib/captchaSolver";
import { log } from "@/lib/logger";

export const runtime = "nodejs";

export async function POST() {
  log.start("[api:captcha:confirm]", "User clicked 'I solved it'");
  const result = confirmCaptchaSolved();
  return NextResponse.json(result, { status: result.acknowledged ? 200 : 409 });
}
