"use client";

import { useState } from "react";
import Link from "next/link";
import { completeFollowUp, rescheduleFollowUp } from "@/app/actions";
import { ADVANCE_PCT } from "@/lib/data";
import { IcalSubscribe } from "./IcalSubscribe";

type Alert = {
  projectId: string;
  projectName: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  assignedTo: string;
  startDate: string;
  daysUntil: number;
  committed: number;
  paid: number;
  pct: number;
};

function money(n: number) {
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function alertHeadline(a: Alert): string {
  if (a.daysUntil > 0)
    return `Starts in ${a.daysUntil} day${a.daysUntil === 1 ? "" : "s"} · advance not received`;
  if (a.daysUntil === 0) return "Starts today · advance not received";
  return `Started ${-a.daysUntil} day${a.daysUntil === -1 ? "" : "s"} ago · advance still due`;
}

type PendingItem = {
  followUpId: string;
  clientId: string;
  name: string;
  location: string;
  phone: string;
  assignedTo: string;
  projectName: string | null;
  dueDate: string; // YYYY-MM-DD
  note: string;
};

type DoneItem = {
  followUpId: string;
  clientId: string;
  name: string;
  location: string;
  phone: string;
  assignedTo: string;
  projectName: string | null;
  doneDate: string; // YYYY-MM-DD (day the action was completed)
  dueDate: string;
  note: string;
  doneBy: string;
  doneNote: string;
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
function tomorrowYMD() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return ymd(d.getFullYear(), d.getMonth(), d.getDate());
}
function formatLong(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-AE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function WhatsApp({ phone }: { phone: string }) {
  if (!phone.trim()) return null;
  return (
    <a
      href={`https://wa.me/${phone.replace(/[^0-9]/g, "")}`}
      target="_blank"
      rel="noopener noreferrer"
      className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
      title="WhatsApp"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.29.173-1.414-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885M20.52 3.449C18.24 1.245 15.24.044 12.045.044 5.463.044.104 5.4.101 11.986c0 2.096.549 4.14 1.595 5.945L0 24l6.335-1.652a11.96 11.96 0 005.71 1.454h.006c6.585 0 11.946-5.357 11.949-11.945a11.9 11.9 0 00-3.481-8.418" />
      </svg>
    </a>
  );
}

export function CalendarView({
  pending: initialPending,
  done: initialDone,
  alerts,
  isManager,
  currentUserName,
  feedUrl,
}: {
  pending: PendingItem[];
  done: DoneItem[];
  alerts: Alert[];
  isManager: boolean;
  currentUserName: string;
  feedUrl: string;
}) {
  const today = todayYMD();
  const [pending, setPending] = useState<PendingItem[]>(initialPending);
  const [done, setDone] = useState<DoneItem[]>(initialDone);

  // Inline action state (mark done / move) for the selected item.
  const [action, setAction] = useState<{ id: string; kind: "done" | "move" } | null>(null);
  const [actionNote, setActionNote] = useState("");
  const [actionDate, setActionDate] = useState("");
  const [busy, setBusy] = useState(false);

  // Drag & drop: drag a pending item onto a day to reschedule it.
  const [dragItem, setDragItem] = useState<PendingItem | null>(null);
  const [overDate, setOverDate] = useState<string | null>(null);
  const [drop, setDrop] = useState<{ item: PendingItem; newDate: string } | null>(null);
  const [dropNote, setDropNote] = useState("");

  // Group by date: pending on their due day, done on the day they were done.
  const pendingByDate = new Map<string, PendingItem[]>();
  for (const it of pending) {
    const list = pendingByDate.get(it.dueDate) ?? [];
    list.push(it);
    pendingByDate.set(it.dueDate, list);
  }
  const doneByDate = new Map<string, DoneItem[]>();
  for (const it of done) {
    const list = doneByDate.get(it.doneDate) ?? [];
    list.push(it);
    doneByDate.set(it.doneDate, list);
  }

  const initial = new Date(today + "T00:00:00");
  const [view, setView] = useState({
    year: initial.getFullYear(),
    month: initial.getMonth(),
  });
  const [selected, setSelected] = useState<string>(today);

  const firstOfMonth = new Date(view.year, view.month, 1);
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
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

  function openAction(id: string, kind: "done" | "move") {
    setAction({ id, kind });
    setActionNote("");
    setActionDate(kind === "move" ? tomorrowYMD() : "");
  }

  async function confirmDone(it: PendingItem) {
    setBusy(true);
    try {
      await completeFollowUp(it.clientId, it.followUpId, actionNote);
      // Move it out of pending and into today's "done" list.
      setPending((prev) => prev.filter((x) => x.followUpId !== it.followUpId));
      setDone((prev) => [
        {
          ...it,
          doneDate: today,
          doneBy: currentUserName,
          doneNote: actionNote,
        },
        ...prev,
      ]);
      setAction(null);
    } finally {
      setBusy(false);
    }
  }

  async function confirmMove(it: PendingItem) {
    if (!actionDate) return;
    setBusy(true);
    try {
      await rescheduleFollowUp(it.clientId, it.followUpId, actionDate, actionNote);
      setPending((prev) =>
        prev.map((x) =>
          x.followUpId === it.followUpId ? { ...x, dueDate: actionDate } : x
        )
      );
      setAction(null);
    } finally {
      setBusy(false);
    }
  }

  // Drop a dragged item onto a day → open the quick-note confirm.
  function onDropDay(dateStr: string) {
    setOverDate(null);
    const item = dragItem;
    setDragItem(null);
    if (!item || item.dueDate === dateStr) return;
    setDropNote("");
    setDrop({ item, newDate: dateStr });
  }

  async function confirmDrop() {
    if (!drop) return;
    setBusy(true);
    try {
      await rescheduleFollowUp(drop.item.clientId, drop.item.followUpId, drop.newDate, dropNote);
      setPending((prev) =>
        prev.map((x) =>
          x.followUpId === drop.item.followUpId ? { ...x, dueDate: drop.newDate } : x
        )
      );
      setDrop(null);
    } finally {
      setBusy(false);
    }
  }

  // Urgency color for a day that has PENDING follow-ups.
  function dayTone(dateStr: string): string {
    const list = pendingByDate.get(dateStr);
    if (!list || list.length === 0) return "";
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

  const selectedPending = (pendingByDate.get(selected) ?? [])
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));
  const selectedDone = (doneByDate.get(selected) ?? [])
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));
  const totalDue = pending.filter((it) => it.dueDate <= today).length;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-(--text-primary) tracking-tight">
            Follow-up Calendar
          </h1>
          <p className="mt-1 text-sm text-(--text-secondary)">
            To-do on each due day, and a log of what was done — like a work diary.
            {totalDue > 0 && (
              <span className="text-red-500 font-medium"> {totalDue} due now.</span>
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

      {/* Subscribe your phone to this feed */}
      {feedUrl && <IcalSubscribe url={feedUrl} />}

      {/* Overdue follow-ups — pending tasks whose date already passed. */}
      {(() => {
        const overdue = pending
          .filter((it) => it.dueDate < today)
          .sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1));
        if (overdue.length === 0) return null;
        return (
          <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-900/20 p-4">
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-300 mb-2 flex items-center gap-1.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              Overdue follow-ups ({overdue.length}) — earlier work still pending
            </p>
            <div className="space-y-2">
              {overdue.map((it) => (
                <div
                  key={it.followUpId}
                  className="flex items-center justify-between gap-3 rounded-lg bg-(--card) border border-(--border) px-3 py-2"
                >
                  <Link href={`/clients/${it.clientId}`} className="min-w-0 flex-1 group">
                    <p className="text-sm font-medium text-(--text-primary) group-hover:text-(--accent) truncate">
                      {it.name}
                      {it.projectName ? ` · ${it.projectName}` : ""}
                      {isManager ? ` · ${it.assignedTo}` : ""}
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      Due {it.dueDate}
                      {it.note ? ` · ${it.note}` : ""}
                    </p>
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      const [y, m] = it.dueDate.split("-").map(Number);
                      setView({ year: y, month: m - 1 });
                      setSelected(it.dueDate);
                    }}
                    className="shrink-0 text-xs font-semibold text-(--accent) hover:underline"
                  >
                    View
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Advance-payment alerts */}
      {alerts.length > 0 && (
        <div className="mb-6 rounded-xl border border-red-300 bg-red-50 dark:border-red-900/50 dark:bg-red-900/20 p-4">
          <p className="text-sm font-semibold text-red-700 dark:text-red-300 mb-2 flex items-center gap-1.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            Advance payment due before work starts ({alerts.length})
          </p>
          <div className="space-y-2">
            {alerts.map((a) => (
              <div
                key={a.projectId}
                className="flex items-center justify-between gap-3 rounded-lg bg-(--card) border border-(--border) px-3 py-2"
              >
                <Link href={`/clients/${a.clientId}`} className="min-w-0 flex-1 group">
                  <p className="text-sm font-medium text-(--text-primary) group-hover:text-(--accent) truncate">
                    {a.clientName} · {a.projectName}
                    {isManager ? ` · ${a.assignedTo}` : ""}
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-400">
                    {alertHeadline(a)}
                  </p>
                  <p className="text-[11px] text-(--text-muted)">
                    {a.pct}% paid ({money(a.paid)} of {money(a.committed)}) · need {ADVANCE_PCT}%
                  </p>
                </Link>
                <WhatsApp phone={a.clientPhone} />
              </div>
            ))}
          </div>
        </div>
      )}

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
              const dayPending = pendingByDate.get(dateStr) ?? [];
              const dayDone = doneByDate.get(dateStr) ?? [];
              const isToday = dateStr === today;
              const isSelected = dateStr === selected;
              const tone = dayTone(dateStr);
              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => {
                    setSelected(dateStr);
                    setAction(null);
                  }}
                  onDragOver={(e) => {
                    if (dragItem) {
                      e.preventDefault();
                      setOverDate(dateStr);
                    }
                  }}
                  onDragLeave={() => setOverDate((d) => (d === dateStr ? null : d))}
                  onDrop={(e) => {
                    e.preventDefault();
                    onDropDay(dateStr);
                  }}
                  className={`relative aspect-square rounded-lg flex flex-col items-center justify-center gap-0.5 text-sm transition-colors
                    ${isSelected ? "ring-2 ring-(--accent)" : ""}
                    ${overDate === dateStr ? "ring-2 ring-(--accent) bg-(--accent)/10" : ""}
                    ${isToday ? "font-bold" : ""}
                    ${tone || "hover:bg-(--surface) text-(--text-secondary)"}`}
                >
                  <span>{day}</span>
                  {dayPending.length > 0 && (
                    <span className="text-[10px] font-semibold leading-none">
                      {dayPending.length}
                    </span>
                  )}
                  {dayDone.length > 0 && (
                    <span
                      className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-500"
                      title={`${dayDone.length} done`}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-4 text-[11px] text-(--text-muted)">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-red-400 inline-block" /> Overdue
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block" /> Today
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-(--accent) inline-block" /> Upcoming
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Done that day
            </span>
          </div>
        </div>

        {/* Selected day: To do (top) + Done (bottom) */}
        <div className="space-y-4 self-start">
          <div className="bg-(--card) border border-(--border) rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-(--border)">
              <h2 className="text-sm font-semibold text-(--text-primary)">
                {formatLong(selected)}
              </h2>
            </div>

            {/* To do */}
            <div className="px-4 py-2.5 border-b border-(--border) bg-(--surface)/40">
              <p className="text-xs font-semibold text-(--text-muted) uppercase tracking-widest">
                To do · {selectedPending.length}
              </p>
              {selectedPending.length > 0 && (
                <p className="hidden lg:block text-[10px] text-(--text-muted) mt-0.5 normal-case tracking-normal">
                  Tip: drag an item onto a day to reschedule it.
                </p>
              )}
            </div>
            {selectedPending.length === 0 ? (
              <div className="px-4 py-5 text-center text-sm text-(--text-muted)">
                Nothing to do. 🌤️
              </div>
            ) : (
              <div className="divide-y divide-(--border)">
                {selectedPending.map((c) => (
                  <div
                    key={c.followUpId}
                    draggable
                    onDragStart={() => setDragItem(c)}
                    onDragEnd={() => {
                      setDragItem(null);
                      setOverDate(null);
                    }}
                    className={`px-4 py-3 space-y-2 cursor-grab active:cursor-grabbing ${
                      dragItem?.followUpId === c.followUpId ? "opacity-50" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <Link href={`/clients/${c.clientId}`} className="min-w-0 flex-1 group">
                        <p className="text-sm font-medium text-(--text-primary) group-hover:text-(--accent) truncate">
                          {c.name}
                        </p>
                        <p className="text-xs text-(--text-muted) truncate">
                          {c.projectName ? c.projectName : c.location || c.phone}
                          {isManager ? ` · ${c.assignedTo}` : ""}
                        </p>
                        {c.note && (
                          <p className="text-xs text-(--text-secondary) mt-0.5 line-clamp-2">
                            {c.note}
                          </p>
                        )}
                      </Link>
                      <WhatsApp phone={c.phone} />
                    </div>

                    {action?.id === c.followUpId ? (
                      <div className="space-y-2">
                        {action.kind === "move" && (
                          <input
                            type="date"
                            value={actionDate}
                            onChange={(e) => setActionDate(e.target.value)}
                            className="w-full bg-(--surface) border border-(--border) rounded-lg px-3 py-2 text-sm text-(--text-primary) focus:outline-none focus:border-(--accent)/50"
                          />
                        )}
                        <textarea
                          value={actionNote}
                          onChange={(e) => setActionNote(e.target.value)}
                          rows={2}
                          placeholder={
                            action.kind === "done"
                              ? "What did you do? (optional but recommended)"
                              : "Why move it? (optional)"
                          }
                          className="w-full bg-(--surface) border border-(--border) rounded-lg px-3 py-2 text-sm text-(--text-primary) placeholder:text-(--text-muted) focus:outline-none focus:border-(--accent)/50"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={busy || (action.kind === "move" && !actionDate)}
                            onClick={() =>
                              action.kind === "done" ? confirmDone(c) : confirmMove(c)
                            }
                            className="flex-1 bg-(--accent) text-white dark:text-black text-sm font-semibold rounded-lg py-1.5 disabled:opacity-50"
                          >
                            {busy ? "Saving…" : action.kind === "done" ? "Confirm done" : "Move"}
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => setAction(null)}
                            className="px-3 py-1.5 rounded-lg border border-(--border) text-sm font-medium text-(--text-secondary)"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openAction(c.followUpId, "done")}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
                        >
                          ✓ Done
                        </button>
                        <button
                          type="button"
                          onClick={() => openAction(c.followUpId, "move")}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium border border-(--border) text-(--text-secondary) hover:text-(--text-primary) transition-colors"
                        >
                          Move
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Done that day */}
            <div className="px-4 py-2.5 border-y border-(--border) bg-(--surface)/40">
              <p className="text-xs font-semibold text-(--text-muted) uppercase tracking-widest">
                Done that day · {selectedDone.length}
              </p>
            </div>
            {selectedDone.length === 0 ? (
              <div className="px-4 py-5 text-center text-sm text-(--text-muted)">
                Nothing logged yet.
              </div>
            ) : (
              <div className="divide-y divide-(--border)">
                {selectedDone.map((c) => (
                  <div key={c.followUpId} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <Link href={`/clients/${c.clientId}`} className="min-w-0 flex-1 group">
                        <p className="text-sm font-medium text-(--text-primary) group-hover:text-(--accent) truncate">
                          <span className="text-emerald-600 dark:text-emerald-400 mr-1">✓</span>
                          {c.name}
                        </p>
                        <p className="text-xs text-(--text-muted) truncate">
                          {c.projectName ? c.projectName : c.location || c.phone}
                          {` · ${c.doneBy || (isManager ? c.assignedTo : "")}`}
                        </p>
                        {c.note && (
                          <p className="text-xs text-(--text-secondary) mt-0.5 line-clamp-2">
                            {c.note}
                          </p>
                        )}
                        {c.doneNote && (
                          <p className="text-xs text-(--text-muted) mt-0.5 italic line-clamp-2">
                            → {c.doneNote}
                          </p>
                        )}
                      </Link>
                      <WhatsApp phone={c.phone} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Drag-to-reschedule confirm (quick note) */}
      {drop && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setDrop(null)}
        >
          <div
            className="bg-(--card) border border-(--border) rounded-xl p-5 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-semibold text-(--text-primary)">
              Move follow-up
            </p>
            <p className="text-sm text-(--text-secondary) mt-1">
              <span className="font-medium">{drop.item.name}</span> →{" "}
              {formatLong(drop.newDate)}
            </p>
            <textarea
              value={dropNote}
              onChange={(e) => setDropNote(e.target.value)}
              rows={2}
              autoFocus
              placeholder="Quick note — why move it? (optional)"
              className="mt-3 w-full bg-(--surface) border border-(--border) rounded-lg px-3 py-2 text-sm text-(--text-primary) placeholder:text-(--text-muted) focus:outline-none focus:border-(--accent)/50"
            />
            <div className="flex items-center gap-2 mt-3">
              <button
                type="button"
                disabled={busy}
                onClick={confirmDrop}
                className="flex-1 bg-(--accent) text-white dark:text-black text-sm font-semibold rounded-lg py-2 disabled:opacity-50"
              >
                {busy ? "Saving…" : "Move"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setDrop(null)}
                className="px-3 py-2 rounded-lg border border-(--border) text-sm font-medium text-(--text-secondary)"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
