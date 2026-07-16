import { NextResponse } from "next/server";
import { focusCaptchaWindow } from "@/lib/captchaSolver";
import { log } from "@/lib/logger";

export const runtime = "nodejs";

export async function POST() {
  log.info("[api:captcha:focus]", "Re-focus desktop window");
  const result = await focusCaptchaWindow();
  return NextResponse.json(result);
}
