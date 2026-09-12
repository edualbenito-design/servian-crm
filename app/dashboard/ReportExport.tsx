"use client";

import type { MonthlyReport } from "@/lib/db";

function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, (m || 1) - 1, 1).toLocaleDateString("en-AE", {
    month: "long",
    year: "numeric",
  });
}

// CSV field: quote and escape if it contains a comma, quote or newline.
function cell(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function buildCsv(r: MonthlyReport): string {
  const rows: (string | number)[][] = [
    ["Monthly report", monthLabel(r.month)],
    [],
    ["Metric", "Value"],
    ["Leads captured", r.leads],
    ["Deals won", r.won],
    ["Won value (AED)", Math.round(r.wonValue)],
    ["Lost / Ghosting", r.lost],
    ["Invoiced (AED)", Math.round(r.invoiced)],
    ["Invoices", r.invoicedCount],
    ["Collected (AED)", Math.round(r.collected)],
    ["Overdue follow-ups", r.overdue],
    ["Avg time to close (days)", r.avgCloseDays ?? ""],
    [],
    ["By commercial"],
    ["Commercial", "Leads", "Won", "Won value (AED)", "Invoiced (AED)", "Collected (AED)"],
    ...r.byCommercial.map((c) => [
      c.name,
      c.leads,
      c.won,
      Math.round(c.wonValue),
      Math.round(c.invoiced),
      Math.round(c.collected),
    ]),
  ];
  return rows.map((row) => row.map(cell).join(",")).join("\n");
}

export function ReportExport({ report }: { report: MonthlyReport }) {
  function downloadCsv() {
    const blob = new Blob([buildCsv(report)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `servian-report-${report.month}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex items-center gap-2 print:hidden">
      {/* Clean margins + hide app chrome when printing this report to PDF. */}
      <style>{`@media print { @page { margin: 14mm; } }`}</style>
      <button
        type="button"
        onClick={downloadCsv}
        className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-(--border) text-(--text-secondary) hover:text-(--text-primary) hover:border-(--accent)/40 transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
        CSV
      </button>
      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-(--border) text-(--text-secondary) hover:text-(--text-primary) hover:border-(--accent)/40 transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z" /></svg>
        Print / PDF
      </button>
    </div>
  );
}
