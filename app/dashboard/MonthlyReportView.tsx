import type { MonthlyReport } from "@/lib/db";

function money(n: number) {
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, (m || 1) - 1, 1).toLocaleDateString("en-AE", {
    month: "long",
    year: "numeric",
  });
}

function Stat({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "good" | "warn" | "bad";
}) {
  const toneClass =
    tone === "good"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "warn"
        ? "text-amber-600 dark:text-amber-400"
        : tone === "bad"
          ? "text-red-600 dark:text-red-400"
          : "text-(--text-primary)";
  return (
    <div className="bg-(--card) border border-(--border) rounded-xl p-3 sm:p-5">
      <p className="text-[10px] sm:text-xs font-medium text-(--text-muted) uppercase tracking-widest mb-1">
        {label}
      </p>
      <p className={`text-lg sm:text-2xl font-bold truncate tabular-nums ${toneClass}`}>
        {value}
      </p>
      {sub && <p className="text-[11px] text-(--text-muted) mt-0.5 truncate">{sub}</p>}
    </div>
  );
}

// "What happened in month M" — every metric on its own date (see getMonthlyReport).
export function MonthlyReportView({ report }: { report: MonthlyReport }) {
  const { leadsBySource } = report;
  const totalSources = Math.max(
    1,
    leadsBySource.referral + leadsBySource.instagram + leadsBySource.other
  );
  const hasActivity =
    report.leads +
      report.won +
      report.lost +
      report.invoicedCount +
      report.overdue >
      0 || report.collected > 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Headline numbers for the month */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Leads captured" value={String(report.leads)} />
        <Stat
          label="Deals won"
          value={String(report.won)}
          sub={report.wonValue > 0 ? money(report.wonValue) : undefined}
          tone={report.won > 0 ? "good" : "default"}
        />
        <Stat
          label="Lost / Ghosting"
          value={String(report.lost)}
          tone={report.lost > 0 ? "bad" : "default"}
        />
        <Stat
          label="Overdue follow-ups"
          value={String(report.overdue)}
          tone={report.overdue > 0 ? "warn" : "default"}
        />
        <Stat label="Invoiced" value={money(report.invoiced)} sub={`${report.invoicedCount} invoice${report.invoicedCount === 1 ? "" : "s"}`} />
        <Stat label="Collected" value={money(report.collected)} tone={report.collected > 0 ? "good" : "default"} />
        <Stat
          label="Avg. time to close"
          value={report.avgCloseDays != null ? `${report.avgCloseDays}d` : "—"}
          sub={report.closedSamples > 0 ? `${report.closedSamples} closed` : "no closes"}
        />
        <Stat
          label="Leads by source"
          value={`${Math.round((leadsBySource.referral / totalSources) * 100)}%`}
          sub="referral"
        />
      </div>

      {!hasActivity && (
        <div className="bg-(--card) border border-(--border) rounded-xl p-8 text-center">
          <p className="text-sm text-(--text-muted)">
            No activity recorded in {monthLabel(report.month)}.
          </p>
        </div>
      )}

      {/* By commercial for the month */}
      {report.byCommercial.length > 0 && (
        <div className="bg-(--card) border border-(--border) rounded-xl p-5">
          <h2 className="text-sm font-semibold text-(--text-primary) mb-4">
            By commercial — {monthLabel(report.month)}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-(--text-muted) text-left">
                  <th className="font-medium py-2 pr-3">Commercial</th>
                  <th className="font-medium py-2 px-3 text-right">Leads</th>
                  <th className="font-medium py-2 px-3 text-right">Won</th>
                  <th className="font-medium py-2 px-3 text-right">Won value</th>
                  <th className="font-medium py-2 px-3 text-right">Invoiced</th>
                  <th className="font-medium py-2 pl-3 text-right">Collected</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-(--border)">
                {report.byCommercial.map((r) => (
                  <tr key={r.name} className="text-(--text-secondary)">
                    <td className="py-2.5 pr-3 font-medium text-(--text-primary)">{r.name}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">{r.leads}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">{r.won}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums font-mono">{money(r.wonValue)}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums font-mono">{money(r.invoiced)}</td>
                    <td className="py-2.5 pl-3 text-right tabular-nums font-mono">{money(r.collected)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-xs text-(--text-muted)">
        Each number counts by its own date: leads by capture, deals by when they were
        won or lost, invoices by issue date, money by payment date, overdue by due date.
        The live funnel and pipeline value are always &ldquo;now&rdquo; — switch to
        <span className="font-medium"> All time</span> to see them.
      </p>
    </div>
  );
}
