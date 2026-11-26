import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type StorageMode = "supabase" | "edge_fallback";

let cachedAdminClient: SupabaseClient | null = null;
let cachedKeySignature = "";

/**
 * Canonical server-side Supabase client for API routes and repositories.
 * Prefers SUPABASE_SERVICE_ROLE_KEY when configured (allowing strict RLS),
 * and falls back cleanly to NEXT_PUBLIC_SUPABASE_ANON_KEY during zero-friction pilots.
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const sig = `${url}:${key.slice(0, 12)}`;
  if (cachedAdminClient && cachedKeySignature === sig) {
    return cachedAdminClient;
  }

  cachedAdminClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  cachedKeySignature = sig;
  return cachedAdminClient;
}

export function hasServiceRoleKey(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}
