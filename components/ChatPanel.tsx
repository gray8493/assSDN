"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { MessagesSquare, Send, Loader2, AlertCircle } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { TEAM_CHANNEL } from "@/lib/channels";
interface ChatMessage {
  id: string;
  content: string;
  teamId: string;
  senderId: string;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    email: string;
  };
}

interface ChatPanelProps {
  teamId: string;
  currentUserId: string;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDay(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString();
}

export default function ChatPanel({ teamId, currentUserId }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const scrollToBottom = useCallback((smooth = true) => {
    const el = scrollContainerRef.current;
    if (el) {
      el.scrollTo({
        top: el.scrollHeight,
        behavior: smooth ? "smooth" : "auto",
      });
    }
  }, []);

  /** Append avoiding duplicates by id (dedupe for broadcast/optimistic overlap) */
  const appendMessages = useCallback((incoming: ChatMessage[]) => {
    setMessages((prev) => {
      const seen = new Set(prev.map((m) => m.id));
      const fresh = incoming.filter((m) => !seen.has(m.id));
      if (fresh.length === 0) return prev;
      return [...prev, ...fresh];
    });
  }, []);

  /** Initial load + subscribe to realtime broadcast */
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setIsLoading(true);
        setError("");
        const res = await fetch(`/api/teams/${teamId}/messages?limit=50`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to load chat history");
        }
        const data = await res.json();
        if (cancelled) return;
        setMessages(data.messages || []);
        setHasMore(!!data.hasMore);
        requestAnimationFrame(() => scrollToBottom(false));
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Error loading chat");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError("Realtime unavailable: missing Supabase configuration");
      return () => {
        cancelled = true;
      };
    }

    const channel = supabase
      .channel(TEAM_CHANNEL(teamId))
      .on("broadcast", { event: "message.new" }, ({ payload }) => {
        const message = payload as ChatMessage | undefined;
        if (!message?.id) return;
        // Do not scroll-fetch: just append (dedupe by id)
        appendMessages([message]);
        // Always follow new messages when the user is near the bottom
        const el = scrollContainerRef.current;
        if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 160) {
          requestAnimationFrame(() => scrollToBottom(false));
        }
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [teamId, appendMessages, scrollToBottom]);

  /** Send message: optimistic echo is handled by dedupe when POST resolves */
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = input.trim();
    if (!content || isSending) return;

    setInput("");
    setIsSending(true);
    setError("");

    try {
      const res = await fetch(`/api/teams/${teamId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        const data = await res.json();
        setInput(content); // restore input so nothing is lost
        throw new Error(data.error || "Failed to send message");
      }
      const message: ChatMessage = await res.json();
      appendMessages([message]);
      requestAnimationFrame(() => scrollToBottom(true));
      inputRef.current?.focus();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Network error while sending"
      );
    } finally {
      setIsSending(false);
    }
  };

  /** "Load older" button: fetch page before the oldest message we have */
  const handleLoadOlder = async () => {
    if (isLoadingOlder || !hasMore) return;
    setIsLoadingOlder(true);
    try {
      const before = messages[0]?.createdAt;
      const res = await fetch(
        `/api/teams/${teamId}/messages?limit=50${before ? `&before=${encodeURIComponent(before)}` : ""}`
      );
      if (res.ok) {
        const data = await res.json();
        const older = (data.messages || []) as ChatMessage[];
        setMessages((prev) => [...older.reverse(), ...prev]);
        setHasMore(!!data.hasMore);
      }
    } finally {
      setIsLoadingOlder(false);
    }
  };

  const groups = useMemo(() => {
    const out: { day: string; items: ChatMessage[] }[] = [];
    for (const m of messages) {
      const day = formatDay(m.createdAt);
      const last = out[out.length - 1];
      if (last && last.day === day) {
        last.items.push(m);
      } else {
        out.push({ day, items: [m] });
      }
    }
    return out;
  }, [messages]);

  return (
    <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-[520px] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <MessagesSquare className="w-4 h-4 text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Team Chat
          </h3>
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </span>
        </div>
        <span className="text-[10px] text-slate-400">
          {messages.length} message{messages.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-5 py-4 space-y-1"
      >
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
          </div>
        ) : error && messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-6">
            <AlertCircle className="w-6 h-6 text-rose-500 mb-2" />
            <p className="text-xs text-slate-500">{error}</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-6">
            <MessagesSquare className="w-8 h-8 text-slate-300 dark:text-slate-700 mb-2" />
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              No messages yet
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Say hi to the team to kick off the conversation!
            </p>
          </div>
        ) : (
          <>
            {hasMore && (
              <div className="flex justify-center pb-3">
                <button
                  type="button"
                  onClick={handleLoadOlder}
                  disabled={isLoadingOlder}
                  className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-500 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {isLoadingOlder && (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  )}
                  Load earlier messages
                </button>
              </div>
            )}

            {groups.map((group) => (
              <div key={group.day}>
                <div className="flex items-center justify-center py-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                    {group.day}
                  </span>
                </div>
                {group.items.map((m) => {
                  const isMine = m.senderId === currentUserId;
                  return (
                    <div
                      key={m.id}
                      className={`flex items-end gap-2 py-1.5 ${
                        isMine ? "justify-end" : "justify-start"
                      }`}
                    >
                      {!isMine && (
                        <div
                          title={m.sender.name}
                          className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-[10px] shrink-0"
                        >
                          {m.sender.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div
                        className={`max-w-[75%] sm:max-w-[60%] ${
                          isMine ? "items-end text-right" : "items-start"
                        } flex flex-col`}
                      >
                        <div className="flex items-baseline gap-2 mb-0.5">
                          {!isMine && (
                            <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
                              {m.sender.name}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400">
                            {formatTime(m.createdAt)}
                          </span>
                        </div>
                        <div
                          className={`px-3.5 py-2 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap break-words ${
                            isMine
                              ? "bg-indigo-600 text-white rounded-br-md"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-md"
                          }`}
                        >
                          {m.content}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </>
        )}
      </div>

      {error && messages.length > 0 && (
        <div className="text-[11px] text-rose-600 px-5 pb-1">{error}</div>
      )}

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="border-t border-slate-200 dark:border-slate-800 p-3 flex items-center gap-2"
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={2000}
          placeholder="Type a message to your team..."
          className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="submit"
          disabled={!input.trim() || isSending}
          className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20 transition-all disabled:opacity-40 cursor-pointer"
          title="Send message"
        >
          {isSending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </form>
    </section>
  );
}
