const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeoutMs?: number } = {},
): Promise<Response> {
  const { timeoutMs = 15000, ...init } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        ...init.headers,
      },
      redirect: "follow",
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchHtml(url: string): Promise<{
  html: string;
  finalUrl: string;
}> {
  const res = await fetchWithTimeout(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }
  const html = await res.text();
  return { html, finalUrl: res.url };
}

export async function fetchSecurityHeaders(url: string): Promise<{
  isHttps: boolean;
  xFrameOptions: string | null;
  csp: string | null;
  setCookie: string | null;
}> {
  try {
    const res = await fetchWithTimeout(url, { method: "HEAD" });
    return {
      isHttps: url.startsWith("https://") || res.url.startsWith("https://"),
      xFrameOptions: res.headers.get("x-frame-options"),
      csp: res.headers.get("content-security-policy"),
      setCookie: res.headers.get("set-cookie"),
    };
  } catch {
    return {
      isHttps: url.startsWith("https://"),
      xFrameOptions: null,
      csp: null,
      setCookie: null,
    };
  }
}

export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    parsed.hash = "";
    let path = parsed.pathname;
    if (path.endsWith("/") && path.length > 1) {
      path = path.slice(0, -1);
    }
    parsed.pathname = path;
    return parsed.toString();
  } catch {
    return url;
  }
}

export function resolveUrl(base: string, relative: string): string {
  try {
    return new URL(relative, base).toString();
  } catch {
    return relative;
  }
}
