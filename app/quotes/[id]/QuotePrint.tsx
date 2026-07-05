"use client";

import type { Quote } from "@/lib/data";

function money(n: number) {
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function formatDate(s?: string) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-AE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function QuotePrint({
  quote,
  totals,
  client,
  projectName,
}: {
  quote: Quote;
  totals: { subtotal: number; vat: number; total: number };
  client: { name: string; phone: string; email: string; location: string };
  projectName: string;
}) {
  return (
    <div className="min-h-screen bg-zinc-100 py-6 print:bg-white print:py-0">
      {/* Toolbar (hidden when printing) */}
      <div className="max-w-3xl mx-auto px-4 mb-4 flex items-center justify-between print:hidden">
        <a href="javascript:history.back()" className="text-sm text-zinc-500 hover:text-zinc-800">
          ← Back
        </a>
        <button
          type="button"
          onClick={() => window.print()}
          className="px-5 py-2 rounded-lg bg-amber-500 text-black text-sm font-semibold hover:bg-amber-400"
        >
          Download / Print PDF
        </button>
      </div>

      {/* A4 document */}
      <div className="max-w-3xl mx-auto bg-white text-zinc-900 shadow-lg print:shadow-none p-10 print:p-0">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-zinc-200 pb-6 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded bg-amber-500 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-black">
                  <path d="M3 21V9l9-6 9 6v12" />
                  <path d="M9 21V12h6v9" />
                </svg>
              </div>
              <div>
                <p className="font-bold text-lg leading-tight">Servian Contracting</p>
                <p className="text-xs text-zinc-500">Construction · Renovation · Maintenance</p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold tracking-tight">QUOTATION</p>
            <p className="font-mono text-sm text-zinc-600">{quote.number}</p>
          </div>
        </div>

        {/* Meta */}
        <div className="grid grid-cols-2 gap-6 mb-8 text-sm">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-400 mb-1">Bill To</p>
            <p className="font-semibold">{client.name}</p>
            {client.location && <p className="text-zinc-600">{client.location}</p>}
            {client.phone && <p className="text-zinc-600">{client.phone}</p>}
            {client.email && <p className="text-zinc-600">{client.email}</p>}
          </div>
          <div className="text-right">
            {projectName && (
              <>
                <p className="text-xs uppercase tracking-wide text-zinc-400 mb-1">Project</p>
                <p className="font-medium mb-2">{projectName}</p>
              </>
            )}
            <p className="text-sm">
              <span className="text-zinc-400">Issue date: </span>
              {formatDate(quote.issueDate)}
            </p>
            {quote.validUntil && (
              <p className="text-sm">
                <span className="text-zinc-400">Valid until: </span>
                {formatDate(quote.validUntil)}
              </p>
            )}
          </div>
        </div>

        {/* Items table */}
        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="border-b-2 border-zinc-800 text-left">
              <th className="py-2">Description</th>
              <th className="py-2 text-right w-16">Qty</th>
              <th className="py-2 text-right w-28">Unit Price</th>
              <th className="py-2 text-right w-32">Amount</th>
            </tr>
          </thead>
          <tbody>
            {quote.items.map((it, i) => (
              <tr key={i} className="border-b border-zinc-200">
                <td className="py-2.5">{it.description || "—"}</td>
                <td className="py-2.5 text-right">{it.qty}</td>
                <td className="py-2.5 text-right font-mono">{money(it.unitPrice)}</td>
                <td className="py-2.5 text-right font-mono">
                  {money((Number(it.qty) || 0) * (Number(it.unitPrice) || 0))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mb-8">
          <div className="w-64 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500">Subtotal</span>
              <span className="font-mono">{money(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">VAT ({quote.vatRate}%)</span>
              <span className="font-mono">{money(totals.vat)}</span>
            </div>
            <div className="flex justify-between text-base font-bold border-t-2 border-zinc-800 pt-1.5">
              <span>Total</span>
              <span className="font-mono">{money(totals.total)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {quote.notes && (
          <div className="border-t border-zinc-200 pt-4 mb-6">
            <p className="text-xs uppercase tracking-wide text-zinc-400 mb-1">Notes / Terms</p>
            <p className="text-sm text-zinc-600 whitespace-pre-line">{quote.notes}</p>
          </div>
        )}

        <p className="text-center text-xs text-zinc-400 mt-10">
          Thank you for your business · Servian Contracting
        </p>
      </div>
    </div>
  );
}
