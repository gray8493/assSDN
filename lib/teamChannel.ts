"use client";

// Shared realtime channel per team topic.
// supabase-js returns the SAME channel instance for a topic; presence handlers
// must be attached BEFORE the first subscribe() or it throws
// "cannot add presence callbacks ... after subscribe()". This module centralizes
// channel creation/presence so page + chat never fight over it.

import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "./supabase";
import { TEAM_CHANNEL } from "./channels";

export interface PresenceMember {
  userId: string;
  name: string;
}

type Entry = {
  channel: RealtimeChannel;
  refCount: number;
  subscribed: boolean;
  joined: boolean;
  identity: PresenceMember | null;
  presenceListeners: Set<(members: PresenceMember[]) => void>;
};

const entries = new Map<string, Entry>();

function emitPresence(entry: Entry) {
  const state = entry.channel.presenceState() as unknown as Record<
    string,
    Array<{ userId?: string; name?: string }>
  >;
  const online = new Map<string, string>();
  for (const metas of Object.values(state)) {
    for (const meta of metas ?? []) {
      if (meta?.userId) online.set(meta.userId, meta.name ?? "Member");
    }
  }
  const members = [...online.entries()].map(([userId, name]) => ({ userId, name }));
  entry.presenceListeners.forEach((fn) => {
    try {
      fn(members);
    } catch {
      // a stale listener must never break the channel
    }
  });
}

/** Acquire the shared team channel (ref-counted). Presence sync is attached here, before any subscribe. */
export function acquireTeamChannel(teamId: string): RealtimeChannel | null {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;

  const topic = TEAM_CHANNEL(teamId);
  let entry = entries.get(topic);
  if (!entry) {
    const channel = supabase.channel(topic);
    entry = {
      channel,
      refCount: 0,
      subscribed: false,
      joined: false,
      identity: null,
      presenceListeners: new Set(),
    };
    // MUST happen before the first subscribe()
    channel.on("presence", { event: "sync" }, () => emitPresence(entry!));
    entries.set(topic, entry);
  }
  entry.refCount += 1;
  return entry.channel;
}

/** Release one reference; tears the channel down when nobody holds it anymore. */
export function releaseTeamChannel(teamId: string) {
  const topic = TEAM_CHANNEL(teamId);
  const entry = entries.get(topic);
  if (!entry) return;
  entry.refCount -= 1;
  if (entry.refCount <= 0) {
    entries.delete(topic);
    getSupabaseBrowserClient()?.removeChannel(entry.channel);
  }
}

/** Subscribe once (idempotent). */
export function ensureTeamChannelSubscribed(teamId: string) {
  const entry = entries.get(TEAM_CHANNEL(teamId));
  if (!entry || entry.subscribed) return;
  entry.subscribed = true;
  entry.channel.subscribe((status) => {
    if (status === "SUBSCRIBED") {
      entry.joined = true;
      if (entry.identity) {
        entry.channel.track(entry.identity).catch(() => undefined);
      }
      emitPresence(entry);
    }
  });
}

/** Publish our identity in presence (call once the user is known). */
export function setTeamPresenceIdentity(teamId: string, member: PresenceMember) {
  const entry = entries.get(TEAM_CHANNEL(teamId));
  if (!entry) return;
  entry.identity = member;
  if (entry.joined) {
    entry.channel.track(member).catch(() => undefined);
  }
}

/** Listen to presence updates. Works whether or not the channel is subscribed yet. */
export function addTeamPresenceListener(
  teamId: string,
  listener: (members: PresenceMember[]) => void
): () => void {
  const topic = TEAM_CHANNEL(teamId);
  const entry = entries.get(topic);
  if (!entry) return () => undefined;
  entry.presenceListeners.add(listener);
  emitPresence(entry);
  return () => {
    entry.presenceListeners.delete(listener);
  };
}
