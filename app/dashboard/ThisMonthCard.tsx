"use client";

import { useState } from "react";
import Link from "next/link";
import type { MonthMovement, MovementItem } from "@/lib/db";

function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, (m || 1) - 1, 1).toLocaleDateString("en-AE", {
    month: "long",
    year: "numeric",
  });
}

type Cat = "entered" | "won" | "completed" | "lost" | "ghosting";

const CATS: { key: Cat; label: string; dot: string; text: string }[] = [
  { key: "entered", label: "Entered", dot: "bg-sky-500", text: "text-sky-600 dark:text-sky-400" },
  { key: "won", label: "Won — On site", dot: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
  { key: "completed", label: "Completed", dot: "bg-emerald-600", text: "text-emerald-700 dark:text-emerald-300" },
  { key: "lost", label: "Lost", dot: "bg-red-500", text: "text-red-600 dark:text-red-400" },
  { key: "ghosting", label: "Ghosting", dot: "bg-zinc-400", text: "text-zinc-500 dark:text-zinc-400" },
];

function ItemList({ items }: { items: MovementItem[] }) {
  if (items.length === 0) {
    return <p className="px-3 py-2 text-xs text-(--text-muted)">Nothing here this month.</p>;
  }
  return (
    <div className="space-y-0.5">
      {items.map((it) => (
        <Link
          key={it.projectId}
          href={`/clients/${it.clientId}#project-${it.projectId}`}
          className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg hover:bg-(--surface) transition-colors group"
        >
          <span className="text-sm font-medium text-(--text-primary) truncate group-hover:text-(--accent)">
            {it.clientName}
          </span>
          <span className="text-xs text-(--text-muted) truncate">{it.projectName}</span>
        </Link>
      ))}
    </div>
  );
}

export function ThisMonthCard({ movement }: { movement: MonthMovement[] }) {
  // Default to the most recent month (last in the ordered list).
  const [month, setMonth] = useState(movement.at(-1)?.month ?? "");
  const [open, setOpen] = useState<Cat | null>(null);

  const data =
    movement.find((m) => m.month === month) ?? movement.at(-1) ?? {
      month,
      entered: [],
      won: [],
      completed: [],
      lost: [],
      ghosting: [],
    };

  return (
    <div className="bg-(--card) border border-(--border) rounded-xl p-5">
      <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
        <h2 className="text-sm font-semibold text-(--text-primary)">
          Monthly movement
        </h2>
        <select
          value={month}
          onChange={(e) => {
            setMonth(e.target.value);
            setOpen(null);
          }}
          className="bg-(--surface) border border-(--border) rounded-lg px-2.5 py-1 text-xs text-(--text-primary) focus:outline-none focus:border-(--accent)/50"
        >
          {[...movement].reverse().map((m) => (
            <option key={m.month} value={m.month}>
              {monthLabel(m.month)}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        {CATS.map((c) => {
          const items = data[c.key];
          const isOpen = open === c.key;
          return (
            <div key={c.key}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : c.key)}
                disabled={items.length === 0}
                className={`w-full flex items-center gap-3 rounded-lg px-2 py-2 transition-colors ${
                  isOpen ? "bg-(--accent)/10" : "hover:bg-(--surface)"
                } ${items.length === 0 ? "opacity-60 cursor-default" : ""}`}
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${c.dot}`} />
                <span className="text-sm text-(--text-secondary) flex-1 text-left">
                  {c.label}
                </span>
                <span className={`text-lg font-bold ${c.text}`}>{items.length}</span>
                {items.length > 0 && (
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`shrink-0 text-(--text-muted) transition-transform ${isOpen ? "rotate-90" : ""}`}
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                )}
              </button>
              {isOpen && (
                <div className="ml-4 mb-1 border-l border-(--border) pl-2">
                  <ItemList items={items} />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[11px] text-(--text-muted)">
        Tap a row to see the deals, then a deal to open it.
      </p>
    </div>
  );
}
