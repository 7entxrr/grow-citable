import { NextResponse } from "next/server";
import { isCaptchaSolveInProgress } from "@/lib/captchaSolver";

export const runtime = "nodejs";

/** Lightweight status probe so the client can show a banner while
 * the user solves a Google CAPTCHA in the desktop window. */
export async function GET() {
  return NextResponse.json({
    inProgress: isCaptchaSolveInProgress(),
  });
}


