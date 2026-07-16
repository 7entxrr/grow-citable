import "server-only";

import { encrypt, decrypt } from "@/lib/crypto/encryption";
import { db } from "./supabase";

export async function saveToken(
  userId: string,
  accessToken: string,
  expiresAt?: number,
): Promise<void> {
  const encrypted = await encrypt(accessToken);
  await db.upsertToken({
    user_id: userId,
    access_token: encrypted,
    expires_at: expiresAt ?? null,
  });
}

export async function getToken(userId: string): Promise<string | null> {
  const row = await db.getToken(userId);
  if (!row) return null;
  return decrypt(row.access_token);
}

export async function deleteToken(userId: string): Promise<void> {
  await db.deleteToken(userId);
}
