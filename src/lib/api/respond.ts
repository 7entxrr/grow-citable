import { NextResponse } from "next/server";
import { log } from "@/lib/logger";

const MISSING_TOKEN_CODE = "MISSING_TOKEN";
const NO_AD_ACCOUNT_CODE = "NO_AD_ACCOUNT";

/**
 * Standard error response for any /api/meta/* route. Centralizes:
 *   - Logging every error to the terminal with an emoji (no silent failures).
 *   - Detecting auth-related errors so the client can auto-redirect to login.
 *
 * Pass `tag` so it's easy to grep terminal output for the specific route that
 * blew up. Falls back to a generic tag if omitted.
 */
export function errorResponse(err: unknown, tag = "[api]"): NextResponse {
  const message = err instanceof Error ? err.message : "Failed";
  const code = (err as { code?: string })?.code;

  // Always print the failure so it shows up in `npm run dev` with an ❌ prefix
  // even if the route handler forgot to call log.fail itself.
  log.fail(tag, message, err);

  if (message === "Unauthorized") {
    return NextResponse.json({ error: message }, { status: 401 });
  }

  if (code === MISSING_TOKEN_CODE) {
    return NextResponse.json(
      { error: message, tokenMissing: true },
      { status: 401 },
    );
  }

  if (code === NO_AD_ACCOUNT_CODE) {
    return NextResponse.json(
      { error: message, noAdAccount: true },
      { status: 400 },
    );
  }

  return NextResponse.json({ error: message }, { status: 500 });
}

/**
 * For bad input (validation failures, missing required state, etc.). Always
 * logs as a warning so we see why a 400 happened without grepping client code.
 */
export function badRequest(message: string, tag = "[api]", meta?: unknown): NextResponse {
  log.warn(tag, `400 bad request: ${message}`, meta);
  return NextResponse.json({ error: message }, { status: 400 });
}
