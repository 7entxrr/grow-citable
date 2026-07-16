import { getBrowser, PUPPETEER_USER_AGENT, applyStealthToPage } from "@/lib/puppeteerBrowser";

export interface ScreenshotResult {
  desktop: string;
  mobile: string;
  pageLoadMs: number;
  html: string;
  finalUrl: string;
}

export async function takeScreenshot(url: string): Promise<ScreenshotResult> {
  const normalized =
    url.startsWith("http") ? url : `https://${url}`;

  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await applyStealthToPage(page);
    await page.setViewport({ width: 1280, height: 800 });
    const start = Date.now();
    await page.goto(normalized, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    const pageLoadMs = await page
      .evaluate(() => {
        const t = performance.timing;
        return t.loadEventEnd - t.navigationStart;
      })
      .catch(() => Date.now() - start);

    const html = await page.content();
    const finalUrl = page.url();

    const desktopBuffer = await page.screenshot({
      fullPage: false,
      type: "jpeg",
      quality: 70,
    });

    await page.setViewport({ width: 375, height: 812, isMobile: true });
    await page.goto(normalized, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    const mobileBuffer = await page.screenshot({
      fullPage: false,
      type: "jpeg",
      quality: 70,
    });

    return {
      desktop: Buffer.from(desktopBuffer).toString("base64"),
      mobile: Buffer.from(mobileBuffer).toString("base64"),
      pageLoadMs: pageLoadMs > 0 ? pageLoadMs : Date.now() - start,
      html,
      finalUrl,
    };
  } finally {
    await page.close();
  }
}
