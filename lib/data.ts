export type PropertyType = "villa" | "apartment" | "office" | "other";
export type LeadSource = "referral" | "instagram" | "other";
export type ProjectStatus = "active" | "completed" | "on-hold";
export type PipelineStage = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

// Anyone who can manage or capture a client: 4 commercials + 2 managers.
// Unassigned = generic pool (used for assignedTo only).
export const SALESPEOPLE = [
  "Joana",
  "Alfie",
  "Elsayed",
  "Faizan",
  "Eduardo",
  "Sergio",
  "Unassigned",
] as const;

export type Salesperson = (typeof SALESPEOPLE)[number];

// Same people, without the "Unassigned" pool — for "captured by".
export const CAPTURERS = [
  "Joana",
  "Alfie",
  "Elsayed",
  "Faizan",
  "Eduardo",
  "Sergio",
] as const;

export type Capturer = (typeof CAPTURERS)[number];

export type ActivityType =
  | "note"
  | "client_updated"
  | "project_created"
  | "project_updated"
  | "stage_changed";

export interface Activity {
  id: string;
  type: ActivityType;
  description: string;
  createdAt: string;
  projectId?: string | null;
}

export interface Supplier {
  name: string;
  material: string;
}

// ── Site progress (construction milestones) ────────────────────────────────────
// Ordered checkpoints of the actual building work. Each carries a cumulative %
// reached when that stage is done (e.g. tiling done = 60% of the job). Progress
// = the highest % among completed milestones. Editable per project (a bathroom,
// a kitchen and a paint job have different stages).
export interface Milestone {
  id: string;
  label: string;
  pct: number; // cumulative % of the whole job reached at this stage
  done: boolean;
  doneAt?: string;
}

// Seed template offered on empty projects (a typical kitchen). Fully editable.
export const DEFAULT_MILESTONES: { label: string; pct: number }[] = [
  { label: "Demolition / strip-out", pct: 20 },
  { label: "Tiling & electrical", pct: 60 },
  { label: "Furniture installed", pct: 70 },
  { label: "Appliances installed", pct: 90 },
  { label: "Clean & handover", pct: 100 },
];

// Overall work progress = highest % among the completed milestones.
export function obraProgress(milestones: Milestone[]): number {
  return milestones.reduce((max, m) => (m.done && m.pct > max ? m.pct : max), 0);
}

// ── Follow-ups ────────────────────────────────────────────────────────────────
// A follow-up is a task ("message the client on the 28th to collect the 1st
// payment"). It belongs to a client and, usually, to a specific project. It
// stays pending (and keeps alerting when overdue) until it's marked done or
// rescheduled. Every action carries a note (the "why").
export type FollowUpStatus = "pending" | "done";

export interface FollowUp {
  id: string;
  clientId: string;
  projectId?: string | null; // the project this is about (null = general/lead)
  dueDate: string; // YYYY-MM-DD
  note?: string;
  status: FollowUpStatus;
  doneNote?: string; // what was done, added when completed
  doneAt?: string;
  doneBy?: string;
  createdBy?: string;
  createdAt: string;
  // Optional attachment (screenshot of the conversation, proof…)
  attachmentPath?: string;
  attachmentName?: string;
  attachmentUrl?: string; // short-lived signed URL
}

// Earliest still-pending follow-up in a list (drives the "next follow-up" date
// shown across the app). Returns undefined if there are none pending.
export function nextPendingFollowUp(list: FollowUp[]): FollowUp | undefined {
  return list
    .filter((f) => f.status === "pending")
    .sort((a, b) => (a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0))[0];
}

export type FileCategory = "render" | "receipt" | "document" | "other";

export const FILE_CATEGORIES: { value: FileCategory; label: string }[] = [
  { value: "render", label: "Render" },
  { value: "receipt", label: "Payment receipt" },
  { value: "document", label: "Document" },
  { value: "other", label: "Other" },
];

export interface ProjectFile {
  id: string;
  name: string;
  path: string;
  mime?: string;
  size: number;
  category: FileCategory;
  uploadedBy: string;
  createdAt: string;
  url?: string; // short-lived signed URL
}

