"use client";

import { useState } from "react";
import Link from "next/link";

type Item = {
  id: string;
  name: string;
  location: string;
  phone: string;
  assignedTo: string;
  nextFollowUp: string; // YYYY-MM-DD
  note?: string;
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}
function ymd(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}
function todayYMD() {
  const n = new Date();
  return ymd(n.getFullYear(), n.getMonth(), n.getDate());
}
function formatLong(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-AE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function CalendarView({
  items,
  isManager,
}: {
  items: Item[];
  isManager: boolean;
}) {
  const today = todayYMD();

  // Group follow-ups by date.
  const byDate = new Map<string, Item[]>();
  for (const it of items) {
    const list = byDate.get(it.nextFollowUp) ?? [];
    list.push(it);
    byDate.set(it.nextFollowUp, list);
  }

  const initial = new Date(today + "T00:00:00");
  const [view, setView] = useState({
    year: initial.getFullYear(),
    month: initial.getMonth(),
  });
  const [selected, setSelected] = useState<string>(today);

  const firstOfMonth = new Date(view.year, view.month, 1);
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  // Monday-first offset (getDay: 0=Sun..6=Sat).
  const leadingBlanks = (firstOfMonth.getDay() + 6) % 7;

  function shiftMonth(delta: number) {
    setView((v) => {
      const m = v.month + delta;
      const year = v.year + Math.floor(m / 12);
      const month = ((m % 12) + 12) % 12;
      return { year, month };
    });
  }
  function goToday() {
    setView({ year: initial.getFullYear(), month: initial.getMonth() });
    setSelected(today);
  }

  // Urgency color for a day that has follow-ups.
  function dayTone(dateStr: string): string {
    const items = byDate.get(dateStr);
    if (!items || items.length === 0) return "";
    if (dateStr < today)
      return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300";
    if (dateStr === today)
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
    return "bg-(--accent)/15 text-(--accent)";
  }

  const cells: (number | null)[] = [
    ...Array(leadingBlanks).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const selectedItems = (byDate.get(selected) ?? []).slice().sort((a, b) =>
    a.name.localeCompare(b.name)
  );
  const totalDue = items.filter(
    (it) => it.nextFollowUp <= today
  ).length;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-(--text-primary) tracking-tight">
            Follow-up Calendar
          </h1>
          <p className="mt-1 text-sm text-(--text-secondary)">
            Every lead on the day it&apos;s due — tap one to open the client.
            {totalDue > 0 && (
              <span className="text-red-500 font-medium">
                {" "}
                {totalDue} due now.
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-(--border) text-(--text-secondary) hover:text-(--text-primary) hover:border-(--accent)/40 transition-colors"
            aria-label="Previous month"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          </button>
          <button
            type="button"
            onClick={goToday}
            className="px-3 h-9 rounded-lg border border-(--border) text-sm font-medium text-(--text-secondary) hover:text-(--text-primary) hover:border-(--accent)/40 transition-colors"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-(--border) text-(--text-secondary) hover:text-(--text-primary) hover:border-(--accent)/40 transition-colors"
            aria-label="Next month"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Month grid */}
        <div className="lg:col-span-2 bg-(--card) border border-(--border) rounded-xl p-4 sm:p-5">
          <p className="text-center text-sm font-semibold text-(--text-primary) mb-4">
            {MONTHS[view.month]} {view.year}
          </p>
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map((w) => (
              <div
                key={w}
                className="text-center text-[11px] font-medium text-(--text-muted) py-1"
              >
                {w}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (day === null) return <div key={`b${i}`} />;
              const dateStr = ymd(view.year, view.month, day);
              const dayItems = byDate.get(dateStr) ?? [];
              const isToday = dateStr === today;
              const isSelected = dateStr === selected;
              const tone = dayTone(dateStr);
              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => setSelected(dateStr)}
                  className={`relative aspect-square rounded-lg flex flex-col items-center justify-center gap-1 text-sm transition-colors
                    ${isSelected ? "ring-2 ring-(--accent)" : ""}
                    ${isToday ? "font-bold" : ""}
                    ${tone || "hover:bg-(--surface) text-(--text-secondary)"}`}
                >
                  <span>{day}</span>
                  {dayItems.length > 0 && (
                    <span className="text-[10px] font-semibold leading-none">
                      {dayItems.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 text-[11px] text-(--text-muted)">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-red-400 inline-block" /> Overdue
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block" /> Today
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-(--accent) inline-block" /> Upcoming
            </span>
          </div>
        </div>

        {/* Selected day agenda */}
        <div className="bg-(--card) border border-(--border) rounded-xl overflow-hidden self-start">
          <div className="px-4 py-3 border-b border-(--border)">
            <h2 className="text-sm font-semibold text-(--text-primary)">
              {formatLong(selected)}
            </h2>
            <p className="text-xs text-(--text-muted) mt-0.5">
              {selectedItems.length
                ? `${selectedItems.length} follow-up${selectedItems.length === 1 ? "" : "s"}`
                : "No follow-ups"}
            </p>
          </div>
          {selectedItems.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-(--text-muted)">
              Nothing scheduled. 🌤️
            </div>
          ) : (
            <div className="divide-y divide-(--border)">
              {selectedItems.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <Link href={`/clients/${c.id}`} className="min-w-0 flex-1 group">
                    <p className="text-sm font-medium text-(--text-primary) group-hover:text-(--accent) truncate">
                      {c.name}
                    </p>
                    <p className="text-xs text-(--text-muted) truncate">
                      {c.location || c.phone}
                      {isManager ? ` · ${c.assignedTo}` : ""}
                    </p>
                    {c.note && (
                      <p className="text-xs text-(--text-secondary) mt-0.5 line-clamp-2">
                        {c.note}
                      </p>
                    )}
                  </Link>
                  {c.phone && (
                    <a
                      href={`https://wa.me/${c.phone.replace(/[^0-9]/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
                      title="WhatsApp"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.29.173-1.414-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885M20.52 3.449C18.24 1.245 15.24.044 12.045.044 5.463.044.104 5.4.101 11.986c0 2.096.549 4.14 1.595 5.945L0 24l6.335-1.652a11.96 11.96 0 005.71 1.454h.006c6.585 0 11.946-5.357 11.949-11.945a11.9 11.9 0 00-3.481-8.418" />
                      </svg>
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
