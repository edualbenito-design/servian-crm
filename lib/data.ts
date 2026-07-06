export type PropertyType = "villa" | "apartment" | "office" | "other";
export type LeadSource = "referral" | "instagram" | "other";
export type ProjectStatus = "active" | "completed" | "on-hold";
export type PipelineStage = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

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

export type QuoteStatus = "draft" | "sent" | "accepted" | "rejected";

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

export interface Payment {
  id: string;
  quoteId: string;
  projectId: string;
  clientId: string;
  amount: number;
  method: PaymentMethod;
  paidOn: string; // YYYY-MM-DD
  note?: string;
  createdBy?: string;
  createdAt: string;
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

// Sums payments against a total and derives the payment status.
export function paymentSummary(
  total: number,
  payments: { amount: number }[]
): { paid: number; balance: number; status: PaymentStatus } {
  const paid = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const balance = Math.max(0, total - paid);
  const status: PaymentStatus =
    paid <= 0 ? "unpaid" : paid + 0.001 >= total ? "paid" : "partial";
  return { paid, balance, status };
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
  // Manager sign-off
  approved: boolean;
  approvedBy?: string;
  approvedAt?: string;
  // Quotations
  quotes: Quote[];
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
  notes?: string;
  projects: Project[];
  activities: Activity[];
  // Deletion request (commercial asks; a manager confirms → archived)
  deletionRequestedBy?: string;
  deletionRequestedAt?: string;
  deletionReason?: string;
}

export const PIPELINE_STAGES: Record<PipelineStage, string> = {
  1: "Lead Received",
  2: "First Contact",
  3: "Site Visit 1",
  4: "Quote 1 Sent",
  5: "Site Visit 2",
  6: "Quote 2 Sent",
  7: "Project Confirmed",
  8: "Project Completed",
};
