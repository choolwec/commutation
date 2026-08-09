"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

/**
 * Browser Supabase client, created once per tab.
 *
 * Returns null when env vars are missing so the app still renders during
 * local setup instead of white-screening — every caller must handle null.
 */
export function getSupabase(): SupabaseClient | null {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  cached = createBrowserClient(url, key);
  return cached;
}

export const isSupabaseConfigured = () =>
  Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

/**
 * Signs in anonymously if there's no session yet.
 *
 * This uid is the whole identity model: it's what RLS checks, so it's what
 * makes "only you can read your answers" true rather than merely intended.
 *
 * Safari clears localStorage after 7 days of not visiting an uninstalled
 * site, which would orphan a session — profiles stay re-claimable by name
 * precisely so that can never lock someone out of their own row.
 */
export async function ensureSession(): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session.user.id;

  const { data: signed, error } = await supabase.auth.signInAnonymously();
  if (error) {
    console.error("[commutation] anonymous sign-in failed", error.message);
    return null;
  }
  return signed.user?.id ?? null;
}
