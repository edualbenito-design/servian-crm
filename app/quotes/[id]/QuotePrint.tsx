"use client";

import { useState } from "react";
import type { Quote } from "@/lib/data";
import { COMPANY } from "@/lib/company";

const GOLD = COMPANY.gold;

function money(n: number) {
  return new Intl.NumberFormat("en-AE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function formatDate(s?: string) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function QuotePrint({
  quote,
  totals,
  client,
  projectName,
  variant = "quote",
  paid = 0,
  balance,
  pctPaid = 0,
}: {
  quote: Quote;
  totals: {
    subtotal: number;
    discount: number;
    discountPct: number;
    net: number;
    vat: number;
    total: number;
  };
  client: { name: string; phone: string; email: string; location: string };
  projectName: string;
  variant?: "quote" | "invoice";
  paid?: number;
  balance?: number;
  pctPaid?: number;
}) {
  const [logoOk, setLogoOk] = useState(true);
  const isInvoice = variant === "invoice";
  const docTitle = isInvoice ? "TAX INVOICE" : "QUOTATION";
  const docNumber = isInvoice
    ? quote.invoiceNumber ?? quote.number
    : quote.number;
  const docDate = isInvoice ? quote.invoicedAt ?? quote.issueDate : quote.issueDate;
  const balanceDue = balance ?? totals.total - paid;

  return (
    <div className="min-h-screen bg-zinc-100 py-6 print:bg-white print:py-0">
      {/* Zero page margins so the browser drops its own date/title/URL/page-number
          header & footer. The document keeps its own inner padding below. */}
      <style>{`@media print { @page { margin: 0; } html, body { background: #fff; } }`}</style>

      {/* Toolbar (hidden when printing) */}
      <div className="max-w-3xl mx-auto px-4 mb-4 flex items-center justify-between print:hidden">
        <button
          type="button"
          onClick={() => {
            // Invoices open in a new tab (no history) → close it; otherwise go back.
            if (window.history.length > 1) window.history.back();
            else window.close();
          }}
          className="text-sm text-zinc-500 hover:text-zinc-800"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="px-5 py-2 rounded-lg text-white text-sm font-semibold"
          style={{ backgroundColor: GOLD }}
        >
          Download / Print PDF
        </button>
      </div>

      {/* A4 document */}
      <div className="max-w-3xl mx-auto bg-white text-zinc-800 shadow-lg print:shadow-none p-10 print:px-12 print:py-14">
        {/* Header: logo left, QUOTATION right */}
        <div className="flex items-start justify-between mb-2">
          <div>
            {logoOk ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src="/logo.png"
                alt="Servian Contracting"
                className="h-20 w-auto object-contain"
                onError={() => setLogoOk(false)}
              />
            ) : (
              <div className="flex items-center gap-2">
                <div
                  className="w-10 h-10 rounded flex items-center justify-center"
                  style={{ backgroundColor: GOLD }}
                >
                  <span className="text-white font-bold text-lg">S</span>
                </div>
                <div>
                  <p className="font-bold tracking-wide">SERVIAN</p>
                  <p className="text-[10px] tracking-[0.3em] text-zinc-500">
                    CONTRACTING
                  </p>
                </div>
              </div>
            )}
          </div>
          <div className="text-right">
            <p className="text-3xl font-light tracking-wide text-zinc-700">
              {docTitle}
            </p>
            <p className="font-semibold text-sm" style={{ color: GOLD }}>
              # {docNumber}
            </p>
            <p className="mt-3 text-xs text-zinc-500">
              {isInvoice ? "Balance Due" : "Total"}
            </p>
            <p className="text-lg font-bold">
              AED {money(isInvoice ? balanceDue : totals.total)}
            </p>
          </div>
        </div>

        {/* Company block */}
        <div className="mb-8">
          <p className="text-lg font-bold text-zinc-900">{COMPANY.name}</p>
          <p className="text-xs leading-relaxed" style={{ color: GOLD }}>
            {COMPANY.city}
            <br />
            {COMPANY.country}
            <br />
            {COMPANY.phone}
            <br />
            {COMPANY.email}
            <br />
            {COMPANY.website}
            {COMPANY.trn && (
              <>
                <br />
                TRN: {COMPANY.trn}
              </>
            )}
          </p>
        </div>

        {/* Bill To + meta */}
        <div className="grid grid-cols-2 gap-6 mb-6 text-sm">
          <div>
            <p className="text-xs mb-1" style={{ color: GOLD }}>
              Bill To
            </p>
            <p className="font-semibold">{client.name}</p>
            {client.location && <p className="text-zinc-600">{client.location}</p>}
            {client.phone && <p className="text-zinc-600">{client.phone}</p>}
            {projectName && (
              <p className="text-zinc-500 mt-1">Project: {projectName}</p>
            )}
          </div>
          <div className="text-right space-y-1">
            <div className="flex justify-end gap-6">
              <span style={{ color: GOLD }}>
                {isInvoice ? "Invoice Date :" : "Quote Date :"}
              </span>
              <span className="w-28 text-right">{formatDate(docDate)}</span>
            </div>
            {isInvoice ? (
              <div className="flex justify-end gap-6">
                <span style={{ color: GOLD }}>Ref. Quote :</span>
                <span className="w-28 text-right">{quote.number}</span>
              </div>
            ) : (
              quote.validUntil && (
                <div className="flex justify-end gap-6">
                  <span style={{ color: GOLD }}>Valid Until :</span>
                  <span className="w-28 text-right">
                    {formatDate(quote.validUntil)}
                  </span>
                </div>
              )
            )}
          </div>
        </div>

        {/* Items table */}
        <table className="w-full text-sm mb-4">
          <thead>
            <tr style={{ backgroundColor: GOLD }} className="text-white text-left">
              <th className="py-2 px-3 w-8 font-medium">#</th>
              <th className="py-2 px-3 font-medium">Item &amp; Description</th>
              <th className="py-2 px-3 text-right w-16 font-medium">Qty</th>
              <th className="py-2 px-3 text-right w-24 font-medium">Rate</th>
              <th className="py-2 px-3 text-right w-28 font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {quote.items.map((it, i) => (
              <tr key={i} className="border-b border-zinc-200 align-top">
                <td className="py-2.5 px-3 text-zinc-500">{i + 1}</td>
                <td className="py-2.5 px-3">{it.description || "—"}</td>
                <td className="py-2.5 px-3 text-right">
                  {(Number(it.qty) || 0).toFixed(2)}
                </td>
                <td className="py-2.5 px-3 text-right">{money(it.unitPrice)}</td>
                <td className="py-2.5 px-3 text-right">
                  {money((Number(it.qty) || 0) * (Number(it.unitPrice) || 0))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mb-8">
          <div className="w-72 text-sm">
            <div className="flex justify-between py-1.5">
              <span className="text-zinc-500">Sub Total</span>
              <span>{money(totals.subtotal)}</span>
            </div>
            {totals.discount > 0 && (
              <div className="flex justify-between py-1.5">
                <span className="text-zinc-500">
                  Discount ({totals.discountPct}%)
                  {quote.discountReason ? ` — ${quote.discountReason}` : ""}
                </span>
                <span>− {money(totals.discount)}</span>
              </div>
            )}
            <div className="flex justify-between py-1.5">
              <span className="text-zinc-500">VAT ({quote.vatRate}%)</span>
              <span>{money(totals.vat)}</span>
            </div>
            <div
              className="flex justify-between py-2 px-3 font-bold text-white"
              style={{ backgroundColor: GOLD }}
            >
              <span>Total</span>
              <span>AED {money(totals.total)}</span>
            </div>
            {isInvoice && (
              <>
                <div className="flex justify-between py-1.5">
                  <span className="text-zinc-500">Paid ({pctPaid}%)</span>
                  <span>- {money(paid)}</span>
                </div>
                <div className="flex justify-between py-2 border-t-2 border-zinc-800 font-bold text-base">
                  <span>Balance Due</span>
                  <span>AED {money(balanceDue)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Notes + bank details */}
        <div className="border-t border-zinc-200 pt-4 text-sm">
          <p className="text-xs mb-1" style={{ color: GOLD }}>
            Notes
          </p>
          <p className="text-zinc-600 mb-3 whitespace-pre-line">
            {quote.notes || "Thanks for your business."}
          </p>
          <div className="text-zinc-700 text-xs leading-relaxed">
            <p>
              <span className="text-zinc-500">Bank Name:</span>{" "}
              <strong>{COMPANY.bank.name}</strong>{" "}
              <span className="text-zinc-500">Account Name:</span>{" "}
              <strong>{COMPANY.bank.accountName}</strong>
            </p>
            <p>
              <span className="text-zinc-500">Account Number:</span>{" "}
              <strong>{COMPANY.bank.accountNumber}</strong>
            </p>
            <p>
              <span className="text-zinc-500">IBAN:</span>{" "}
              <strong>{COMPANY.bank.iban}</strong>
            </p>
            <p>
              <span className="text-zinc-500">BIC:</span>{" "}
              <strong>{COMPANY.bank.bic}</strong>
            </p>
            <p>
              <span className="text-zinc-500">Bank Address:</span>{" "}
              {COMPANY.bank.address}
            </p>
            <p>
              <span className="text-zinc-500">Currency:</span>{" "}
              {COMPANY.bank.currency}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
