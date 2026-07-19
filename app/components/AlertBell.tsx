"use client";

import { useState } from "react";
import Link from "next/link";
import type { AlertInbox } from "@/lib/db";

function timeAgo(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-AE", { day: "numeric", month: "short" });
}

export function AlertBell({ alerts }: { alerts: AlertInbox[] }) {
  const [open, setOpen] = useState(false);
  const unread = alerts.filter((a) => a.unread).length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        title="Alerts"
        className="relative w-9 h-9 flex items-center justify-center rounded-md text-(--text-secondary) hover:text-(--text-primary) hover:bg-(--accent)/10 transition-colors"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-1.5rem)] max-h-96 overflow-y-auto rounded-xl border border-(--border) bg-(--card) shadow-2xl shadow-black/40 z-50">
            <div className="px-4 py-2.5 border-b border-(--border) sticky top-0 bg-(--card)">
              <p className="text-sm font-semibold text-(--text-primary)">Alerts</p>
            </div>
            {alerts.length === 0 ? (
              <p className="px-4 py-6 text-sm text-(--text-muted) text-center">
                Nothing needs your attention. 🎉
              </p>
            ) : (
              <ul className="divide-y divide-(--border)">
                {alerts.map((a) => (
                  <li key={a.id}>
                    <Link
                      href={`/clients/${a.clientId}`}
                      onClick={() => setOpen(false)}
                      className="block px-4 py-3 hover:bg-(--surface) transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {a.unread && (
                          <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                        )}
                        <span className="text-sm font-medium text-(--text-primary) truncate">
                          {a.clientName}
                        </span>
                        <span className="ml-auto text-[10px] text-(--text-muted) shrink-0">
                          {timeAgo(a.lastMessageAt)}
                        </span>
                      </div>
                      {a.projectName && (
                        <p className="text-[11px] text-(--text-muted) mt-0.5">
                          About: {a.projectName}
                        </p>
                      )}
                      <p className="text-xs text-(--text-secondary) mt-0.5 line-clamp-2">
                        {a.lastAuthorRole === "sales" ? "↩ " : ""}
                        {a.lastMessage}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
