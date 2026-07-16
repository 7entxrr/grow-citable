import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import puppeteer, { type Browser, type LaunchOptions } from "puppeteer";
import { log } from "@/lib/logger";

let browserPromise: Promise<Browser> | null = null;
let headfulBrowserPromise: Promise<Browser> | null = null;

/**
 * Where can we find a Chrome binary to drive?
 *
 * Order of preference:
 *   1. `PUPPETEER_EXECUTABLE_PATH` env var (explicit override; this is
 *      what we set on Railway / Docker to point at the system Chromium
 *      from `apt-get install chromium`).
 *   2. Puppeteer's own download cache (set by `npx puppeteer browsers
 *      install chrome` locally).
 *   3. Common system locations on Linux containers (Debian / Alpine).
 *      We probe these directly so a deploy without
 *      `PUPPETEER_EXECUTABLE_PATH` configured still works on Railway.
 *
 * Returning undefined = let Puppeteer use whatever it bundled. On
 * Vercel that's nothing (we skip the download); on Railway with our
 * Dockerfile we'll have set the env var, so we never reach that case.
 */
function findInstalledChrome(): string | undefined {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  const cacheDir =
    process.env.PUPPETEER_CACHE_DIR ?? join(homedir(), ".cache/puppeteer");
  const chromeDir = join(cacheDir, "chrome");
  if (existsSync(chromeDir)) {
    try {
      const versions = readdirSync(chromeDir).sort().reverse();
      for (const v of versions) {
        const macArm = join(
          chromeDir,
          v,
          "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
        );
        if (existsSync(macArm)) return macArm;
        const macX64 = join(
          chromeDir,
          v,
          "chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
        );
        if (existsSync(macX64)) return macX64;
        const win = join(chromeDir, v, "chrome-win64/chrome.exe");
        if (existsSync(win)) return win;
        const linux = join(chromeDir, v, "chrome-linux64/chrome");
        if (existsSync(linux)) return linux;
      }
    } catch {
      /* ignore */
    }
  }

  // Linux container fallbacks — these are the canonical paths
  // `chromium` and `google-chrome-stable` install to from apt.
  for (const candidate of [
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
  ]) {
    if (existsSync(candidate)) return candidate;
  }

  return undefined;
}

/**
 * Are we running in an environment that can show real GUI windows?
 *
 * Heuristic:
 *   - macOS desktop: `process.platform === "darwin"` (always assumed
 *     to have a display in our use case).
 *   - Linux: only if `DISPLAY` is set AND we're in a development /
 *     unspecified env. Production hosts (Vercel / Railway / Render)
 *     have no X server even if Linux.
 *
 * If this returns false we silently downgrade headful → headless so
 * Puppeteer doesn't crash with "Missing X server".
 */
export function canShowGui(): boolean {
  if (process.env.PUPPETEER_FORCE_HEADLESS === "true") return false;
  // Never attempt a visible window on a hosted/container deploy — some
  // platforms export DISPLAY even though no X server is actually running,
  // which triggers Puppeteer's "Missing X server" crash.
  if (isHostedServer()) return false;
  if (process.platform === "darwin") return true;
  if (process.platform === "win32") return true;
  // Linux desktop: require a real display and explicit opt-in for headful
  // (headful is only used for CAPTCHA / LinkedIn login on dev machines).
  if (process.platform === "linux") {
    return (
      Boolean(process.env.DISPLAY) &&
      process.env.PUPPETEER_ALLOW_HEADFUL === "true"
    );
  }
  return false;
}

/** True when we're running on a long-running production server, not a
 * developer's laptop. Used to disable interactive features that
 * literally cannot work over the network (a Chrome window opening on
 * a Railway container is invisible to the user across the internet). */
export function isHostedServer(): boolean {
  return Boolean(
    process.env.RAILWAY_ENVIRONMENT ||
      process.env.RAILWAY_ENVIRONMENT_NAME ||
      process.env.RAILWAY_PROJECT_ID ||
      process.env.RAILWAY_SERVICE_ID ||
      process.env.RAILWAY_REPLICA_ID ||
      process.env.RAILWAY_PUBLIC_DOMAIN ||
      process.env.RENDER ||
      process.env.RENDER_SERVICE_NAME ||
      process.env.FLY_APP_NAME ||
      process.env.VERCEL ||
      process.env.VERCEL_ENV ||
      process.env.CF_PAGES ||
      process.env.AWS_EXECUTION_ENV ||
      process.env.KUBERNETES_SERVICE_HOST ||
      (process.env.NODE_ENV === "production" &&
        process.platform === "linux" &&
        !process.env.PUPPETEER_ALLOW_HEADFUL),
  );
}

