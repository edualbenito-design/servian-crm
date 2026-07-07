import type { Receivable } from "./db";

// A receivable is "overdue" once it has been outstanding for more than this
// many days (accepted quote / issued invoice with an unpaid balance).
export const OVERDUE_DAYS = 30;

export interface CollectionsSummary {
  totalOutstanding: number; // sum of all balances owed
  count: number; // number of receivables
  overdueAmount: number; // balance older than OVERDUE_DAYS
  overdueCount: number;
}

export function collectionsSummary(receivables: Receivable[]): CollectionsSummary {
  let totalOutstanding = 0;
  let overdueAmount = 0;
  let overdueCount = 0;
  for (const r of receivables) {
    totalOutstanding += r.balance;
    if (r.ageDays > OVERDUE_DAYS) {
      overdueAmount += r.balance;
      overdueCount++;
    }
  }
  return {
    totalOutstanding,
    count: receivables.length,
    overdueAmount,
    overdueCount,
  };
}

// ── Ageing buckets (how long money has been owed) ──────────────────────────────

export interface AgeBucket {
  label: string;
  count: number;
  amount: number;
}

export function ageingBuckets(receivables: Receivable[]): AgeBucket[] {
  const buckets = [
    { label: "0–30 days", min: 0, max: 30 },
    { label: "31–60 days", min: 31, max: 60 },
    { label: "61–90 days", min: 61, max: 90 },
    { label: "90+ days", min: 91, max: Infinity },
  ].map((b) => ({ ...b, count: 0, amount: 0 }));

  for (const r of receivables) {
    const b = buckets.find((x) => r.ageDays >= x.min && r.ageDays <= x.max);
    if (b) {
      b.count++;
      b.amount += r.balance;
    }
  }
  return buckets.map(({ label, count, amount }) => ({ label, count, amount }));
}

// ── Outstanding by managing commercial ─────────────────────────────────────────

export interface CommercialOwed {
  name: string;
  count: number;
  amount: number;
}

export function outstandingByCommercial(receivables: Receivable[]): CommercialOwed[] {
  const map = new Map<string, CommercialOwed>();
  for (const r of receivables) {
    const row = map.get(r.assignedTo) ?? { name: r.assignedTo, count: 0, amount: 0 };
    row.count++;
    row.amount += r.balance;
    map.set(r.assignedTo, row);
  }
  return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
}
