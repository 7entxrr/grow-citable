import { log } from "@/lib/logger";

const GRAPH_VERSION = "v19.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

// Active scopes. Each non-default scope MUST be added in the FB app:
// Use cases → Customize → Permissions and features → Add → Ready for testing
//
// - public_profile     : default
// - business_management: lets us list /me/businesses
// - ads_read           : read ad accounts, campaigns, adsets, ads, insights
// - ads_management     : *required* to pause / activate / update / create
//                        anything (otherwise Meta returns "code 100/33 object
//                        does not exist" which is a misleading permission error)
const SCOPES = [
  "public_profile",
  "business_management",
  "ads_read",
  "ads_management",
].join(",");

export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is missing from .env.local. This app talks to the real Facebook Graph API — set ${name} before starting the dev server.`,
    );
  }
  return value;
}

export function buildAuthUrl(state: string): string {
  const appId = requireEnv("FACEBOOK_APP_ID");
  const redirect_uri = `${getAppUrl()}/api/auth/facebook/callback`;
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri,
    state,
    scope: SCOPES,
    response_type: "code",
  });
  const url = `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth?${params}`;
  log.start("[fb:auth]", "Building OAuth URL", {
    scopes: SCOPES,
    redirect_uri,
    app_id: appId,
  });
  return url;
}

export interface TokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
}

export interface FacebookUser {
  id: string;
  name: string;
  email?: string;
  picture?: { data?: { url?: string } };
}

interface FbErrorBody {
  error?: {
    message?: string;
    error_user_msg?: string;
    error_user_title?: string;
    code?: number;
    error_subcode?: number;
    type?: string;
    fbtrace_id?: string;
  };
}

export function fbError(data: FbErrorBody, fallback: string): Error {
  const e = data.error;
  if (!e) return new Error(fallback);
  const parts = [e.error_user_msg ?? e.message ?? fallback];
  if (e.code) parts.push(`(code ${e.code}${e.error_subcode ? `/${e.error_subcode}` : ""})`);
  if (e.fbtrace_id) parts.push(`trace=${e.fbtrace_id}`);
  // Always log graph errors when they're constructed so the terminal shows
  // exactly what Meta returned, even if the calling route forgets to log.
  log.fail("[fb:graph]", fallback, {
    message: e.message,
    user_msg: e.error_user_msg,
    code: e.code,
    subcode: e.error_subcode,
    type: e.type,
    fbtrace_id: e.fbtrace_id,
  });
  return new Error(parts.join(" "));
}

function logFbCall(
  tag: string,
  ok: boolean,
  payload: FbErrorBody | unknown,
  extra?: Record<string, unknown>,
) {
  if (ok) {
    log.ok(tag, "Facebook API ok", extra);
  } else {
    const e = (payload as FbErrorBody).error;
    log.fail(tag, "Facebook API error", {
      message: e?.message,
      user_msg: e?.error_user_msg,
      code: e?.code,
      subcode: e?.error_subcode,
      type: e?.type,
      fbtrace_id: e?.fbtrace_id,
      ...extra,
    });
  }
}

export async function exchangeCode(code: string): Promise<TokenResponse> {
  log.start("[fb:exchange]", "Exchanging code for short-lived token");
  const params = new URLSearchParams({
    client_id: requireEnv("FACEBOOK_APP_ID"),
    client_secret: requireEnv("FACEBOOK_APP_SECRET"),
    redirect_uri: `${getAppUrl()}/api/auth/facebook/callback`,
    code,
  });

  const res = await fetch(`${GRAPH_BASE}/oauth/access_token?${params}`);
  const data = await res.json();
  logFbCall("[fb:exchange]", res.ok && !data.error, data, {
    status: res.status,
    expires_in: data?.expires_in,
  });
  if (!res.ok || data.error) {
    throw fbError(data, "Failed to exchange code");
  }
  return data;
}

/**
 * Exchanges a short-lived (~1-2 hour) user access token for a long-lived (~60 day) one.
 * Long-lived tokens are required for any real-world ads use case since the user shouldn't
 * have to re-auth every hour.
 *
 * See: https://developers.facebook.com/docs/facebook-login/guides/access-tokens/get-long-lived
 */
export async function exchangeForLongLivedToken(
  shortLivedToken: string,
): Promise<TokenResponse> {
  log.start("[fb:long-lived]", "Upgrading to long-lived token");
  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: requireEnv("FACEBOOK_APP_ID"),
    client_secret: requireEnv("FACEBOOK_APP_SECRET"),
    fb_exchange_token: shortLivedToken,
  });

  const res = await fetch(`${GRAPH_BASE}/oauth/access_token?${params}`);
  const data = await res.json();
  logFbCall("[fb:long-lived]", res.ok && !data.error, data, {
    expires_in_days: data?.expires_in ? Math.round(data.expires_in / 86400) : null,
  });
  if (!res.ok || data.error) {
    throw fbError(data, "Failed to get long-lived token");
  }
  return data;
}

export async function getMe(accessToken: string): Promise<FacebookUser> {
  log.start("[fb:me]", "Fetching user profile");
  const params = new URLSearchParams({
    access_token: accessToken,
    fields: "id,name,picture",
  });
  const res = await fetch(`${GRAPH_BASE}/me?${params}`);
  const data = await res.json();
  logFbCall("[fb:me]", res.ok && !data.error, data, {
    user_id: data?.id,
    name: data?.name,
  });
  if (!res.ok || data.error) {
    throw fbError(data, "Failed to fetch user");
  }
  return data;
}

export interface FacebookPage {
  id: string;
  name: string;
  access_token?: string;
  category?: string;
}

export async function getPages(accessToken: string): Promise<FacebookPage[]> {
  log.start("[fb:pages]", "Fetching Facebook Pages");
  const params = new URLSearchParams({
    access_token: accessToken,
    fields: "id,name,access_token,category",
    limit: "100",
  });
  const res = await fetch(`${GRAPH_BASE}/me/accounts?${params}`);
  const data = await res.json();
  logFbCall("[fb:pages]", res.ok && !data.error, data, {
    count: data?.data?.length ?? 0,
  });
  if (!res.ok || data.error) {
    throw fbError(data, "Failed to fetch pages");
  }
  return data.data ?? [];
}

export function generateState(): string {
  return crypto.randomUUID();
}
