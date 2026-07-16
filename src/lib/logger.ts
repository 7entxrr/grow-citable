/**
 * Tiny structured logger that always prefixes messages with a status emoji.
 * Used across the auth + Meta API flow to make terminal output easy to scan.
 */

type LogTag = string;

function ts(): string {
  return new Date().toISOString().slice(11, 23);
}

export const log = {
  info(tag: LogTag, msg: string, data?: unknown) {
    console.log(`ℹ️  [${ts()}] ${tag} ${msg}`, data ?? "");
  },
  start(tag: LogTag, msg: string, data?: unknown) {
    console.log(`▶️  [${ts()}] ${tag} ${msg}`, data ?? "");
  },
  ok(tag: LogTag, msg: string, data?: unknown) {
    console.log(`✅ [${ts()}] ${tag} ${msg}`, data ?? "");
  },
  warn(tag: LogTag, msg: string, data?: unknown) {
    console.warn(`⚠️  [${ts()}] ${tag} ${msg}`, data ?? "");
  },
  fail(tag: LogTag, msg: string, err?: unknown) {
    const detail =
      err instanceof Error
        ? { message: err.message, stack: err.stack?.split("\n").slice(0, 3).join("\n") }
        : err;
    console.error(`❌ [${ts()}] ${tag} ${msg}`, detail ?? "");
  },
};
