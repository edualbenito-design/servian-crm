"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { AlertInbox } from "@/lib/db";

// A once-per-session nudge: when the user opens the app and has unread alerts,
// show them up front. It reappears only when something newer arrives (we track
// the newest message time we've already shown in sessionStorage).
const SEEN_KEY = "alertsPopupSeenAt";

export function AlertPopup({ alerts }: { alerts: AlertInbox[] }) {
  const unread = alerts.filter((a) => a.unread);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (unread.length === 0) return;
    const newest = unread.reduce((max, a) => (a.lastMessageAt > max ? a.lastMessageAt : max), "");
    let seen = "";
    try {
      seen = sessionStorage.getItem(SEEN_KEY) ?? "";
    } catch {}
    if (newest > seen) setShow(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function dismiss() {
    const newest = unread.reduce((max, a) => (a.lastMessageAt > max ? a.lastMessageAt : max), "");
    try {
      sessionStorage.setItem(SEEN_KEY, newest);
    } catch {}
    setShow(false);
  }

  if (!show || unread.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50" onClick={dismiss}>
      <div
        className="w-full max-w-md rounded-2xl border border-(--border) bg-(--card) shadow-2xl shadow-black/50 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-(--border) flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
            <path d="M12 9v4M12 17h.01" />
          </svg>
          <h2 className="text-base font-semibold text-(--text-primary)">
            {unread.length} alert{unread.length > 1 ? "s" : ""} for you
          </h2>
        </div>

        <ul className="divide-y divide-(--border) max-h-80 overflow-y-auto">
          {unread.map((a) => (
            <li key={a.id}>
              <Link
                href={`/clients/${a.clientId}`}
                onClick={dismiss}
                className="block px-5 py-3.5 hover:bg-(--surface) transition-colors"
              >
                <p className="text-sm font-medium text-(--text-primary)">
                  {a.clientName}
                  {a.projectName && (
                    <span className="text-(--text-muted) font-normal"> · {a.projectName}</span>
                  )}
                </p>
                <p className="text-xs text-(--text-secondary) mt-0.5 line-clamp-2">
                  {a.lastMessage}
                </p>
              </Link>
            </li>
          ))}
        </ul>

        <div className="px-5 py-3 border-t border-(--border) flex justify-end">
          <button
            onClick={dismiss}
            className="text-sm font-medium px-4 py-2 rounded-lg bg-(--accent) text-white dark:text-black"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