// draft/sent = in progress · accepted = the winning quote · alternative = not
// chosen because another quote for the SAME project won (no loss) · lost = the
// client didn't go ahead (real loss). "rejected" is legacy = treated as "lost".
export type QuoteStatus =
  | "draft"
  | "sent"
  | "accepted"
  | "alternative"
  | "lost"
  | "rejected";

export interface QuoteItem {
  description: string;
  qty: number;
  unitPrice: number;
}

export type PaymentMethod = "cash" | "bank" | "cheque" | "card" | "other";

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "bank", label: "Bank transfer" },
  { value: "cash", label: "Cash" },
  { value: "cheque", label: "Cheque" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
];

// Milestone label for a payment (construction jobs are usually paid in stages).
export const PAYMENT_MILESTONES = [
  "First payment",
  "Second payment",
  "Third payment",
  "Fourth payment",
  "Final payment",
  "Other",
] as const;

export interface Payment {
  id: string;
  quoteId: string;
  projectId: string;
  clientId: string;
  amount: number;
  method: PaymentMethod;
  paidOn: string; // YYYY-MM-DD
  milestone?: string; // e.g. "First payment", "Final payment"
  note?: string;
  createdBy?: string;
  createdAt: string;
  // Optional proof of payment (bank transfer screenshot, receipt…)
  receiptPath?: string;
  receiptName?: string;
  receiptUrl?: string; // short-lived signed URL
}

export interface Quote {
  id: string;
  projectId: string;
  clientId: string;
  number: string;
  status: QuoteStatus;
  issueDate: string; // YYYY-MM-DD
  validUntil?: string;
  vatRate: number; // percent, e.g. 5
  notes?: string;
  items: QuoteItem[];
  sentAt?: string;
  createdAt: string;
  // Payments recorded against this (accepted) quote
  payments: Payment[];
  // Invoice issuance (an accepted quote issued as a TAX INVOICE)
  invoiceNumber?: string;
  invoicedAt?: string;
}

export type PaymentStatus = "unpaid" | "partial" | "paid";

// Sums payments against a total and derives status + percentage paid.
export function paymentSummary(
  total: number,
  payments: { amount: number }[]
): {
  paid: number;
  balance: number;
  status: PaymentStatus;
  pctPaid: number;
  pctPending: number;
} {
  const paid = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const balance = Math.max(0, total - paid);
  const status: PaymentStatus =
    paid <= 0 ? "unpaid" : paid + 0.001 >= total ? "paid" : "partial";
  const pctPaid =
    total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : paid > 0 ? 100 : 0;
  return { paid, balance, status, pctPaid, pctPending: 100 - pctPaid };
}

export type FollowUpState = "overdue" | "today" | "upcoming" | "none";

// Compares a follow-up date to today (local date, ignoring time).
export function followUpState(dateStr?: string): FollowUpState {
  if (!dateStr) return "none";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return "none";
  if (d.getTime() < today.getTime()) return "overdue";
  if (d.getTime() === today.getTime()) return "today";
  return "upcoming";
}

// Totals helper (kept here so UI and PDF agree).
export function quoteTotals(q: { items: QuoteItem[]; vatRate: number }) {
  const subtotal = q.items.reduce(
    (s, it) => s + (Number(it.qty) || 0) * (Number(it.unitPrice) || 0),
    0
  );
  const vat = subtotal * ((Number(q.vatRate) || 0) / 100);
  return { subtotal, vat, total: subtotal + vat };
}

// ── Advance-payment warning ────────────────────────────────────────────────────
// Building work shouldn't start before the client has paid the advance. This
// flags a project whose start date is near (or past) while less than ADVANCE_PCT
// of its accepted quotes is paid — so the commercial chases the money in time.
export const ADVANCE_PCT = 50; // % of the job expected before work begins
export const ADVANCE_LEAD_DAYS = 7; // start warning this many days before start

export interface AdvanceAlert {
  startDate: string;
  daysUntil: number; // start − today, in days (negative = already started)
  committed: number; // total of accepted quotes
  paid: number; // paid so far on those quotes
  pct: number; // % paid
}

function dayDiff(fromYmd: string, toYmd: string): number {
  const a = new Date(fromYmd + "T00:00:00").getTime();
  const b = new Date(toYmd + "T00:00:00").getTime();
  if (isNaN(a) || isNaN(b)) return NaN;
  return Math.round((b - a) / 86400000);
}

