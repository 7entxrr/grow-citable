import "server-only";

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "meta_session";
const SESSION_MAX_AGE = 7 * 24 * 60 * 60;

export interface SessionPayload {
  userId: string;
  name?: string;
  email?: string;
  picture?: string;
  expiresAt: number;
}

function getSecretKey(): Uint8Array {
  const secret =
    process.env.SESSION_SECRET ??
    process.env.ENCRYPTION_KEY ??
    "dev-session-secret-change-in-production";
  return new TextEncoder().encode(secret);
}

export async function encryptSession(
  payload: Omit<SessionPayload, "expiresAt">,
): Promise<string> {
  const expiresAt = Date.now() + SESSION_MAX_AGE * 1000;
  return new SignJWT({ ...payload, expiresAt })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecretKey());
}

export async function decryptSession(
  token: string | undefined,
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      algorithms: ["HS256"],
    });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function createSession(
  data: Omit<SessionPayload, "expiresAt">,
): Promise<void> {
  const token = await encryptSession(data);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await decryptSession(token);
  // NOTE: Don't delete invalid cookies here — Server Components can't modify
  // cookies in Next.js 16. The proxy/middleware handles cleanup before requests
  // reach Server Components (see src/proxy.ts).
  return session?.userId ? session : null;
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
