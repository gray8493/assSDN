"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, BellRing, Check, CheckCheck } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { USER_CHANNEL, EVENTS } from "@/lib/channels";

interface NotificationItem {
  id: string;
  type: string;
  message: string;
  link?: string | null;
  refId?: string | null;
  read: boolean;
  createdAt: string;
}

const TYPE_STYLES: Record<string, { bg: string; label: string }> = {
  TASK_ASSIGNED: { bg: "bg-indigo-500", label: "Task" },
  TEAM_ADDED: { bg: "bg-emerald-500", label: "Team" },
};

export default function NotificationBell() {
  const { user } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/notifications?limit=20");
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.notifications || []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      // Silent – bell is non-critical
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch + live subscription on the user's own channel
  useEffect(() => {
    if (!user) {
      setItems([]);
      setUnreadCount(0);
      return;
    }
    fetchNotifications();

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const channel = supabase
      .channel(USER_CHANNEL(user.id))
      .on("broadcast", { event: EVENTS.NOTIFICATION_NEW }, ({ payload }) => {
        const notification = payload as NotificationItem | undefined;
        if (!notification?.id) return;
        setItems((prev) =>
          prev.some((n) => n.id === notification.id)
            ? prev
            : [notification, ...prev].slice(0, 20)
        );
        setUnreadCount((c) => (notification.read ? c : c + 1));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchNotifications]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const markRead = async (notification: NotificationItem) => {
    if (!notification.read) {
      setItems((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      fetch(`/api/notifications/${notification.id}`, { method: "PATCH" }).catch(
        () => undefined
      );
    }
    setOpen(false);
    if (notification.link) {
      router.push(notification.link);
    }
  };

  const markAllRead = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    fetch("/api/notifications/read-all", { method: "POST" }).catch(
      () => undefined
    );
  };

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          if (!open) fetchNotifications();
        }}
        className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        title="Notifications"
        aria-label="Notifications"
      >
        {unreadCount > 0 ? (
          <BellRing className="w-4.5 h-4.5" />
        ) : (
          <Bell className="w-4.5 h-4.5" />
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shadow">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 max-w-[90vw] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden z-[60]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Notifications
            </h3>
            <button
              type="button"
              onClick={markAllRead}
              disabled={unreadCount === 0}
              className="flex items-center gap-1 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-40 disabled:no-underline cursor-pointer"
            >
              <CheckCheck className="w-3 h-3" />
              Mark all read
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading && items.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-slate-400">
                Loading...
              </div>
            ) : items.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-slate-400">
                No notifications yet
              </div>
            ) : (
              items.map((n) => {
                const style = TYPE_STYLES[n.type];
                return (
                  <button
                    type="button"
                    key={n.id}
                    onClick={() => markRead(n)}
                    className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors cursor-pointer ${
                      n.read ? "" : "bg-indigo-50/60 dark:bg-indigo-950/20"
                    }`}
                  >
                    <span
                      className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${style?.bg ?? "bg-slate-400"} ${
                        n.read ? "opacity-40" : ""
                      }`}
                    />
                    <span className="min-w-0">
                      <span className="block text-xs text-slate-800 dark:text-slate-100 leading-snug">
                        {n.message}
                      </span>
                      <span className="block mt-0.5 text-[10px] text-slate-400">
                        {new Date(n.createdAt).toLocaleString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "numeric",
                          month: "short",
                        })}
                        {n.link ? (
                          <span className="ml-1.5 text-indigo-500 font-semibold">
                            View
                          </span>
                        ) : null}
                      </span>
                    </span>
                    {!n.read ? (
                      <Check className="w-3.5 h-3.5 shrink-0 mt-1 text-indigo-500" />
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
