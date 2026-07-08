"use client";

import { useState } from "react";
import Link from "next/link";
import type { Receivable } from "@/lib/db";
import {
  collectionsSummary,
  outstandingByCommercial,
  OVERDUE_DAYS,
} from "@/lib/collections";

function money(n: number) {
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, (m || 1) - 1, 1).toLocaleDateString("en-AE", {
    month: "short",
    year: "2-digit",
  });
}

type Filter = "all" | "current" | "overdue";

function Kpi({
  label,
  value,
  tone = "default",
  active,
  onClick,
}: {
  label: string;
  value: string;
  tone?: "default" | "danger" | "good";
  active?: boolean;
  onClick?: () => void;
}) {
  const valueColor =
    tone === "danger"
      ? "text-red-600 dark:text-red-400"
      : tone === "good"
        ? "text-emerald-600 dark:text-emerald-400"
        : "text-(--text-primary)";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`text-left bg-(--card) border rounded-xl p-3 sm:p-5 transition-colors ${
        active ? "border-(--accent) ring-1 ring-(--accent)/30" : "border-(--border)"
      } ${onClick ? "hover:border-(--accent)/50 cursor-pointer" : "cursor-default"}`}
    >
      <p className="text-[10px] sm:text-xs font-medium text-(--text-muted) uppercase tracking-widest mb-1">
        {label}
      </p>
      <p className={`text-lg sm:text-2xl font-bold truncate ${valueColor}`}>{value}</p>
      {onClick && (
        <p className="text-[10px] text-(--text-muted) mt-0.5">tap to filter</p>
      )}
    </button>
  );
}

function AgeBadge({ days }: { days: number }) {
  const cls =
    days > 60
      ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
      : days > OVERDUE_DAYS
        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
        : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${cls}`}>
      {days}d
    </span>
  );
}

function WhatsApp({ phone }: { phone: string }) {
  if (!phone.trim()) return null;
  return (
    <a
      href={`https://wa.me/${phone.replace(/[^0-9]/g, "")}`}
      target="_blank"
      rel="noopener noreferrer"
      title="WhatsApp"
      className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.29.173-1.414-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885M20.52 3.449C18.24 1.245 15.24.044 12.045.044 5.463.044.104 5.4.101 11.986c0 2.096.549 4.14 1.595 5.945L0 24l6.335-1.652a11.96 11.96 0 005.71 1.454h.006c6.585 0 11.946-5.357 11.949-11.945a11.9 11.9 0 00-3.481-8.418" />
      </svg>
    </a>
  );
}

