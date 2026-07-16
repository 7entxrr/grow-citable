import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CookieData, Page } from "puppeteer";
import {
  canShowGui,
  closeHeadfulBrowser,
  getHeadfulBrowser,
  isHostedServer,
  applyStealthToPage,
} from "@/lib/puppeteerBrowser";
import { log } from "@/lib/logger";

/**
 * Interactive Google CAPTCHA solver.
 *
 * When the headless SERP fetch hits Google's "/sorry/" CAPTCHA page, we:
 *   1. Open a *visible* Chrome window on the user's desktop pointed at the
 *      same CAPTCHA URL.
 *   2. Wait (up to 5 minutes) for the user to solve it — we detect success
 *      by watching the URL leave /sorry/ AND a real organic <h3> appearing.
 *   3. Pull cookies from that session and persist them to a temp file.
 *   4. On the next SERP call, those cookies are pre-applied to the headless
 *      page, so Google treats the request as the trusted (just-solved)
 *      session.
 *
 * Multiple concurrent searches share a single solve via `inFlightSolve`.
 */

const COOKIE_FILE = join(tmpdir(), "seo-web-google-cookies.json");
const SOLVE_TIMEOUT_MS = 5 * 60_000; // 5 minutes

let inFlightSolve: Promise<void> | null = null;
let activePage: Page | null = null;
let manualConfirmResolver: ((reason: "manual" | "cancel") => void) | null = null;

export function isInteractiveCaptchaEnabled(): boolean {
  // Explicit opt-out wins.
  if (
    process.env.CAPTCHA_INTERACTIVE === "false" ||
    process.env.CAPTCHA_INTERACTIVE === "0"
  ) {
    return false;
  }
  // Auto-disable on hosted servers: a visible Chrome on Railway opens
  // inside their datacenter, not on the user's machine, so the user
  // can't actually solve the CAPTCHA. We bail out cleanly instead of
  // crashing with "Missing X server".
  if (isHostedServer() || !canShowGui()) return false;
  return true;
}

export async function loadSavedCookies(): Promise<CookieData[]> {
  try {
    const raw = await fs.readFile(COOKIE_FILE, "utf8");
    const cookies = JSON.parse(raw) as CookieData[];
    if (!Array.isArray(cookies)) return [];
    return cookies;
  } catch {
    return [];
  }
}

export async function applySavedCookies(page: Page): Promise<number> {
  const cookies = await loadSavedCookies();
  if (cookies.length === 0) return 0;
  try {
    await page.setCookie(...cookies);
    return cookies.length;
  } catch (err) {
    log.warn("[captcha]", "Failed to apply saved cookies", err);
    return 0;
  }
}

export async function saveCookiesFromPage(page: Page): Promise<void> {
  try {
    const cookies = await page.cookies();
    if (!cookies.length) return;
    await fs.writeFile(COOKIE_FILE, JSON.stringify(cookies, null, 2), "utf8");
  } catch (err) {
    log.warn("[captcha]", "Failed to persist cookies", err);
  }
}

/**
 * Open a visible window at `blockedUrl`, wait for the user to solve, save
 * cookies. Concurrent callers share the same solve.
 */