export function advanceAlert(
  project: {
    startDate?: string;
    status?: string;
    quotes: {
      status: QuoteStatus;
      items: QuoteItem[];
      vatRate: number;
      payments: { amount: number }[];
    }[];
  },
  today: string // YYYY-MM-DD (local)
): AdvanceAlert | null {
  if (project.status === "completed") return null;
  if (!project.startDate) return null;
  const accepted = project.quotes.filter((q) => q.status === "accepted");
  if (accepted.length === 0) return null;

  let committed = 0;
  let paid = 0;
  for (const q of accepted) {
    committed += quoteTotals(q).total;
    paid += q.payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  }
  if (committed <= 0) return null;

  const pct = Math.round((paid / committed) * 100);
  if (pct >= ADVANCE_PCT) return null; // advance already covered

  const daysUntil = dayDiff(today, project.startDate);
  if (isNaN(daysUntil) || daysUntil > ADVANCE_LEAD_DAYS) return null; // too early

  return { startDate: project.startDate, daysUntil, committed, paid, pct };
}

export interface Project {
  id: string;
  name: string;
  description: string;
  budget: number;
  status: ProjectStatus;
  pipelineStage: PipelineStage;
  startDate: string;
  endDate?: string;
  activities: Activity[];
  // Delivery details
  contractor?: string; // external company handling the work
  teamMembers: string[]; // worker names
  suppliers: Supplier[]; // material suppliers
  milestones: Milestone[]; // site progress checkpoints
  // Manager sign-off
  approved: boolean;
  approvedBy?: string;
  approvedAt?: string;
  // Quotations
  quotes: Quote[];
  // Follow-up tasks for this project
  followUps: FollowUp[];
  // Attached files (renders, receipts, docs)
  files: ProjectFile[];
  // Deletion request (commercial asks; a manager confirms → archived)
  deletionRequestedBy?: string;
  deletionRequestedAt?: string;
  deletionReason?: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  location: string;
  propertyType: PropertyType;
  renovationType?: string; // free text: bathroom, kitchen, painting, AC…
  leadSource: LeadSource;
  assignedTo: Salesperson; // managing commercial
  capturedBy?: Capturer; // who brought the lead in
  capturedAt?: string; // date the lead was captured (YYYY-MM-DD)
  createdAt?: string; // row creation timestamp (fallback for month grouping)
  nextFollowUp?: string; // date of the next planned follow-up (YYYY-MM-DD)
  followUpNote?: string; // short reminder for that follow-up (e.g. "call on payday")
  notes?: string;
  projects: Project[];
  activities: Activity[];
  // General (no-project) follow-ups — e.g. for early leads before any project
  followUps: FollowUp[];
  // Deletion request (commercial asks; a manager confirms → archived)
  deletionRequestedBy?: string;
  deletionRequestedAt?: string;
  deletionReason?: string;
}

export const PIPELINE_STAGES: Record<PipelineStage, string> = {
  1: "New Lead",
  2: "Contacted",
  3: "Site Visit",
  4: "Quoted",
  5: "Negotiation",
  6: "Won — On site",
  7: "Completed",
  8: "Lost",
  9: "Ghosting",
};

// ── Stage semantics ─────────────────────────────────────────────────────────────
// Stages 1–5 = live funnel · 6 Won (on site) · 7 Completed · 8 Lost · 9 Ghosting.
// Won = the deal was won (on site or completed). Dead = lost or ghosting.
// Deriving outcomes from the STAGE keeps the board the single source of truth.
export const ONSITE_STAGE: PipelineStage = 6;
export const COMPLETED_STAGE: PipelineStage = 7;
export const LOST_STAGE: PipelineStage = 8;
export const GHOSTING_STAGE: PipelineStage = 9;

export function isWonStage(s: PipelineStage): boolean {
  return s === ONSITE_STAGE || s === COMPLETED_STAGE;
}
export function isDeadStage(s: PipelineStage): boolean {
  return s === LOST_STAGE || s === GHOSTING_STAGE;
}
export function isCompletedStage(s: PipelineStage): boolean {
  return s === COMPLETED_STAGE;
}
// Live funnel: still being worked (New Lead → Negotiation).
export function isOpenStage(s: PipelineStage): boolean {
  return s >= 1 && s <= 5;
}
