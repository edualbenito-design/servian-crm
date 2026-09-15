"use client";

import { useState } from "react";
import { COMPANY } from "@/lib/company";

const GOLD = COMPANY.gold;

function money(n: number) {
  return new Intl.NumberFormat("en-AE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

const statusLabel: Record<string, string> = {
  active: "Active",
  "on-hold": "On hold",
  completed: "Completed",
  lost: "Lost",
};

export function StatementPrint({
  client,
  rows,
  totals,
}: {
  client: { name: string; phone: string; email: string; location: string };
  rows: { name: string; status: string; committed: number; paid: number; balance: number }[];
  totals: { committed: number; paid: number; balance: number };
}) {
  const [logoOk, setLogoOk] = useState(true);
  const today = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-zinc-100 py-6 print:bg-white print:py-0">
      <style>{`@media print { @page { margin: 0; } html, body { background: #fff; } }`}</style>

      <div className="max-w-3xl mx-auto px-4 mb-4 flex items-center justify-between print:hidden">
        <button
          type="button"
          onClick={() => {
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

      <div className="max-w-3xl mx-auto bg-white text-zinc-800 shadow-lg print:shadow-none p-10 print:px-12 print:py-14">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div>
            {logoOk ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src="/logo.png" alt="Servian Contracting" className="h-20 w-auto object-contain" onError={() => setLogoOk(false)} />
            ) : (
              <p className="font-bold tracking-wide">SERVIAN CONTRACTING</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-3xl font-light tracking-wide text-zinc-700">STATEMENT</p>
            <p className="mt-3 text-xs text-zinc-500">Outstanding Balance</p>
            <p className="text-lg font-bold">AED {money(totals.balance)}</p>
          </div>
        </div>

        {/* Company */}
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
            {COMPANY.trn && (
              <>
                <br />
                TRN: {COMPANY.trn}
              </>
            )}
          </p>
        </div>

        {/* Bill To + date */}
        <div className="grid grid-cols-2 gap-6 mb-6 text-sm">
          <div>
            <p className="text-xs mb-1" style={{ color: GOLD }}>Statement For</p>
            <p className="font-semibold">{client.name}</p>
            {client.location && <p className="text-zinc-600">{client.location}</p>}
            {client.phone && <p className="text-zinc-600">{client.phone}</p>}
          </div>
          <div className="text-right space-y-1">
            <div className="flex justify-end gap-6">
              <span style={{ color: GOLD }}>Statement Date :</span>
              <span className="w-28 text-right">{today}</span>
            </div>
          </div>
        </div>

        {/* Projects table */}
        <table className="w-full text-sm mb-4">
          <thead>
            <tr style={{ backgroundColor: GOLD }} className="text-white text-left">
              <th className="py-2 px-3 font-medium">Project</th>
              <th className="py-2 px-3 font-medium w-24">Status</th>
              <th className="py-2 px-3 text-right font-medium w-28">Quoted</th>
              <th className="py-2 px-3 text-right font-medium w-28">Paid</th>
              <th className="py-2 px-3 text-right font-medium w-28">Balance</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-4 px-3 text-center text-zinc-400">No projects yet.</td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={i} className="border-b border-zinc-200">
                  <td className="py-2.5 px-3">{r.name || "—"}</td>
                  <td className="py-2.5 px-3 text-zinc-500">{statusLabel[r.status] ?? r.status}</td>
                  <td className="py-2.5 px-3 text-right">{money(r.committed)}</td>
                  <td className="py-2.5 px-3 text-right text-emerald-700">{money(r.paid)}</td>
                  <td className="py-2.5 px-3 text-right font-medium">{money(r.balance)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mb-8">
          <div className="w-80 text-sm">
            <div className="flex justify-between py-1.5">
              <span className="text-zinc-500">Total quoted</span>
              <span>{money(totals.committed)}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-zinc-500">Total paid</span>
              <span className="text-emerald-700">− {money(totals.paid)}</span>
            </div>
            <div className="flex justify-between py-2 px-3 font-bold text-white" style={{ backgroundColor: GOLD }}>
              <span>Outstanding Balance</span>
              <span>AED {money(totals.balance)}</span>
            </div>
          </div>
        </div>

        {/* Bank details */}
        <div className="border-t border-zinc-200 pt-4 text-xs text-zinc-600 leading-relaxed">
          <p className="mb-1" style={{ color: GOLD }}>Payment details</p>
          <p>
            Bank Name: <strong>{COMPANY.bank.name}</strong> &nbsp; Account Name: <strong>{COMPANY.bank.accountName}</strong>
          </p>
          <p>Account Number: <strong>{COMPANY.bank.accountNumber}</strong></p>
          <p>IBAN: <strong>{COMPANY.bank.iban}</strong></p>
          <p>BIC: <strong>{COMPANY.bank.bic}</strong></p>
          <p>Currency: {COMPANY.bank.currency}</p>
        </div>
      </div>
    </div>
  );
}
