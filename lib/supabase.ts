"use client";

// Browser Supabase client for Realtime subscriptions only.
// The next public vars are inlined at build time; no session/storage needed
// because channels are public broadcast-only.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";

let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Supabase client unavailable: missing NEXT_PUBLIC_SUPABASE_* env vars");
    return null;
  }
  if (!browserClient) {
    browserClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { params: { eventsPerSecond: 20 } },
    });
  }
  return browserClient;
}
