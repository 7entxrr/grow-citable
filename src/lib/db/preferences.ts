import "server-only";

import { db } from "./supabase";

export async function setSelectedAccount(
  userId: string,
  adAccountId: string,
  pageId?: string,
): Promise<void> {
  await db.upsertPreferences({
    user_id: userId,
    selected_ad_account_id: adAccountId,
    selected_page_id: pageId ?? null,
  });
}

export async function getSelectedAccount(
  userId: string,
): Promise<{ adAccountId: string | null; pageId: string | null }> {
  const prefs = await db.getPreferences(userId);
  return {
    adAccountId: prefs?.selected_ad_account_id ?? null,
    pageId: prefs?.selected_page_id ?? null,
  };
}

export class NoAdAccountError extends Error {
  code = "NO_AD_ACCOUNT";
  constructor(message: string) {
    super(message);
    this.name = "NoAdAccountError";
  }
}