function isMissingXServerError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /missing x server|headful browser/i.test(msg);
}

/** Launch Chrome; if headful was requested but there's no X server,
 * retry once in headless mode so Railway never hard-crashes. */
async function launchBrowser(options: LaunchOptions): Promise<Browser> {
  try {
    return await puppeteer.launch(options);
  } catch (err) {
    if (
      options.headless === false &&
      isMissingXServerError(err)
    ) {
      log.warn(
        "[puppeteer]",
        "Headful launch failed (no X server) — retrying headless",
      );
      headfulBrowserPromise = null;
      return puppeteer.launch({
        ...options,
        headless: true,
        defaultViewport: options.defaultViewport ?? { width: 1100, height: 820 },
      });
    }
    throw err;
  }
}

/** Shared headless Chrome instance (screenshots, SERP scraping, etc.). */
export async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    const executablePath = findInstalledChrome();
    browserPromise = launchBrowser({
      headless: true,
      executablePath,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--headless=new",
        "--disable-blink-features=AutomationControlled",
        "--disable-features=IsolateOrigins,site-per-process,SitePerProcess",
      ],
    });
  }
  return browserPromise;
}

/**
 * Visible Chrome window — used for interactive CAPTCHA solving and
 * the LinkedIn login flow.
 *
 * The args here are tuned for STEALTH so that Google's automation
 * detector doesn't refuse to sign the user in (the dreaded
 * "Couldn't sign you in — this browser may not be secure" page):
 *
 *   --disable-blink-features=AutomationControlled
 *     Removes the `navigator.webdriver === true` flag at the C++
 *     level. Without this, Google rejects the OAuth flow on sight.
 *
 *   --disable-features=IsolateOrigins,site-per-process,...
 *     Disables a handful of automation-only features that real
 *     consumer Chrome doesn't have enabled.
 *
 *   --no-default-browser-check, --no-first-run
 *     Avoid the "set as default browser?" dialog stealing focus
 *     during login.
 *
 *   --excludeSwitches via `ignoreDefaultArgs`
 *     The `--enable-automation` switch is added by Puppeteer by
 *     default and is the single biggest tell. We strip it here.
 *
 * NB: Stealth is a moving target — Google updates detection, we
 * update evasion. This config works as of mid-2026; if Google
 * changes again, additional patches go in `linkedinLogin.ts` via
 * `page.evaluateOnNewDocument()`.
 */
export async function getHeadfulBrowser(): Promise<Browser> {
  if (!headfulBrowserPromise) {
    const executablePath = findInstalledChrome();
    // Auto-fallback to headless when there's no display server. This
    // keeps Railway / Render / generic Linux containers from crashing
    // with "Missing X server to start the headful browser". The
    // CAPTCHA / login interactive flows that depend on a *visible*
    // window should refuse upstream (see captchaSolver.ts and
    // linkedinLogin.ts) — this is just a safety net.
    const useHeadful = canShowGui();
    headfulBrowserPromise = launchBrowser({
      headless: useHeadful ? false : true,
      executablePath,
      defaultViewport: useHeadful ? null : { width: 1100, height: 820 },
      ignoreDefaultArgs: ["--enable-automation"],
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--window-size=1100,820",
        ...(useHeadful ? [] : ["--headless=new"]),
        "--disable-blink-features=AutomationControlled",
        "--disable-features=IsolateOrigins,site-per-process,SitePerProcess",
        "--no-default-browser-check",
        "--no-first-run",
        "--password-store=basic",
        "--use-mock-keychain",
      ],
    });
  }
  return headfulBrowserPromise;
}

export async function closeHeadfulBrowser(): Promise<void> {
  if (!headfulBrowserPromise) return;
  try {
    const b = await headfulBrowserPromise;
    await b.close();
  } catch {
    /* ignore */
  } finally {
    headfulBrowserPromise = null;
  }
}

export const PUPPETEER_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

import type { Page } from "puppeteer";

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
];

export function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

export async function applyStealthToPage(page: Page): Promise<void> {
  const ua = getRandomUserAgent();
  await page.setUserAgent(ua);
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, "webdriver", {
      get: () => undefined,
    });
    (window as any).chrome = {
      runtime: {},
    };
    Object.defineProperty(navigator, "languages", {
      get: () => ["en-US", "en"],
    });
    Object.defineProperty(navigator, "plugins", {
      get: () => [1, 2, 3, 4, 5],
    });
  });
}