export async function solveCaptchaInteractive(
  blockedUrl: string,
): Promise<{ ok: true; solveDurationMs: number }> {
  // Refuse early on hosts that physically can't show the user a
  // window. Without this we'd crash deep inside Puppeteer with
  // "Missing X server" — the caller can't tell that apart from a
  // genuine CAPTCHA failure.
  if (!isInteractiveCaptchaEnabled()) {
    throw new Error(
      "Google CAPTCHA detected, but interactive solving is disabled on this host (no display server, or running on a hosted environment). Run the app locally to solve the CAPTCHA, or wait for Google to clear the rate-limit on this IP.",
    );
  }

  if (inFlightSolve) {
    log.info(
      "[captcha]",
      "Solve already in progress — waiting for the open window",
    );
    await inFlightSolve;
    return { ok: true, solveDurationMs: 0 };
  }

  const started = Date.now();

  inFlightSolve = (async () => {
    log.warn(
      "[captcha]",
      "Google CAPTCHA detected — opening a desktop window for you to solve",
      { url: blockedUrl.slice(0, 120) },
    );

    const browser = await getHeadfulBrowser();
    const page = await browser.newPage();
    activePage = page;

    try {
      await applyStealthToPage(page);
      await page.setViewport({ width: 1100, height: 800 });
      await page.setExtraHTTPHeaders({
        "Accept-Language": "en-US,en;q=0.9",
      });

      await page.bringToFront().catch(() => {});

      await page.goto(blockedUrl, {
        waitUntil: "domcontentloaded",
        timeout: 30_000,
      });

      // Race three things:
      //   (a) auto-detect: URL left /sorry/ AND looks like a SERP
      //   (b) user clicks "I solved it" → manualConfirmResolver("manual")
      //   (c) user clicks "Cancel"      → manualConfirmResolver("cancel")
      const manual = new Promise<"manual" | "cancel">((resolve) => {
        manualConfirmResolver = resolve;
      });

      // Resilient auto-detection that survives context destruction / page reloads
      const waitForAutoDetect = async (): Promise<"auto"> => {
        const startTime = Date.now();
        while (Date.now() - startTime < SOLVE_TIMEOUT_MS) {
          try {
            const remaining = SOLVE_TIMEOUT_MS - (Date.now() - startTime);
            if (remaining <= 0) break;
            await page.waitForFunction(
              () => {
                if (typeof window === "undefined") return false;
                const href = window.location.href;
                if (href.includes("/sorry/") || href.includes("/recaptcha/"))
                  return false;
                if (!href.includes("google.")) return false;
                // Accept any of: results page, search-tab page, or an organic <h3>.
                return (
                  href.includes("/search?") ||
                  href.includes("/search/") ||
                  Boolean(document.querySelector("a h3, #search, #rso"))
                );
              },
              { timeout: remaining, polling: 1000 },
            );
            return "auto";
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            if (
              msg.includes("destroyed") ||
              msg.includes("navigation") ||
              msg.includes("Waiting failed") ||
              msg.includes("detached")
            ) {
              // Wait 500ms and retry if context was destroyed during navigation
              await new Promise((r) => setTimeout(r, 500));
              continue;
            }
            throw err;
          }
        }
        throw new Error("CAPTCHA solve timeout");
      };

      const outcome = await Promise.race([waitForAutoDetect(), manual]);
      log.info("[captcha]", "Solve outcome", {
        outcome,
        finalUrl: page.url(),
      });

      if (outcome === "cancel") {
        throw new Error(
          "CAPTCHA solving was cancelled. Click Check ranks again to retry, or set SEARCH_PROVIDER=cse in .env.local to skip Puppeteer.",
        );
      }

      await saveCookiesFromPage(page);
      log.ok("[captcha]", "Solved — cookies saved", { path: COOKIE_FILE });
    } finally {
      manualConfirmResolver = null;
      activePage = null;
      await page.close().catch(() => {});
      // Close the visible browser when the run is done so we don't leave
      // a stray Chrome window sitting around. It will re-launch on next CAPTCHA.
      await closeHeadfulBrowser().catch(() => {});
    }
  })().catch((err) => {
    log.fail("[captcha]", "Interactive solve failed", err);
    throw err;
  });

  try {
    await inFlightSolve;
    return { ok: true, solveDurationMs: Date.now() - started };
  } finally {
    inFlightSolve = null;
  }
}

export function isCaptchaSolveInProgress(): boolean {
  return inFlightSolve !== null;
}

/**
 * Called when the user clicks "I solved it" in the UI. Ends the wait
 * immediately and trusts whatever cookies the headful page currently has.
 */
export function confirmCaptchaSolved(): { acknowledged: boolean } {
  if (!manualConfirmResolver) {
    return { acknowledged: false };
  }
  log.info("[captcha]", "User confirmed CAPTCHA solved manually");
  manualConfirmResolver("manual");
  return { acknowledged: true };
}

/** Called when the user clicks "Cancel" in the UI. */
export function cancelCaptchaSolve(): { acknowledged: boolean } {
  if (!manualConfirmResolver) {
    return { acknowledged: false };
  }
  log.warn("[captcha]", "User cancelled CAPTCHA solve");
  manualConfirmResolver("cancel");
  return { acknowledged: true };
}

/** Bring the visible Chrome window to the front if the user has lost it. */
export async function focusCaptchaWindow(): Promise<{ focused: boolean }> {
  if (!activePage) return { focused: false };
  try {
    await activePage.bringToFront();
    return { focused: true };
  } catch {
    return { focused: false };
  }
}
