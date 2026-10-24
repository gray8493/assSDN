// Server-side Supabase Realtime broadcast helper.
// Uses the Realtime REST endpoint so it works from Vercel serverless functions
// (no persistent WebSocket connection needed):
//   POST {SUPABASE_URL}/realtime/v1/api/broadcast/{topic}/events/{event}
// Clients subscribe with the browser client (lib/supabase.ts) on a PUBLIC
// channel named team:{teamId}/user:{userId}.
// Failures are logged but never break the main DB operation.

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";

export { TEAM_CHANNEL, USER_CHANNEL, EVENTS } from "@/lib/channels";

export async function broadcastEvent(
  topic: string,
  event: string,
  payload: unknown
): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Realtime broadcast skipped: missing Supabase env vars");
    return false;
  }

  try {
    const res = await fetch(
      `${SUPABASE_URL}/realtime/v1/api/broadcast/${encodeURIComponent(
        topic
      )}/events/${encodeURIComponent(event)}`,
      {
        method: "POST",
        headers: {
          apikey: SUPABASE_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload ?? {}),
      }
    );
    if (!res.ok) {
      console.error(
        `Realtime broadcast failed (${res.status}) topic=${topic} event=${event}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.error("Realtime broadcast error:", error);
    return false;
  }
}
