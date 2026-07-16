import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { getSession, type SessionPayload } from "./session";

export const verifySession = cache(async (): Promise<SessionPayload> => {
  const session = await getSession();
  if (!session?.userId) {
    redirect("/meta/login");
  }
  return session;
});

export const getCurrentUser = cache(async (): Promise<SessionPayload | null> => {
  return getSession();
});

export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session?.userId) {
    throw new Error("Unauthorized");
  }
  return session;
}
