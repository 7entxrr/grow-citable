import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export interface UserTokenRow {
  user_id: string;
  access_token: string;
  expires_at: number | null;
}

export interface UserPreferencesRow {
  user_id: string;
  selected_ad_account_id: string | null;
  selected_page_id: string | null;
}

export interface ApiLogRow {
  user_id: string | null;
  endpoint: string;
  status: number;
}

// In-memory fallback stores
const memoryTokens = new Map<string, UserTokenRow>();
const memoryPreferences = new Map<string, UserPreferencesRow>();
const memoryLogs: ApiLogRow[] = [];

function getSupabaseClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

const supabase = getSupabaseClient();

export const db = {
  async upsertToken(row: UserTokenRow): Promise<void> {
    if (supabase) {
      const { error } = await supabase.from("user_tokens").upsert(
        {
          user_id: row.user_id,
          access_token: row.access_token,
          expires_at: row.expires_at,
        },
        { onConflict: "user_id" },
      );
      if (error) throw error;
      return;
    }
    memoryTokens.set(row.user_id, row);
  },

  async getToken(userId: string): Promise<UserTokenRow | null> {
    if (supabase) {
      const { data, error } = await supabase
        .from("user_tokens")
        .select("*")
        .eq("user_id", userId)
        .single();
      if (error || !data) return null;
      return data as UserTokenRow;
    }
    return memoryTokens.get(userId) ?? null;
  },

  async deleteToken(userId: string): Promise<void> {
    if (supabase) {
      await supabase.from("user_tokens").delete().eq("user_id", userId);
      return;
    }
    memoryTokens.delete(userId);
  },

  async upsertPreferences(row: UserPreferencesRow): Promise<void> {
    if (supabase) {
      const { error } = await supabase.from("user_preferences").upsert(row, {
        onConflict: "user_id",
      });
      if (error) throw error;
      return;
    }
    memoryPreferences.set(row.user_id, row);
  },

  async getPreferences(userId: string): Promise<UserPreferencesRow | null> {
    if (supabase) {
      const { data, error } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", userId)
        .single();
      if (error || !data) return null;
      return data as UserPreferencesRow;
    }
    return memoryPreferences.get(userId) ?? null;
  },

  async logApi(entry: ApiLogRow): Promise<void> {
    if (supabase) {
      await supabase.from("api_logs").insert(entry);
      return;
    }
    memoryLogs.push(entry);
    if (memoryLogs.length > 500) memoryLogs.shift();
  },
};

export function isUsingMemoryDb(): boolean {
  return supabase === null;
}
