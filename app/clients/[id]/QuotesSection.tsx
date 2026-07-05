"use client";

import { useState, useEffect, useRef } from "react";
import {
  quoteTotals,
  type Quote,
  type QuoteItem,
  type QuoteStatus,
} from "@/lib/data";
import {
  createQuote,
  updateQuote,
  setQuoteStatus,
  deleteQuote,
} from "@/app/actions";

const INPUT =
  "w-full bg-(--surface) border border-(--border) rounded-lg px-3 py-2 text-sm text-(--text-primary) placeholder:text-(--text-muted) focus:outline-none focus:border-(--accent)/50 focus:ring-1 focus:ring-(--accent)/20 transition-colors";

const statusStyle: Record<QuoteStatus, string> = {
  draft:
    "bg-zinc-100 text-zinc-600 border border-zinc-200 dark:bg-zinc-800/60 dark:text-zinc-400 dark:border-zinc-700/60",
  sent: "bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/40 dark:text-blue-400 dark:border-blue-800/50",
  accepted:
    "bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-800/50",
  rejected:
    "bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/40 dark:text-red-400 dark:border-red-800/50",
};

const statusLabel: Record<QuoteStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  accepted: "Accepted",
  rejected: "Rejected",
};

function money(n: number) {
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(s?: string) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-AE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

type Form = {
  issueDate: string;
  validUntil: string;
  vatRate: number;
  notes: string;
  items: QuoteItem[];
};

function emptyForm(): Form {
  return {
    issueDate: new Date().toISOString().slice(0, 10),
    validUntil: "",
    vatRate: 5,
    notes: "",
    items: [{ description: "", qty: 1, unitPrice: 0 }],
  };
}

function toForm(q: Quote): Form {
  return {
    issueDate: q.issueDate,
    validUntil: q.validUntil ?? "",
    vatRate: q.vatRate,
    notes: q.notes ?? "",
    items: q.items.length ? q.items : [{ description: "", qty: 1, unitPrice: 0 }],
  };
}

export function QuotesSection({
  clientId,
  projectId,
  initialQuotes,
}: {
  clientId: string;
  projectId: string;
  initialQuotes: Quote[];
}) {
  const [quotes, setQuotes] = useState<Quote[]>(initialQuotes);
  const [modal, setModal] = useState<
    { mode: "add" } | { mode: "edit"; id: string } | null
  >(null);
  const [f, setF] = useState<Form>(emptyForm);
  const [saving, setSaving] = useState(false);

  const closeRef = useRef(() => setModal(null));
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeRef.current();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const totals = quoteTotals(f);

  function openAdd() {
    setF(emptyForm());
    setModal({ mode: "add" });
  }
  function openEdit(q: Quote) {
    setF(toForm(q));
    setModal({ mode: "edit", id: q.id });
  }

  function setItem(i: number, patch: Partial<QuoteItem>) {
    setF((prev) => ({
      ...prev,
      items: prev.items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)),
    }));
  }
  function addItem() {
    setF((prev) => ({
      ...prev,
      items: [...prev.items, { description: "", qty: 1, unitPrice: 0 }],
    }));
  }
  function removeItem(i: number) {
    setF((prev) => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== i),
    }));
  }

  async function save() {
    if (saving || !modal) return;
    setSaving(true);
    try {
      if (modal.mode === "add") {
        const created = await createQuote(clientId, projectId, f);
        setQuotes((prev) => [created, ...prev]);
      } else {
        await updateQuote(clientId, modal.id, f);
        setQuotes((prev) =>
          prev.map((q) =>
            q.id === modal.id
              ? {
                  ...q,
                  issueDate: f.issueDate,
                  validUntil: f.validUntil || undefined,
                  vatRate: f.vatRate,
                  notes: f.notes || undefined,
                  items: f.items,
                }
              : q
          )
        );
      }
      setModal(null);
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(q: Quote, status: QuoteStatus) {
    setQuotes((prev) =>
      prev.map((x) => (x.id === q.id ? { ...x, status } : x))
    );
    await setQuoteStatus(clientId, projectId, q.id, status);
  }

  async function remove(q: Quote) {
    if (!confirm(`Delete quote ${q.number}?`)) return;
    setQuotes((prev) => prev.filter((x) => x.id !== q.id));
    await deleteQuote(clientId, q.id);
  }

  return (
    <div className="mt-6 border-t border-(--border) pt-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-(--text-muted) uppercase tracking-widest">
          Quotations ({quotes.length})
        </p>
        <button
          type="button"
          onClick={openAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-(--accent) text-white dark:text-black hover:bg-amber-400 transition-colors"
        >
          + New Quote
        </button>
      </div>

      {quotes.length === 0 ? (
        <p className="text-sm text-(--text-muted)">No quotations yet.</p>
      ) : (
        <div className="space-y-2">
          {quotes.map((q) => {
            const t = quoteTotals(q);
            return (
              <div
                key={q.id}
                className="rounded-lg border border-(--border) bg-(--surface) p-3"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-sm font-semibold text-(--text-primary)">
                      {q.number}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${statusStyle[q.status]}`}
                    >
                      {statusLabel[q.status]}
                    </span>
                  </div>
                  <span className="font-mono text-sm font-bold text-(--accent)">
                    {money(t.total)}
                  </span>
                </div>

                <p className="text-xs text-(--text-muted) mt-1">
                  {q.items.length} item{q.items.length === 1 ? "" : "s"} ·
                  issued {formatDate(q.issueDate)}
                  {q.sentAt ? ` · sent ${formatDate(q.sentAt)}` : ""}
                </p>

                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <a
                    href={`/quotes/${q.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 rounded-md text-xs font-medium text-(--accent) border border-(--accent)/30 hover:bg-(--accent)/10 transition-colors"
                  >
                    PDF
                  </a>
                  <button
                    type="button"
                    onClick={() => openEdit(q)}
                    className="px-2.5 py-1 rounded-md text-xs font-medium text-(--text-muted) border border-(--border) hover:text-(--text-primary) transition-colors"
                  >
                    Edit
                  </button>
                  {q.status !== "sent" && (
                    <button
                      type="button"
                      onClick={() => changeStatus(q, "sent")}
                      className="px-2.5 py-1 rounded-md text-xs font-medium text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    >
                      Mark sent
                    </button>
                  )}
                  {q.status !== "accepted" && (
                    <button
                      type="button"
                      onClick={() => changeStatus(q, "accepted")}
                      className="px-2.5 py-1 rounded-md text-xs font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                    >
                      Accepted
                    </button>
                  )}
                  {q.status !== "rejected" && (
                    <button
                      type="button"
                      onClick={() => changeStatus(q, "rejected")}
                      className="px-2.5 py-1 rounded-md text-xs font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      Rejected
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => remove(q)}
                    className="px-2.5 py-1 rounded-md text-xs font-medium text-(--text-muted) hover:text-red-500 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Builder modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/65 backdrop-blur-sm"
            onClick={() => setModal(null)}
          />
          <div className="relative z-10 bg-(--card) border border-(--border) rounded-2xl shadow-2xl shadow-black/60 w-full max-w-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-(--border) shrink-0">
              <h2 className="text-sm font-semibold text-(--text-primary)">
                {modal.mode === "add" ? "New Quotation" : "Edit Quotation"}
              </h2>
              <button
                type="button"
                onClick={() => setModal(null)}
                className="p-1.5 rounded-md text-(--text-muted) hover:text-(--text-primary) hover:bg-(--accent)/10 transition-colors"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {/* Line items */}
              <div>
                <div className="hidden sm:grid grid-cols-[1fr_70px_110px_110px_32px] gap-2 mb-1.5 px-1">
                  <span className="text-xs font-medium text-(--text-muted)">Description</span>
                  <span className="text-xs font-medium text-(--text-muted)">Qty</span>
                  <span className="text-xs font-medium text-(--text-muted)">Unit (AED)</span>
                  <span className="text-xs font-medium text-(--text-muted) text-right">Line</span>
                  <span />
                </div>
                <div className="space-y-2">
                  {f.items.map((it, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-2 sm:grid-cols-[1fr_70px_110px_110px_32px] gap-2 items-center"
                    >
                      <input
                        type="text"
                        value={it.description}
                        onChange={(e) => setItem(i, { description: e.target.value })}
                        className={`${INPUT} col-span-2 sm:col-span-1`}
                        placeholder="e.g. Kitchen cabinets"
                      />
                      <input
                        type="number"
                        min="0"
                        value={it.qty}
                        onChange={(e) => setItem(i, { qty: Number(e.target.value) })}
                        className={INPUT}
                        placeholder="Qty"
                      />
                      <input
                        type="number"
                        min="0"
                        value={it.unitPrice}
                        onChange={(e) => setItem(i, { unitPrice: Number(e.target.value) })}
                        className={INPUT}
                        placeholder="Price"
                      />
                      <span className="text-sm font-mono text-(--text-secondary) text-right hidden sm:block">
                        {money((Number(it.qty) || 0) * (Number(it.unitPrice) || 0))}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeItem(i)}
                        className="justify-self-end text-(--text-muted) hover:text-red-500 transition-colors"
                        title="Remove line"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 6 6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addItem}
                  className="mt-2 text-sm text-(--accent) hover:underline underline-offset-2"
                >
                  + Add line
                </button>
              </div>

              {/* Dates + VAT */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-(--text-secondary) mb-1.5">Issue Date</label>
                  <input type="date" value={f.issueDate} onChange={(e) => setF((p) => ({ ...p, issueDate: e.target.value }))} className={INPUT} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-(--text-secondary) mb-1.5">Valid Until</label>
                  <input type="date" value={f.validUntil} onChange={(e) => setF((p) => ({ ...p, validUntil: e.target.value }))} className={INPUT} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-(--text-secondary) mb-1.5">VAT %</label>
                  <input type="number" min="0" value={f.vatRate} onChange={(e) => setF((p) => ({ ...p, vatRate: Number(e.target.value) }))} className={INPUT} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-(--text-secondary) mb-1.5">Notes / Terms <span className="text-(--text-muted) font-normal">(optional)</span></label>
                <textarea rows={2} value={f.notes} onChange={(e) => setF((p) => ({ ...p, notes: e.target.value }))} className={`${INPUT} resize-none`} placeholder="Payment terms, exclusions, etc." />
              </div>

              {/* Totals */}
              <div className="rounded-lg bg-(--surface) border border-(--border) p-4 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-(--text-muted)">Subtotal</span>
                  <span className="font-mono text-(--text-secondary)">{money(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-(--text-muted)">VAT ({f.vatRate}%)</span>
                  <span className="font-mono text-(--text-secondary)">{money(totals.vat)}</span>
                </div>
                <div className="flex justify-between text-base font-bold pt-1.5 border-t border-(--border)">
                  <span className="text-(--text-primary)">Total</span>
                  <span className="font-mono text-(--accent)">{money(totals.total)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-(--border) shrink-0">
              <button type="button" onClick={() => setModal(null)} className="px-4 py-2 text-sm font-medium text-(--text-secondary) hover:text-(--text-primary) transition-colors">
                Cancel
              </button>
              <button type="button" onClick={save} disabled={saving} className="px-5 py-2 rounded-lg bg-(--accent) text-white dark:text-black text-sm font-semibold hover:bg-amber-400 transition-colors disabled:opacity-50">
                {saving ? "Saving…" : modal.mode === "add" ? "Create Quote" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