export function CollectionsView({
  receivables,
  collectedThisMonth,
  collectedByMonth,
  isManager,
}: {
  receivables: Receivable[];
  collectedThisMonth: number;
  collectedByMonth: { month: string; amount: number }[];
  isManager: boolean;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [month, setMonth] = useState<string | null>(null);

  const summary = collectionsSummary(receivables);
  const byCommercial = outstandingByCommercial(receivables);

  // Pending per month (by the receivable's invoice/issue month).
  const pendingByMonth = new Map<string, number>();
  for (const r of receivables) {
    const m = r.sinceDate.slice(0, 7);
    if (m) pendingByMonth.set(m, (pendingByMonth.get(m) ?? 0) + r.balance);
  }

  const filtered = receivables.filter((r) => {
    if (filter === "overdue" && r.ageDays <= OVERDUE_DAYS) return false;
    if (filter === "current" && r.ageDays > OVERDUE_DAYS) return false;
    if (month && r.sinceDate.slice(0, 7) !== month) return false;
    return true;
  });

  function toggleFilter(f: Filter) {
    setFilter((prev) => (prev === f ? "all" : f));
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-(--text-primary) tracking-tight">
          Collections
        </h1>
        <p className="mt-1 text-sm text-(--text-secondary)">
          Money owed on accepted quotes. Tap a card or month to filter the list below.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Kpi
          label="Outstanding · AED"
          value={money(summary.totalOutstanding)}
          active={filter === "all" && !month}
          onClick={() => {
            setFilter("all");
            setMonth(null);
          }}
        />
        <Kpi label="Open receivables" value={String(summary.count)} />
        <Kpi
          label={`Overdue >${OVERDUE_DAYS}d · AED`}
          value={money(summary.overdueAmount)}
          tone={summary.overdueAmount > 0 ? "danger" : "default"}
          active={filter === "overdue"}
          onClick={() => toggleFilter("overdue")}
        />
        <Kpi
          label="Collected this month · AED"
          value={money(collectedThisMonth)}
          tone={collectedThisMonth > 0 ? "good" : "default"}
        />
      </div>

      {receivables.length === 0 ? (
        <div className="bg-(--card) border border-(--border) rounded-xl p-10 text-center">
          <p className="text-sm text-(--text-secondary)">
            Nothing to collect right now — every accepted quote is fully paid. 🎉
          </p>
        </div>
      ) : (
        <>
          <div className={`grid gap-6 mb-6 ${isManager ? "lg:grid-cols-2" : "lg:grid-cols-1"}`}>
            {/* By month */}
            <div className="bg-(--card) border border-(--border) rounded-xl p-5">
              <h2 className="text-sm font-semibold text-(--text-primary) mb-4">
                By month — collected vs. pending
              </h2>
              <div className="space-y-1">
                <div className="grid grid-cols-3 text-[11px] text-(--text-muted) uppercase tracking-wider pb-1">
                  <span>Month</span>
                  <span className="text-right">Collected</span>
                  <span className="text-right">Pending</span>
                </div>
                {collectedByMonth.map((m) => {
                  const pend = pendingByMonth.get(m.month) ?? 0;
                  const isActive = month === m.month;
                  return (
                    <button
                      key={m.month}
                      type="button"
                      onClick={() => setMonth(isActive ? null : m.month)}
                      className={`w-full grid grid-cols-3 items-center text-sm rounded-lg px-2 py-1.5 transition-colors ${
                        isActive
                          ? "bg-(--accent)/10 ring-1 ring-(--accent)/30"
                          : "hover:bg-(--surface)"
                      }`}
                    >
                      <span className="text-(--text-secondary) text-left">
                        {monthLabel(m.month)}
                      </span>
                      <span className="text-right font-mono text-emerald-600 dark:text-emerald-400">
                        {m.amount > 0 ? money(m.amount) : "—"}
                      </span>
                      <span className="text-right font-mono text-(--text-primary)">
                        {pend > 0 ? money(pend) : "—"}
                      </span>
                    </button>
                  );
                })}
              </div>
              {month && (
                <button
                  type="button"
                  onClick={() => setMonth(null)}
                  className="mt-2 text-xs font-medium text-(--accent) hover:underline"
                >
                  Clear month filter ({monthLabel(month)})
                </button>
              )}
            </div>

            {/* By commercial — managers only */}
            {isManager && (
              <div className="bg-(--card) border border-(--border) rounded-xl p-5">
                <h2 className="text-sm font-semibold text-(--text-primary) mb-4">
                  Outstanding by commercial
                </h2>
                <div className="space-y-3">
                  {byCommercial.map((c) => {
                    const max = Math.max(1, ...byCommercial.map((x) => x.amount));
                    return (
                      <div key={c.name}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-(--text-secondary) font-medium">
                            {c.name}
                          </span>
                          <span className="text-(--text-muted)">
                            {c.count} · {money(c.amount)}
                          </span>
                        </div>
                        <div className="h-2.5 rounded-full bg-(--surface) overflow-hidden">
                          <div
                            className="h-full bg-(--accent) rounded-full"
                            style={{ width: `${(c.amount / max) * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Filter chips */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {(["all", "current", "overdue"] as Filter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                  filter === f
                    ? "bg-(--accent) text-white dark:text-black"
                    : "bg-(--surface) border border-(--border) text-(--text-secondary) hover:text-(--text-primary)"
                }`}
              >
                {f === "all" ? "All" : f === "current" ? "Current" : `Overdue >${OVERDUE_DAYS}d`}
              </button>
            ))}
            <span className="text-xs text-(--text-muted)">
              {filtered.length} of {receivables.length}
              {month ? ` · ${monthLabel(month)}` : ""}
            </span>
          </div>

          {/* Receivables list */}
          <div className="bg-(--card) border border-(--border) rounded-xl overflow-hidden">
            {filtered.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-(--text-muted)">
                No receivables in this view.
              </div>
            ) : (
              <>
                <table className="hidden sm:table w-full text-sm">
                  <thead>
                    <tr className="border-b border-(--border) text-left text-xs text-(--text-muted) uppercase tracking-wider">
                      <th className="px-5 py-3 font-medium">Client / Project</th>
                      <th className="px-5 py-3 font-medium">Document</th>
                      <th className="px-5 py-3 font-medium text-right">Balance</th>
                      <th className="px-5 py-3 font-medium text-right">Paid / Total</th>
                      <th className="px-5 py-3 font-medium text-center">Age</th>
                      <th className="px-5 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r) => (
                      <tr
                        key={r.quoteId}
                        className="border-b border-(--border) last:border-0 hover:bg-(--surface)/50 transition-colors"
                      >
                        <td className="px-5 py-3">
                          <Link
                            href={`/clients/${r.clientId}`}
                            className="font-medium text-(--text-primary) hover:text-(--accent)"
                          >
                            {r.clientName}
                          </Link>
                          <div className="text-xs text-(--text-muted)">
                            {r.projectName} · {r.assignedTo}
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <Link
                            href={`/quotes/${r.quoteId}${r.invoiceNumber ? "?doc=invoice" : ""}`}
                            className="text-(--text-secondary) hover:text-(--accent) font-mono text-xs"
                          >
                            {r.invoiceNumber || r.number}
                          </Link>
                        </td>
                        <td className="px-5 py-3 text-right font-semibold text-(--text-primary)">
                          {money(r.balance)}
                        </td>
                        <td className="px-5 py-3 text-right text-xs text-(--text-muted) whitespace-nowrap">
                          {money(r.paid)} / {money(r.total)}
                        </td>
                        <td className="px-5 py-3 text-center">
                          <AgeBadge days={r.ageDays} />
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-end">
                            <WhatsApp phone={r.clientPhone} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="sm:hidden divide-y divide-(--border)">
                  {filtered.map((r) => (
                    <div key={r.quoteId} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link
                            href={`/clients/${r.clientId}`}
                            className="font-medium text-(--text-primary)"
                          >
                            {r.clientName}
                          </Link>
                          <div className="text-xs text-(--text-muted) truncate">
                            {r.projectName} · {r.assignedTo}
                          </div>
                        </div>
                        <AgeBadge days={r.ageDays} />
                      </div>
                      <div className="mt-2 flex items-end justify-between">
                        <div>
                          <p className="text-lg font-bold text-(--text-primary)">
                            {money(r.balance)}
                          </p>
                          <p className="text-xs text-(--text-muted)">
                            {money(r.paid)} paid of {money(r.total)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/quotes/${r.quoteId}${r.invoiceNumber ? "?doc=invoice" : ""}`}
                            className="text-xs font-mono text-(--text-secondary) underline"
                          >
                            {r.invoiceNumber || r.number}
                          </Link>
                          <WhatsApp phone={r.clientPhone} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
