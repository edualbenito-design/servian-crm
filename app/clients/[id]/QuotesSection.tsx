"use client";

import { useState, useEffect, useRef } from "react";
import {
  quoteTotals,
  paymentSummary,
  paymentPlanStatus,
  suggestedPaymentPlan,
  PAYMENT_METHODS,
  PAYMENT_MILESTONES,
  type Quote,
  type QuoteItem,
  type QuoteStatus,
  type Payment,
  type PaymentMethod,
  type PaymentStatus,
  type PaymentPlanItem,
} from "@/lib/data";
import {
  createQuote,
  updateQuote,
  setQuoteStatus,
  deleteQuote,
  addPayment,
  updatePayment,
  deletePayment,
  createInvoice,
  attachPaymentReceipt,
  removePaymentReceipt,
  setPaymentPlan,
  getQuoteWhatsAppLink,
  duplicateQuote,
} from "@/app/actions";
import { AttachmentControl } from "./AttachmentControl";

const INPUT =
  "w-full bg-(--surface) border border-(--border) rounded-lg px-3 py-2 text-sm text-(--text-primary) placeholder:text-(--text-muted) focus:outline-none focus:border-(--accent)/50 focus:ring-1 focus:ring-(--accent)/20 transition-colors";

const statusStyle: Record<QuoteStatus, string> = {
  draft:
    "bg-zinc-100 text-zinc-600 border border-zinc-200 dark:bg-zinc-800/60 dark:text-zinc-400 dark:border-zinc-700/60",
  sent: "bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/40 dark:text-blue-400 dark:border-blue-800/50",
  accepted:
    "bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-800/50",
  alternative:
    "bg-zinc-100 text-zinc-500 border border-zinc-200 dark:bg-zinc-800/40 dark:text-zinc-500 dark:border-zinc-700/50",
  lost: "bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/40 dark:text-red-400 dark:border-red-800/50",
  rejected:
    "bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/40 dark:text-red-400 dark:border-red-800/50",
};

const statusLabel: Record<QuoteStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  accepted: "Accepted",
  alternative: "Alternative",
  lost: "Lost",
  rejected: "Lost",
};

function money(n: number) {
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

const paymentStatusStyle: Record<PaymentStatus, string> = {
  unpaid:
    "bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/40 dark:text-red-400 dark:border-red-800/50",
  partial:
    "bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/40 dark:text-amber-400 dark:border-amber-800/50",
  paid: "bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-800/50",
};

const paymentStatusLabel: Record<PaymentStatus, string> = {
  unpaid: "Unpaid",
  partial: "Partially paid",
  paid: "Paid",
};

const methodLabel: Record<PaymentMethod, string> = {
  bank: "Bank transfer",
  cash: "Cash",
  cheque: "Cheque",
  card: "Card",
  other: "Other",
};

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
  discountPct: number;
  discountReason: string;
  notes: string;
  items: QuoteItem[];
};

function emptyForm(): Form {
  return {
    issueDate: new Date().toISOString().slice(0, 10),
    validUntil: "",
    vatRate: 5,
    discountPct: 0,
    discountReason: "",
    notes: "",
    items: [{ description: "", qty: 1, unitPrice: 0 }],
  };
}

function toForm(q: Quote): Form {
  return {
    issueDate: q.issueDate,
    validUntil: q.validUntil ?? "",
    vatRate: q.vatRate,
    discountPct: q.discountPct ?? 0,
    discountReason: q.discountReason ?? "",
    notes: q.notes ?? "",
    items: q.items.length ? q.items : [{ description: "", qty: 1, unitPrice: 0 }],
  };
}

