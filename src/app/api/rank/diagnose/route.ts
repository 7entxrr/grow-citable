import { NextResponse } from "next/server";
import { fetchWithTimeout } from "@/lib/fetcher";
import { CSE_ENDPOINT } from "@/lib/backlinkDiscovery";
import { log } from "@/lib/logger";

export const runtime = "nodejs";

/**
 * One-shot CSE diagnostic. Visit /api/rank/diagnose in a browser to see
 * the exact status + Google error body for your current keys, without
 * running a full rank check.
 */
export async function GET(req: Request) {
  const apiKey = process.env.GOOGLE_CSE_API_KEY;
  const cx = process.env.GOOGLE_CSE_CX;

  if (!apiKey || !cx) {
    return NextResponse.json(
      {
        ok: false,
        configured: false,
        message:
          "Set GOOGLE_CSE_API_KEY and GOOGLE_CSE_CX in .env.local, then restart `npm run dev`.",
      },
      { status: 503 },
    );
  }

  const u = new URL(req.url);
  const q = u.searchParams.get("q") ?? "site:example.com";

  const url = new URL(CSE_ENDPOINT);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("cx", cx);
  url.searchParams.set("q", q);
  url.searchParams.set("num", "1");

  log.start("[rank:diagnose]", "Pinging Custom Search", { q });

  try {
    const res = await fetchWithTimeout(url.toString(), { timeoutMs: 15_000 });
    const body = await res.text();
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(body);
    } catch {
      /* keep as text */
    }

    if (!res.ok) {
      log.fail("[rank:diagnose]", `CSE ${res.status}`, {
        body: body.slice(0, 1000),
      });
      return NextResponse.json(
        {
          ok: false,
          status: res.status,
          keyPrefix: apiKey.slice(0, 8) + "…",
          cxPrefix: cx.slice(0, 8) + "…",
          googleResponse: parsed ?? body.slice(0, 1000),
        },
        { status: res.status },
      );
    }

    log.ok("[rank:diagnose]", "CSE OK");
    const data = parsed as {
      searchInformation?: { totalResults?: string };
      items?: { link?: string; title?: string }[];
    };
    return NextResponse.json({
      ok: true,
      keyPrefix: apiKey.slice(0, 8) + "…",
      cxPrefix: cx.slice(0, 8) + "…",
      totalResults: data?.searchInformation?.totalResults ?? null,
      firstResult: data?.items?.[0] ?? null,
    });
  } catch (err) {
    log.fail("[rank:diagnose]", "Network error", err);
    return NextResponse.json(
      {
        ok: false,
        message: err instanceof Error ? err.message : "Network error",
      },
      { status: 500 },
    );
  }
}
