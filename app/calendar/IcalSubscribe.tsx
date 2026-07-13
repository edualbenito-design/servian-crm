"use client";

import { useState } from "react";

// Compact "subscribe your phone calendar" box. Shows the rep's personal read-only
// feed URL with a copy button and short instructions.
export function IcalSubscribe({ url }: { url: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — user can still select the text */
    }
  }

  return (
    <div className="mb-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs font-medium text-(--text-secondary) hover:text-(--accent) transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="18" height="18" x="3" y="4" rx="2" />
          <path d="M3 10h18M8 2v4M16 2v4" />
        </svg>
        Subscribe on your phone
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="mt-2 rounded-xl border border-(--border) bg-(--card) p-4">
          <p className="text-xs text-(--text-secondary) mb-2">
            Add this read-only link to your phone calendar (Apple Calendar → Add
            Subscription Calendar, or Google Calendar → Other calendars → From URL)
            to see your follow-ups on your phone. It updates automatically.
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={url}
              onFocus={(e) => e.target.select()}
              className="flex-1 min-w-0 rounded-lg border border-(--border) bg-(--surface) px-3 py-2 text-xs text-(--text-primary) font-mono"
            />
            <button
              type="button"
              onClick={copy}
              className="shrink-0 px-3 py-2 rounded-lg text-xs font-semibold bg-(--accent) text-white dark:text-black hover:opacity-90 transition-opacity"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <p className="mt-2 text-[11px] text-(--text-muted)">
            Keep this link private — anyone with it can see your follow-up list.
          </p>
        </div>
      )}
    </div>
  );
}