// Payments + invoice panel shown under an accepted quote.
function PaymentsPanel({
  quote,
  onAdd,
  onUpdate,
  onDelete,
  onSavePlan,
  onInvoice,
  onAttachReceipt,
  onRemoveReceipt,
}: {
  quote: Quote;
  onAdd: (fields: {
    amount: number;
    method: PaymentMethod;
    paidOn: string;
    milestone: string;
    note: string;
  }) => Promise<void>;
  onDelete: (paymentId: string) => Promise<void>;
  onUpdate: (
    paymentId: string,
    fields: {
      amount: number;
      method: PaymentMethod;
      paidOn: string;
      milestone: string;
      note: string;
    }
  ) => Promise<void>;
  onSavePlan: (items: PaymentPlanItem[]) => Promise<void>;
  onInvoice: () => Promise<string>;
  onAttachReceipt: (paymentId: string, file: File) => Promise<void>;
  onRemoveReceipt: (paymentId: string, path: string) => Promise<void>;
}) {
  const total = quoteTotals(quote).total;
  const { paid, balance, status, pctPaid } = paymentSummary(total, quote.payments);

  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("bank");
  const [paidOn, setPaidOn] = useState(new Date().toISOString().slice(0, 10));
  const [milestone, setMilestone] = useState<string>("First payment");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  // Expected payment plan (tentative dates + amounts).
  const today = new Date().toISOString().slice(0, 10);
  const plan = paymentPlanStatus(quote.paymentPlan, paid, today);
  const [planEditing, setPlanEditing] = useState(false);
  const [planItems, setPlanItems] = useState<PaymentPlanItem[]>(quote.paymentPlan);
  const [planBusy, setPlanBusy] = useState(false);

  function openPlanEdit() {
    setPlanItems(
      quote.paymentPlan.length > 0
        ? quote.paymentPlan
        : suggestedPaymentPlan(balance, today)
    );
    setPlanEditing(true);
  }
  function patchPlanRow(id: string, patch: Partial<PaymentPlanItem>) {
    setPlanItems((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }
  async function savePlanNow() {
    if (planBusy) return;
    setPlanBusy(true);
    try {
      await onSavePlan(planItems);
      setPlanEditing(false);
    } finally {
      setPlanBusy(false);
    }
  }
  const fmtD = (d: string) =>
    d ? new Date(d + "T00:00:00").toLocaleDateString("en-AE", { day: "numeric", month: "short" }) : "—";

  // Suggests the next milestone: ordinal by count, or "Final payment" once we
  // run out of ordinals (user can always change it).
  function suggestMilestone() {
    const n = quote.payments.length;
    return PAYMENT_MILESTONES[n] ?? "Final payment";
  }

  function openForm() {
    const willSettle = balance > 0 && Math.round(balance) >= balance;
    setEditingId(null);
    setAmount(balance > 0 ? String(Math.round(balance)) : "");
    setMethod("bank");
    setPaidOn(new Date().toISOString().slice(0, 10));
    // If this payment clears the balance, default to "Final payment".
    setMilestone(willSettle ? "Final payment" : suggestMilestone());
    setNote("");
    setAdding(true);
  }

  function openEdit(p: Quote["payments"][number]) {
    setEditingId(p.id);
    setAmount(String(p.amount));
    setMethod(p.method);
    setPaidOn(p.paidOn);
    setMilestone(p.milestone || "First payment");
    setNote(p.note ?? "");
    setAdding(true);
  }

  async function submit() {
    if (busy) return;
    const amt = Number(amount) || 0;
    if (amt <= 0) return;
    setBusy(true);
    try {
      if (editingId) {
        await onUpdate(editingId, { amount: amt, method, paidOn, milestone, note });
      } else {
        await onAdd({ amount: amt, method, paidOn, milestone, note });
      }
      setAdding(false);
      setEditingId(null);
    } finally {
      setBusy(false);
    }
  }

  async function openInvoice() {
    if (busy) return;
    setBusy(true);
    try {
      if (!quote.invoiceNumber) await onInvoice();
      window.open(
        `/quotes/${quote.id}?doc=invoice`,
        "_blank",
        "noopener,noreferrer"
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 rounded-lg border border-(--border) bg-(--card) p-3">
      <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-(--text-muted) uppercase tracking-widest">
            Payments
          </span>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${paymentStatusStyle[status]}`}
          >
            {paymentStatusLabel[status]}
          </span>
        </div>
        <button
          type="button"
          onClick={openInvoice}
          disabled={busy}
          className="px-2.5 py-1 rounded-md text-xs font-medium text-(--accent) border border-(--accent)/30 hover:bg-(--accent)/10 transition-colors disabled:opacity-50"
        >
          {quote.invoiceNumber ? `Invoice ${quote.invoiceNumber}` : "Create invoice"}
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2 mb-2">
        <div className="rounded-md bg-(--surface) border border-(--border) px-3 py-2">
          <p className="text-[11px] text-(--text-muted)">Due</p>
          <p className="text-sm font-bold font-mono text-(--text-primary)">
            {money(total)}
          </p>
        </div>
        <div className="rounded-md bg-(--surface) border border-(--border) px-3 py-2">
          <p className="text-[11px] text-(--text-muted)">Paid</p>
          <p className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {money(paid)}
          </p>
        </div>
        <div className="rounded-md bg-(--surface) border border-(--border) px-3 py-2">
          <p className="text-[11px] text-(--text-muted)">Balance</p>
          <p className="text-sm font-bold font-mono text-(--accent)">
            {money(balance)}
          </p>
        </div>
      </div>

      {/* Progress: % paid / pending */}
      <div className="mb-3">
        <div className="h-2 w-full rounded-full bg-(--surface) border border-(--border) overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${pctPaid}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-[11px]">
          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
            {pctPaid}% paid
          </span>
          <span className="text-(--text-muted)">{100 - pctPaid}% pending</span>
        </div>
      </div>

      {/* Expected payment plan */}
      <div className="mb-3 rounded-md border border-(--border) bg-(--surface) p-2.5">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-semibold text-(--text-muted) uppercase tracking-widest">
              Expected payments
            </span>
            {plan.overdue > 0.5 ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                {money(plan.overdue)} overdue
              </span>
            ) : plan.nextDate ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-(--accent)/10 text-(--accent) border border-(--accent)/20">
                Next: {money(plan.nextAmount)} · {fmtD(plan.nextDate)}
              </span>
            ) : null}
          </div>
          {!planEditing && (
            <button
              type="button"
              onClick={openPlanEdit}
              className="text-[11px] font-medium text-(--accent) hover:underline"
            >
              {quote.paymentPlan.length > 0 ? "Edit plan" : "Set up"}
            </button>
          )}
        </div>

        {planEditing ? (
          <div className="flex flex-col gap-2">
            {planItems.map((it) => (
              <div key={it.id} className="flex items-center gap-1.5 flex-wrap">
                <input
                  type="text"
                  value={it.label}
                  onChange={(e) => patchPlanRow(it.id, { label: e.target.value })}
                  placeholder="Label"
                  className={`${INPUT} !py-1.5 !text-xs flex-1 min-w-[90px]`}
                />
                <input
                  type="date"
                  value={it.expectedDate}
                  onChange={(e) => patchPlanRow(it.id, { expectedDate: e.target.value })}
                  className={`${INPUT} !py-1.5 !text-xs w-[130px]`}
                />
                <input
                  type="number"
                  min="0"
                  value={it.amount || ""}
                  onChange={(e) => patchPlanRow(it.id, { amount: Number(e.target.value) || 0 })}
                  placeholder="AED"
                  className={`${INPUT} !py-1.5 !text-xs w-[90px]`}
                />
                <button
                  type="button"
                  onClick={() => setPlanItems((p) => p.filter((x) => x.id !== it.id))}
                  className="text-(--text-muted) hover:text-red-500 text-xs px-1"
                  aria-label="Remove installment"
                >
                  ✕
                </button>
              </div>
            ))}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() =>
                  setPlanItems((p) => [
                    ...p,
                    { id: `pp_${Date.now()}`, label: "Payment", expectedDate: today, amount: 0 },
                  ])
                }
                className="text-[11px] font-medium text-(--accent) hover:underline"
              >
                + Add installment
              </button>
              <button
                type="button"
                onClick={() => setPlanItems(suggestedPaymentPlan(balance, today))}
                className="text-[11px] font-medium text-(--text-muted) hover:text-(--text-primary)"
              >
                Suggest from balance
              </button>
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPlanEditing(false)}
                  className="text-[11px] text-(--text-muted) hover:text-(--text-primary)"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={savePlanNow}
                  disabled={planBusy}
                  className="text-[11px] font-medium px-2.5 py-1 rounded-md bg-(--accent) text-white dark:text-black disabled:opacity-50"
                >
                  Save plan
                </button>
              </div>
            </div>
          </div>
        ) : quote.paymentPlan.length === 0 ? (
          <p className="text-[11px] text-(--text-muted)">
            No plan yet — set tentative dates so overdue only shows once a payment is
            actually due.
          </p>
        ) : (
          <ul className="space-y-1">
            {plan.lines.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="text-(--text-secondary) min-w-0 truncate">
                  {fmtD(l.expectedDate)} · {l.label}
                </span>
                <span className="flex items-center gap-2 shrink-0">
                  <span className="font-mono text-(--text-muted)">{money(l.amount)}</span>
                  {l.paidFull ? (
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                      Paid
                    </span>
                  ) : l.past ? (
                    <span className="text-[10px] font-semibold text-red-600 dark:text-red-400">
                      Overdue
                    </span>
                  ) : (
                    <span className="text-[10px] text-(--text-muted)">Pending</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Payment list */}
      {quote.payments.length > 0 && (
        <ul className="space-y-1.5 mb-3">
          {quote.payments.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-2 text-sm rounded-md bg-(--surface) border border-(--border) px-3 py-1.5"
            >
              <div className="min-w-0 flex items-center gap-2 flex-wrap">
                {p.milestone && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-(--accent)/10 text-(--accent) border border-(--accent)/20 shrink-0">
                    {p.milestone}
                  </span>
                )}
                <span className="font-mono font-semibold text-(--text-primary)">
                  {money(p.amount)}
                </span>
                <span className="text-(--text-muted)">
                  {methodLabel[p.method]}
                  {" · "}
                  {formatDate(p.paidOn)}
                  {p.note ? ` · ${p.note}` : ""}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <AttachmentControl
                  attachment={
                    p.receiptPath ? { name: p.receiptName, url: p.receiptUrl } : null
                  }
                  onUpload={(file) => onAttachReceipt(p.id, file)}
                  onRemove={() => onRemoveReceipt(p.id, p.receiptPath ?? "")}
                  label="receipt"
                />
                <button
                  type="button"
                  onClick={() => openEdit(p)}
                  className="text-(--text-muted) hover:text-(--accent) transition-colors"
                  title="Edit payment"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(p.id)}
                  className="text-(--text-muted) hover:text-red-500 transition-colors"
                  title="Remove payment"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Add payment */}
      {adding ? (
        <div className="rounded-md border border-(--border) bg-(--surface) p-3 space-y-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <label className="block text-[11px] font-medium text-(--text-muted) mb-1">Amount (AED)</label>
              <input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} className={INPUT} placeholder="0" autoFocus />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-(--text-muted) mb-1">Milestone</label>
              <select value={milestone} onChange={(e) => setMilestone(e.target.value)} className={INPUT}>
                {PAYMENT_MILESTONES.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-(--text-muted) mb-1">Method</label>
              <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} className={INPUT}>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-(--text-muted) mb-1">Date</label>
              <input type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} className={INPUT} />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-(--text-muted) mb-1">Note <span className="font-normal">(optional)</span></label>
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)} className={INPUT} placeholder="e.g. Cleared via WIO, ref 12345" />
          </div>
          <div className="flex items-center justify-end gap-2">
            <button type="button" onClick={() => { setAdding(false); setEditingId(null); }} className="px-3 py-1.5 text-xs font-medium text-(--text-secondary) hover:text-(--text-primary) transition-colors">
              Cancel
            </button>
            <button type="button" onClick={submit} disabled={busy || !(Number(amount) > 0)} className="px-3 py-1.5 rounded-md text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 transition-colors disabled:opacity-50">
              {busy ? "Saving…" : editingId ? "Save changes" : "Record payment"}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={openForm}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
        >
          + Record payment
        </button>
      )}
    </div>
  );
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
                  discountPct: f.discountPct || undefined,
                  discountReason: f.discountReason || undefined,
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
    const { supersededIds } = await setQuoteStatus(
      clientId,
      projectId,
      q.id,
      status
    );
    // Reflect siblings the server auto-moved to "alternative".
    if (supersededIds.length > 0) {
      setQuotes((prev) =>
        prev.map((x) =>
          supersededIds.includes(x.id) ? { ...x, status: "alternative" } : x
        )
      );
    }
  }

  async function remove(q: Quote) {
    if (!confirm(`Delete quote ${q.number}?`)) return;
    setQuotes((prev) => prev.filter((x) => x.id !== q.id));
    await deleteQuote(clientId, q.id);
  }

  async function duplicate(q: Quote) {
    try {
      const created = await duplicateQuote(clientId, q.id);
      setQuotes((prev) => [created, ...prev]);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not duplicate the quote.");
    }
  }

  // Open WhatsApp with a public, read-only link to this quote for the client.
  async function sendWhatsApp(q: Quote) {
    try {
      const link = await getQuoteWhatsAppLink(clientId, q.id);
      window.open(link, "_blank", "noopener,noreferrer");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not build the WhatsApp link.");
    }
  }

  async function addPay(
    q: Quote,
    fields: {
      amount: number;
      method: PaymentMethod;
      paidOn: string;
      milestone: string;
      note: string;
    }
  ) {
    const created: Payment = await addPayment(clientId, projectId, q.id, fields);
    setQuotes((prev) =>
      prev.map((x) =>
        x.id === q.id ? { ...x, payments: [...x.payments, created] } : x
      )
    );
  }

  async function savePlan(q: Quote, items: PaymentPlanItem[]) {
    // Optimistic: update the plan in place, then persist.
    setQuotes((prev) =>
      prev.map((x) => (x.id === q.id ? { ...x, paymentPlan: items } : x))
    );
    await setPaymentPlan(clientId, q.id, items);
  }

  async function updatePay(
    q: Quote,
    paymentId: string,
    fields: {
      amount: number;
      method: PaymentMethod;
      paidOn: string;
      milestone: string;
      note: string;
    }
  ) {
    // Optimistic: patch the payment in place (keep its receipt).
    setQuotes((prev) =>
      prev.map((x) =>
        x.id === q.id
          ? {
              ...x,
              payments: x.payments.map((p) =>
                p.id === paymentId
                  ? {
                      ...p,
                      amount: fields.amount,
                      method: fields.method,
                      paidOn: fields.paidOn,
                      milestone: fields.milestone || undefined,
                      note: fields.note.trim() || undefined,
                    }
                  : p
              ),
            }
          : x
      )
    );
    await updatePayment(clientId, paymentId, fields);
  }

  async function removePay(q: Quote, paymentId: string) {
    setQuotes((prev) =>
      prev.map((x) =>
        x.id === q.id
          ? { ...x, payments: x.payments.filter((p) => p.id !== paymentId) }
          : x
      )
    );
    await deletePayment(clientId, paymentId);
  }

  function patchPayment(q: Quote, paymentId: string, patch: Partial<Payment>) {
    setQuotes((prev) =>
      prev.map((x) =>
        x.id === q.id
          ? {
              ...x,
              payments: x.payments.map((p) =>
                p.id === paymentId ? { ...p, ...patch } : p
              ),
            }
          : x
      )
    );
  }

  async function attachReceipt(q: Quote, paymentId: string, file: File) {
    const fd = new FormData();
    fd.set("file", file);
    const att = await attachPaymentReceipt(clientId, paymentId, fd);
    patchPayment(q, paymentId, {
      receiptPath: att.path,
      receiptName: att.name,
      receiptUrl: att.url,
    });
  }

  async function removeReceipt(q: Quote, paymentId: string, path: string) {
    patchPayment(q, paymentId, {
      receiptPath: undefined,
      receiptName: undefined,
      receiptUrl: undefined,
    });
    await removePaymentReceipt(clientId, paymentId, path);
  }

  async function makeInvoice(q: Quote): Promise<string> {
    const res = await createInvoice(clientId, q.id);
    setQuotes((prev) =>
      prev.map((x) =>
        x.id === q.id
          ? { ...x, invoiceNumber: res.invoiceNumber, invoicedAt: res.invoicedAt }
          : x
      )
    );
    return res.invoiceNumber;
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

                {q.status === "alternative" && (
                  <p className="text-[11px] text-(--text-muted) mt-1 italic">
                    Not chosen — another quote for this project was accepted.
                  </p>
                )}

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
                    onClick={() => sendWhatsApp(q)}
                    title="Send this quote to the client on WhatsApp"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.29.173-1.414-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885M20.52 3.449C18.24 1.245 15.24.044 12.045.044 5.463.044.104 5.4.101 11.986c0 2.096.549 4.14 1.595 5.945L0 24l6.335-1.652a11.96 11.96 0 005.71 1.454h.006c6.585 0 11.946-5.357 11.949-11.945a11.9 11.9 0 00-3.481-8.418" /></svg>
                    WhatsApp
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(q)}
                    className="px-2.5 py-1 rounded-md text-xs font-medium text-(--text-muted) border border-(--border) hover:text-(--text-primary) transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => duplicate(q)}
                    title="Create a copy of this quote as a new draft"
                    className="px-2.5 py-1 rounded-md text-xs font-medium text-(--text-muted) border border-(--border) hover:text-(--text-primary) transition-colors"
                  >
                    Duplicate
                  </button>
                  {q.status !== "sent" && q.status !== "accepted" && (
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
                      Accept
                    </button>
                  )}
                  {q.status !== "lost" && q.status !== "rejected" && (
                    <button
                      type="button"
                      onClick={() => changeStatus(q, "lost")}
                      className="px-2.5 py-1 rounded-md text-xs font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      Lost
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

                {q.status === "accepted" && (
                  <PaymentsPanel
                    quote={q}
                    onAdd={(fields) => addPay(q, fields)}
                    onUpdate={(paymentId, fields) => updatePay(q, paymentId, fields)}
                    onDelete={(paymentId) => removePay(q, paymentId)}
                    onSavePlan={(items) => savePlan(q, items)}
                    onInvoice={() => makeInvoice(q)}
                    onAttachReceipt={(paymentId, file) =>
                      attachReceipt(q, paymentId, file)
                    }
                    onRemoveReceipt={(paymentId, path) =>
                      removeReceipt(q, paymentId, path)
                    }
                  />
                )}
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
                <div>
                  <label className="block text-xs font-medium text-(--text-secondary) mb-1.5">Discount %</label>
                  <input type="number" min="0" max="100" value={f.discountPct} onChange={(e) => setF((p) => ({ ...p, discountPct: Number(e.target.value) }))} className={INPUT} placeholder="0" />
                </div>
              </div>

              {f.discountPct > 0 && (
                <div>
                  <label className="block text-xs font-medium text-(--text-secondary) mb-1.5">Discount reason <span className="text-(--text-muted) font-normal">(shown on the quote)</span></label>
                  <input type="text" value={f.discountReason} onChange={(e) => setF((p) => ({ ...p, discountReason: e.target.value }))} className={INPUT} placeholder="e.g. Repeat client, seasonal offer" />
                </div>
              )}

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
                {totals.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-emerald-600 dark:text-emerald-400">
                      Discount ({f.discountPct}%)
                      {f.discountReason ? ` — ${f.discountReason}` : ""}
                    </span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400">− {money(totals.discount)}</span>
                  </div>
                )}
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
