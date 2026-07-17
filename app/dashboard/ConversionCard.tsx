import type { Conversion } from "@/lib/analytics";
import type { QuoteStats } from "@/lib/db";

// Deal conversion funnel + real quote acceptance rate. Plain component so both
// the manager dashboard and the sales dashboard can render it.
export function ConversionCard({
  conversion,
  quoteStats,
}: {
  conversion: Conversion;
  quoteStats: QuoteStats;
}) {
  const steps = [
    { label: "All deals", count: conversion.total, rate: null as number | null },
    { label: "Quoted", count: conversion.quoted, rate: conversion.quotedRate },
    { label: "Confirmed", count: conversion.confirmed, rate: conversion.closeRate },
    { label: "Completed", count: conversion.completed, rate: null },
  ];
  const max = Math.max(1, conversion.total);

  return (
    <div className="bg-(--card) border border-(--border) rounded-xl p-5">
      <h2 className="text-sm font-semibold text-(--text-primary) mb-4">
        Conversion
      </h2>

      {/* Funnel */}
      <div className="space-y-2">
        {steps.map((s) => (
          <div key={s.label} className="flex items-center gap-3">
            <span className="w-20 shrink-0 text-xs text-(--text-secondary)">
              {s.label}
            </span>
            <div className="flex-1 h-5 rounded bg-(--surface) overflow-hidden">
              <div
                className="h-full bg-(--accent)/70 rounded"
                style={{ width: `${(s.count / max) * 100}%` }}
              />
            </div>
            <span className="w-8 shrink-0 text-xs font-semibold text-(--text-secondary) text-right">
              {s.count}
            </span>
            <span className="w-10 shrink-0 text-xs text-(--text-muted) text-right">
              {s.rate !== null ? `${s.rate}%` : ""}
            </span>
          </div>
        ))}
      </div>

      {/* Headline conversion rates */}
      <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-(--border)">
        <div>
          <p className="text-2xl font-bold text-(--text-primary)">
            {conversion.closeRate}%
          </p>
          <p className="text-[11px] text-(--text-muted)">
            Lead → won ({conversion.confirmed}/{conversion.total})
          </p>
        </div>
        <div>
          <p className="text-2xl font-bold text-(--text-primary)">
            {conversion.winRate}%
          </p>
          <p className="text-[11px] text-(--text-muted)">
            Win rate on quoted ({conversion.confirmed}/{conversion.quoted})
          </p>
        </div>
      </div>

      {/* Quote acceptance (from real quote statuses) */}
      <div className="mt-4 pt-4 border-t border-(--border)">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-(--text-secondary) font-medium">
            Quote acceptance
          </span>
          <span className="text-xs text-(--text-muted)">
            {quoteStats.accepted}/{quoteStats.decided || 0} decided
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2.5 rounded-full bg-(--surface) overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full"
              style={{ width: `${quoteStats.acceptanceRate}%` }}
            />
          </div>
          <span className="text-sm font-bold text-(--text-primary)">
            {quoteStats.acceptanceRate}%
          </span>
        </div>
        <p className="mt-2 text-[11px] text-(--text-muted)">
          {quoteStats.accepted} accepted · {quoteStats.lost} lost ·{" "}
          {quoteStats.sent} awaiting reply
          {quoteStats.alternative > 0
            ? ` · ${quoteStats.alternative} alternative`
            : ""}
        </p>
      </div>
    </div>
  );
}
