import { serverClient } from "./supabase/server";
import { quoteTotals, nextPendingFollowUp, advanceAlert } from "./data";
import type { Client, Project, Activity, ActivityType, Quote, QuoteStatus, QuoteItem, Payment, PaymentMethod, ProjectFile, FileCategory, PropertyType, LeadSource, ProjectStatus, PipelineStage, Salesperson, FollowUp, FollowUpStatus, Milestone } from "./data";

type DbQuote = {
  id: string;
  project_id: string;
  client_id: string;
  number: string;
  status: string;
  issue_date: string;
  valid_until: string | null;
  vat_rate: number;
  notes: string | null;
  items: QuoteItem[] | null;
  sent_at: string | null;
  created_at: string;
  invoice_number?: string | null;
  invoiced_at?: string | null;
};

type DbPayment = {
  id: string;
  quote_id: string;
  project_id: string;
  client_id: string;
  amount: number;
  method: string | null;
  paid_on: string | null;
  milestone?: string | null;
  note: string | null;
  created_by: string | null;
  created_at: string;
  receipt_path?: string | null;
  receipt_name?: string | null;
};

function toPayment(p: DbPayment): Payment {
  return {
    id: p.id,
    quoteId: p.quote_id,
    projectId: p.project_id,
    clientId: p.client_id,
    amount: Number(p.amount) || 0,
    method: (p.method as PaymentMethod) ?? "other",
    paidOn: p.paid_on ?? p.created_at.slice(0, 10),
    milestone: p.milestone ?? undefined,
    note: p.note ?? undefined,
    createdBy: p.created_by ?? undefined,
    createdAt: p.created_at,
    receiptPath: p.receipt_path ?? undefined,
    receiptName: p.receipt_name ?? undefined,
  };
}

type DbFollowUp = {
  id: string;
  client_id: string;
  project_id: string | null;
  due_date: string;
  note: string | null;
  status: string;
  done_note: string | null;
  done_at: string | null;
  done_by: string | null;
  created_by: string | null;
  created_at: string;
  attachment_path?: string | null;
  attachment_name?: string | null;
};

function toFollowUp(f: DbFollowUp): FollowUp {
  return {
    id: f.id,
    clientId: f.client_id,
    projectId: f.project_id ?? null,
    dueDate: f.due_date,
    note: f.note ?? undefined,
    status: (f.status as FollowUpStatus) ?? "pending",
    doneNote: f.done_note ?? undefined,
    doneAt: f.done_at ?? undefined,
    doneBy: f.done_by ?? undefined,
    createdBy: f.created_by ?? undefined,
    createdAt: f.created_at,
    attachmentPath: f.attachment_path ?? undefined,
    attachmentName: f.attachment_name ?? undefined,
  };
}

function toQuote(q: DbQuote): Quote {
  return {
    id: q.id,
    projectId: q.project_id,
    clientId: q.client_id,
    number: q.number,
    status: q.status as QuoteStatus,
    issueDate: q.issue_date,
    validUntil: q.valid_until ?? undefined,
    vatRate: Number(q.vat_rate) || 0,
    notes: q.notes ?? undefined,
    items: q.items ?? [],
    sentAt: q.sent_at ?? undefined,
    createdAt: q.created_at,
    payments: [],
    invoiceNumber: q.invoice_number ?? undefined,
    invoicedAt: q.invoiced_at ?? undefined,
  };
}

type DbActivity = {
  id: string;
  client_id: string;
  project_id: string | null;
  type: string;
  description: string;
  created_at: string;
};

function toActivity(a: DbActivity): Activity {
  return {
    id: a.id,
    type: a.type as ActivityType,
    description: a.description,
    createdAt: a.created_at,
    projectId: a.project_id,
  };
}

type DbProject = {
  id: string;
  client_id: string;
  name: string;
  description: string;
  budget: number;
  status: string;
  pipeline_stage: number;
  start_date: string;
  end_date: string | null;
  created_at: string;
  contractor: string | null;
  team_members: string[] | null;
  suppliers: { name: string; material: string }[] | null;
  milestones: Milestone[] | null;
  approved: boolean | null;
  approved_by: string | null;
  approved_at: string | null;
  deleted_at?: string | null;
  deletion_requested_by?: string | null;
  deletion_requested_at?: string | null;
  deletion_reason?: string | null;
};

type DbClient = {
  id: string;
  name: string;
  phone: string;
  email: string;
  location: string;
  property_type: string;
  renovation_type: string | null;
  lead_source: string;
  assigned_to: string;
  captured_by: string | null;
  captured_at: string | null;
  next_follow_up: string | null;
  follow_up_note?: string | null;
  notes: string | null;
  created_at: string;
  deleted_at?: string | null;
  deletion_requested_by?: string | null;
  deletion_requested_at?: string | null;
  deletion_reason?: string | null;
  projects: DbProject[];
  activities?: DbActivity[];
  quotes?: DbQuote[];
};

function toProject(
  p: DbProject,
  activities: Activity[] = [],
  quotes: Quote[] = []
): Project {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    budget: p.budget,
    status: p.status as ProjectStatus,
    pipelineStage: p.pipeline_stage as PipelineStage,
    startDate: p.start_date,
    endDate: p.end_date ?? undefined,
    activities,
    contractor: p.contractor ?? undefined,
    teamMembers: p.team_members ?? [],
    suppliers: p.suppliers ?? [],
    milestones: p.milestones ?? [],
    approved: p.approved ?? false,
    approvedBy: p.approved_by ?? undefined,
    approvedAt: p.approved_at ?? undefined,
    quotes,
    followUps: [],
    files: [],
    deletionRequestedBy: p.deletion_requested_by ?? undefined,
    deletionRequestedAt: p.deletion_requested_at ?? undefined,
    deletionReason: p.deletion_reason ?? undefined,
  };
}

function toClient(c: DbClient): Client {
  const allActivities = (c.activities ?? []).map(toActivity);
  // Split: client-level history (no project) vs. per-project history.
  const clientActivities = allActivities.filter((a) => !a.projectId);
  const byProject = new Map<string, Activity[]>();
  for (const a of allActivities) {
    if (!a.projectId) continue;
    const list = byProject.get(a.projectId) ?? [];
    list.push(a);
    byProject.set(a.projectId, list);
  }

  // Group quotes by project.
  const quotesByProject = new Map<string, Quote[]>();
  for (const q of (c.quotes ?? []).map(toQuote)) {
    const list = quotesByProject.get(q.projectId) ?? [];
    list.push(q);
    quotesByProject.set(q.projectId, list);
  }

  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    email: c.email,
    location: c.location,
    propertyType: c.property_type as PropertyType,
    renovationType: c.renovation_type ?? undefined,
    leadSource: c.lead_source as LeadSource,
    assignedTo: c.assigned_to as Salesperson,
    capturedBy: (c.captured_by as Client["capturedBy"]) ?? undefined,
    capturedAt: c.captured_at ?? undefined,
    createdAt: c.created_at ?? undefined,
    nextFollowUp: c.next_follow_up ?? undefined,
    followUpNote: c.follow_up_note ?? undefined,
    notes: c.notes ?? undefined,
    // Hide archived (soft-deleted) projects everywhere.
    projects: c.projects
      .filter((p) => !p.deleted_at)
      .map((p) =>
        toProject(p, byProject.get(p.id) ?? [], quotesByProject.get(p.id) ?? [])
      ),
    activities: clientActivities,
    followUps: [],
    deletionRequestedBy: c.deletion_requested_by ?? undefined,
    deletionRequestedAt: c.deletion_requested_at ?? undefined,
    deletionReason: c.deletion_reason ?? undefined,
  };
}

// Pass `assignedTo` to restrict the list to one salesperson (used for
// non-manager users so they only see their own clients).
export async function getClients(assignedTo?: string): Promise<Client[]> {
  const db = serverClient();
  let query = db
    .from("clients")
    .select("*, projects(*)")
    .order("created_at", { ascending: true });

  if (assignedTo) query = query.eq("assigned_to", assignedTo);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  // Hide archived (soft-deleted) clients. Filtering in JS keeps this safe even
  // before the deleted_at column exists (it's simply absent → kept as active).
  const clients = (data as DbClient[])
    .filter((c) => !c.deleted_at)
    .map(toClient);
  // Attach pending follow-up tasks and derive each client's "next follow-up".
  await attachFollowUps(clients, { includeDone: false });
  return clients;
}

// Loads follow-up tasks for a set of clients and attaches them: general
// (no-project) ones to the client, project-specific ones to their project.
// Also derives each client's `nextFollowUp`/`followUpNote` (earliest pending)
// so the list, dashboard and 9am email keep working. Fails soft: if the
// follow_ups table doesn't exist yet, the legacy next_follow_up column stands.
async function attachFollowUps(
  clients: Client[],
  opts: { includeDone: boolean }
): Promise<void> {
  if (clients.length === 0) return;
  const db = serverClient();
  const ids = clients.map((c) => c.id);
  let query = db.from("follow_ups").select("*").in("client_id", ids);
  if (!opts.includeDone) query = query.eq("status", "pending");
  const { data, error } = await query.order("due_date", { ascending: true });
  if (error || !data) return; // table missing → keep legacy behavior

  const byClient = new Map<string, FollowUp[]>();
  for (const f of (data as DbFollowUp[]).map(toFollowUp)) {
    // Sign attachments only for the detail view (avoid extra calls on the list).
    if (opts.includeDone && f.attachmentPath) {
      const { data: signed } = await db.storage
        .from("project-files")
        .createSignedUrl(f.attachmentPath, 3600);
      f.attachmentUrl = signed?.signedUrl;
    }
    const list = byClient.get(f.clientId) ?? [];
    list.push(f);
    byClient.set(f.clientId, list);
  }

  for (const c of clients) {
    const all = byClient.get(c.id) ?? [];
    c.followUps = all.filter((f) => !f.projectId);
    for (const p of c.projects) {
      p.followUps = all.filter((f) => f.projectId === p.id);
    }
    // Tasks are authoritative once the table exists.
    const next = nextPendingFollowUp(all);
    c.nextFollowUp = next?.dueDate;
    c.followUpNote = next?.note;
  }
}

// ─── Follow-up agenda (calendar) ────────────────────────────────────────────────
// A flat list of follow-ups (pending + done) with client/project context, for
// the calendar. Pending show on their due day; done show on the day they were
// completed — so you can open a past day and see what was actually done.

export interface AgendaFollowUp {
  followUpId: string;
  clientId: string;
  name: string;
  location: string;
  phone: string;
  assignedTo: string;
  projectName: string | null;
  status: FollowUpStatus;
  dueDate: string;
  note: string;
  doneAt?: string; // ISO timestamp when completed
  doneBy?: string;
  doneNote?: string;
}

export async function getFollowUpAgenda(
  assignedTo?: string
): Promise<AgendaFollowUp[]> {
  const db = serverClient();

  let cq = db
    .from("clients")
    .select("id, name, location, phone, assigned_to, deleted_at, projects(id, name, deleted_at)");
  if (assignedTo) cq = cq.eq("assigned_to", assignedTo);
  const { data: clientsRaw, error: cErr } = await cq;
  if (cErr || !clientsRaw) return [];

  type CRow = {
    id: string;
    name: string;
    location: string | null;
    phone: string | null;
    assigned_to: string;
    deleted_at: string | null;
    projects: { id: string; name: string; deleted_at: string | null }[] | null;
  };
  const clientById = new Map<string, CRow>();
  const projectName = new Map<string, string>();
  for (const c of (clientsRaw as CRow[]).filter((c) => !c.deleted_at)) {
    clientById.set(c.id, c);
    for (const p of c.projects ?? []) {
      if (!p.deleted_at) projectName.set(p.id, p.name);
    }
  }

  const ids = Array.from(clientById.keys());
  if (ids.length === 0) return [];
  const { data: fus, error: fErr } = await db
    .from("follow_ups")
    .select("*")
    .in("client_id", ids);
  if (fErr || !fus) return [];

  const out: AgendaFollowUp[] = [];
  for (const f of (fus as DbFollowUp[]).map(toFollowUp)) {
    const c = clientById.get(f.clientId);
    if (!c) continue;
    out.push({
      followUpId: f.id,
      clientId: f.clientId,
      name: c.name,
      location: c.location ?? "",
      phone: c.phone ?? "",
      assignedTo: c.assigned_to,
      projectName: f.projectId ? projectName.get(f.projectId) ?? null : null,
      status: f.status,
      dueDate: f.dueDate,
      note: f.note ?? "",
      doneAt: f.doneAt,
      doneBy: f.doneBy,
      doneNote: f.doneNote,
    });
  }
  return out;
}

// ─── Advance-payment alerts (calendar) ──────────────────────────────────────────
// Projects whose start date is near/past while the advance isn't covered.

export interface AdvanceAlertRow {
  projectId: string;
  projectName: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  assignedTo: string;
  startDate: string;
  daysUntil: number;
  committed: number;
  paid: number;
  pct: number;
}

export async function getAdvanceAlerts(
  assignedTo?: string
): Promise<AdvanceAlertRow[]> {
  const db = serverClient();

  let cq = db
    .from("clients")
    .select("id, name, phone, assigned_to, deleted_at, projects(id, name, start_date, status, deleted_at)");
  if (assignedTo) cq = cq.eq("assigned_to", assignedTo);
  const { data: clientsRaw, error: cErr } = await cq;
  if (cErr || !clientsRaw) return [];

  type PRow = { id: string; name: string; start_date: string | null; status: string | null; deleted_at: string | null };
  type CRow = {
    id: string;
    name: string;
    phone: string | null;
    assigned_to: string;
    deleted_at: string | null;
    projects: PRow[] | null;
  };
  const clients = (clientsRaw as CRow[]).filter((c) => !c.deleted_at);

  // Accepted quotes + their payments, grouped by project.
  const { data: quotesRaw } = await db
    .from("quotes")
    .select("id, project_id, items, vat_rate")
    .eq("status", "accepted");
  const { data: paysRaw } = await db.from("payments").select("quote_id, amount");

  const paidByQuote = new Map<string, number>();
  for (const p of (paysRaw as { quote_id: string; amount: number }[] | null) ?? []) {
    paidByQuote.set(p.quote_id, (paidByQuote.get(p.quote_id) ?? 0) + (Number(p.amount) || 0));
  }
  // Build the lightweight quote list advanceAlert() expects, per project.
  const quotesByProject = new Map<
    string,
    { status: QuoteStatus; items: QuoteItem[]; vatRate: number; payments: { amount: number }[] }[]
  >();
  for (const q of (quotesRaw as { id: string; project_id: string; items: QuoteItem[] | null; vat_rate: number }[] | null) ?? []) {
    const list = quotesByProject.get(q.project_id) ?? [];
    list.push({
      status: "accepted",
      items: q.items ?? [],
      vatRate: Number(q.vat_rate) || 0,
      payments: [{ amount: paidByQuote.get(q.id) ?? 0 }],
    });
    quotesByProject.set(q.project_id, list);
  }

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const out: AdvanceAlertRow[] = [];
  for (const c of clients) {
    for (const p of c.projects ?? []) {
      if (p.deleted_at) continue;
      const alert = advanceAlert(
        {
          startDate: p.start_date ?? undefined,
          status: p.status ?? undefined,
          quotes: quotesByProject.get(p.id) ?? [],
        },
        today
      );
      if (!alert) continue;
      out.push({
        projectId: p.id,
        projectName: p.name,
        clientId: c.id,
        clientName: c.name,
        clientPhone: c.phone ?? "",
        assignedTo: c.assigned_to,
        ...alert,
      });
    }
  }
  // Most urgent first (most overdue = most negative daysUntil).
  out.sort((a, b) => a.daysUntil - b.daysUntil);
  return out;
}

// ─── Collections (money owed) ───────────────────────────────────────────────────
// A receivable = an ACCEPTED quote whose payments don't cover its total. Built
// with a handful of bulk queries (not per client) so the panel stays fast.

export interface Receivable {
  quoteId: string;
  number: string;
  invoiceNumber?: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  projectId: string;
  projectName: string;
  assignedTo: string;
  total: number;
  paid: number;
  balance: number;
  status: "unpaid" | "partial";
  sinceDate: string; // date used for ageing (invoice date, else issue date)
  ageDays: number;
  lastPaymentDate?: string;
}

// A single payment already collected, enriched with client/project so the
// Collections drill-down can show who paid and for which project.
export interface CollectedPayment {
  id: string;
  clientId: string;
  clientName: string;
  projectId: string;
  projectName: string;
  assignedTo: string;
  amount: number;
  paidOn: string; // YYYY-MM-DD
  method: string;
  milestone?: string;
  recordedBy?: string;
}

export interface Collections {
  receivables: Receivable[];
  collectedThisMonth: number; // sum of payments recorded in the current month
  collectedByMonth: { month: string; amount: number }[]; // last 6 months, old→new
  collectedPayments: CollectedPayment[]; // individual payments (for drill-down)
}

type DbQuoteLite = {
  id: string;
  number: string;
  project_id: string;
  client_id: string;
  items: QuoteItem[] | null;
  vat_rate: number;
  issue_date: string;
  invoice_number: string | null;
  invoiced_at: string | null;
};

type DbClientLite = {
  id: string;
  name: string;
  phone: string;
  assigned_to: string;
  deleted_at: string | null;
  projects: { id: string; name: string; deleted_at: string | null }[] | null;
};

// Pass `assignedTo` to restrict to one salesperson's clients (non-managers).
export async function getCollections(assignedTo?: string): Promise<Collections> {
  const db = serverClient();

  // Clients (+ their projects) to resolve names and skip archived ones.
  let cq = db
    .from("clients")
    .select("id, name, phone, assigned_to, deleted_at, projects(id, name, deleted_at)");
  if (assignedTo) cq = cq.eq("assigned_to", assignedTo);
  const { data: clientsRaw, error: cErr } = await cq;
  if (cErr || !clientsRaw) return { receivables: [], collectedThisMonth: 0, collectedByMonth: [], collectedPayments: [] };

  const clientById = new Map<string, DbClientLite>();
  const projectName = new Map<string, string>();
  const activeProject = new Set<string>();
  for (const c of (clientsRaw as DbClientLite[]).filter((c) => !c.deleted_at)) {
    clientById.set(c.id, c);
    for (const p of c.projects ?? []) {
      if (p.deleted_at) continue;
      projectName.set(p.id, p.name);
      activeProject.add(p.id);
    }
  }

  // Only ACCEPTED quotes represent money the client committed to pay.
  const { data: quotesRaw, error: qErr } = await db
    .from("quotes")
    .select("id, number, project_id, client_id, items, vat_rate, issue_date, invoice_number, invoiced_at")
    .eq("status", "accepted");
  if (qErr || !quotesRaw) return { receivables: [], collectedThisMonth: 0, collectedByMonth: [], collectedPayments: [] };

  // Payments (fail soft if the table / newer columns aren't there yet).
  type DbPayLite = {
    id: string;
    quote_id: string;
    client_id: string | null;
    project_id: string | null;
    amount: number;
    paid_on: string | null;
    method: string | null;
    milestone: string | null;
    created_by: string | null;
  };
  let { data: paysRaw } = await db
    .from("payments")
    .select("id, quote_id, client_id, project_id, amount, paid_on, method, milestone, created_by");
  if (!paysRaw) {
    // Retry with only the always-present columns (older schema).
    ({ data: paysRaw } = await db.from("payments").select("id, quote_id, amount, paid_on"));
  }
  const paidByQuote = new Map<string, number>();
  const lastPayByQuote = new Map<string, string>();
  const collectedByMonthMap = new Map<string, number>();
  const collectedPayments: CollectedPayment[] = [];
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  let collectedThisMonth = 0;
  for (const p of (paysRaw as DbPayLite[] | null) ?? []) {
    const amt = Number(p.amount) || 0;
    // Every payment counts toward its quote balance (for receivables below),
    // regardless of client scope — the quote list is already scoped.
    paidByQuote.set(p.quote_id, (paidByQuote.get(p.quote_id) ?? 0) + amt);
    if (!p.paid_on) continue;

    const prev = lastPayByQuote.get(p.quote_id);
    if (!prev || p.paid_on > prev) lastPayByQuote.set(p.quote_id, p.paid_on);

    // Collected totals & drill-down: only payments for clients in scope
    // (managers → everyone; sales → their own; excludes archived clients).
    const client = p.client_id ? clientById.get(p.client_id) : undefined;
    if (!client) continue;

    const m = p.paid_on.slice(0, 7);
    collectedByMonthMap.set(m, (collectedByMonthMap.get(m) ?? 0) + amt);
    if (m === thisMonth) collectedThisMonth += amt;

    collectedPayments.push({
      id: p.id,
      clientId: client.id,
      clientName: client.name,
      projectId: p.project_id ?? "",
      projectName: (p.project_id && projectName.get(p.project_id)) || "Project",
      assignedTo: client.assigned_to,
      amount: amt,
      paidOn: p.paid_on,
      method: p.method ?? "other",
      milestone: p.milestone ?? undefined,
      recordedBy: p.created_by ?? undefined,
    });
  }
  // Most recent payments first.
  collectedPayments.sort((a, b) => (a.paidOn < b.paidOn ? 1 : a.paidOn > b.paidOn ? -1 : 0));
  // Last 6 months (oldest → newest) of collections.
  // Rolling 12 months (oldest → newest) so a whole-year view is possible.
  const collectedByMonth: { month: string; amount: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    collectedByMonth.push({ month: key, amount: collectedByMonthMap.get(key) ?? 0 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const receivables: Receivable[] = [];
  for (const q of quotesRaw as DbQuoteLite[]) {
    const client = clientById.get(q.client_id);
    if (!client) continue; // archived client, or outside this salesperson's scope
    if (!activeProject.has(q.project_id)) continue; // archived project
    const { total } = quoteTotals({ items: q.items ?? [], vatRate: Number(q.vat_rate) || 0 });
    const paid = paidByQuote.get(q.id) ?? 0;
    const balance = Math.round((total - paid) * 100) / 100;
    if (balance <= 0.001) continue; // fully paid → nothing to collect

    const sinceDate = q.invoiced_at?.slice(0, 10) || q.issue_date || "";
    const since = new Date(sinceDate + "T00:00:00");
    const ageDays = isNaN(since.getTime())
      ? 0
      : Math.max(0, Math.round((today.getTime() - since.getTime()) / 86400000));

    receivables.push({
      quoteId: q.id,
      number: q.number,
      invoiceNumber: q.invoice_number ?? undefined,
      clientId: q.client_id,
      clientName: client.name,
      clientPhone: client.phone,
      projectId: q.project_id,
      projectName: projectName.get(q.project_id) ?? "Project",
      assignedTo: client.assigned_to,
      total,
      paid,
      balance,
      status: paid <= 0 ? "unpaid" : "partial",
      sinceDate,
      ageDays,
      lastPaymentDate: lastPayByQuote.get(q.id),
    });
  }

  // Biggest balances first (that's where the money is).
  receivables.sort((a, b) => b.balance - a.balance);
  return { receivables, collectedThisMonth, collectedByMonth, collectedPayments };
}

// ── Client lifetime value & reactivation ────────────────────────────────────────
// Per-client rollup: how much they've paid over time, how many projects, and how
// long since any activity — so managers/sales can spot the best clients and the
// dormant ones worth re-engaging. Built with a few bulk queries (not per client).

export interface ClientValue {
  clientId: string;
  clientName: string;
  clientPhone: string;
  assignedTo: string;
  totalSpent: number; // sum of all payments ever, across projects
  projectCount: number; // non-archived projects
  completedCount: number;
  activeCount: number; // active or on-hold
  lastPaymentAt?: string; // YYYY-MM-DD
  lastActivityAt?: string; // most recent signal of any kind
  daysSinceActivity: number; // days since lastActivityAt (large if never)
}

export async function getClientValues(assignedTo?: string): Promise<ClientValue[]> {
  const db = serverClient();

  let cq = db
    .from("clients")
    .select(
      "id, name, phone, assigned_to, created_at, deleted_at, projects(id, status, end_date, deleted_at)"
    );
  if (assignedTo) cq = cq.eq("assigned_to", assignedTo);
  const { data: clientsRaw } = await cq;
  if (!clientsRaw) return [];

  type Row = {
    id: string;
    name: string;
    phone: string;
    assigned_to: string;
    created_at: string | null;
    deleted_at: string | null;
    projects: { id: string; status: string | null; end_date: string | null; deleted_at: string | null }[] | null;
  };
  const clients = (clientsRaw as Row[]).filter((c) => !c.deleted_at);
  const inScope = new Set(clients.map((c) => c.id));

  // Payments → total spent + last payment date per client (fail soft).
  const { data: paysRaw } = await db.from("payments").select("client_id, amount, paid_on");
  const spent = new Map<string, number>();
  const lastPay = new Map<string, string>();
  for (const p of (paysRaw as { client_id: string | null; amount: number; paid_on: string | null }[] | null) ?? []) {
    if (!p.client_id || !inScope.has(p.client_id)) continue;
    spent.set(p.client_id, (spent.get(p.client_id) ?? 0) + (Number(p.amount) || 0));
    if (p.paid_on) {
      const prev = lastPay.get(p.client_id);
      if (!prev || p.paid_on > prev) lastPay.set(p.client_id, p.paid_on);
    }
  }

  // Activities → last activity date per client (fail soft).
  const { data: actsRaw } = await db.from("activities").select("client_id, created_at");
  const lastAct = new Map<string, string>();
  for (const a of (actsRaw as { client_id: string; created_at: string }[] | null) ?? []) {
    if (!inScope.has(a.client_id)) continue;
    const d = a.created_at?.slice(0, 10);
    if (!d) continue;
    const prev = lastAct.get(a.client_id);
    if (!prev || d > prev) lastAct.set(a.client_id, d);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const out: ClientValue[] = clients.map((c) => {
    const projects = (c.projects ?? []).filter((p) => !p.deleted_at);
    const completedCount = projects.filter((p) => p.status === "completed").length;
    const activeCount = projects.filter((p) => p.status === "active" || p.status === "on-hold").length;
    // Most recent signal: last payment, last activity, latest project end, created.
    const signals = [
      lastPay.get(c.id),
      lastAct.get(c.id),
      ...projects.map((p) => p.end_date ?? undefined),
      c.created_at?.slice(0, 10),
    ].filter((s): s is string => Boolean(s));
    const lastActivityAt = signals.length ? signals.sort().at(-1) : undefined;
    const daysSinceActivity = lastActivityAt
      ? Math.max(0, Math.round((today.getTime() - new Date(lastActivityAt + "T00:00:00").getTime()) / 86400000))
      : 99999;
    return {
      clientId: c.id,
      clientName: c.name,
      clientPhone: c.phone,
      assignedTo: c.assigned_to,
      totalSpent: spent.get(c.id) ?? 0,
      projectCount: projects.length,
      completedCount,
      activeCount,
      lastPaymentAt: lastPay.get(c.id),
      lastActivityAt,
      daysSinceActivity,
    };
  });

  // Most valuable first (that's the lifetime-value view).
  out.sort((a, b) => b.totalSpent - a.totalSpent);
  return out;
}

// ── Quote conversion stats ──────────────────────────────────────────────────────
// Real acceptance rate from quote statuses, scoped by salesperson.

export interface QuoteStats {
  draft: number;
  sent: number; // sent, awaiting a decision
  accepted: number;
  alternative: number; // not chosen, but another quote of the project won (no loss)
  lost: number; // client didn't go ahead (real loss); includes legacy "rejected"
  decided: number; // accepted + lost (alternatives excluded)
  acceptanceRate: number; // accepted / decided (%)
}

export async function getQuoteStats(assignedTo?: string): Promise<QuoteStats> {
  const empty: QuoteStats = {
    draft: 0,
    sent: 0,
    accepted: 0,
    alternative: 0,
    lost: 0,
    decided: 0,
    acceptanceRate: 0,
  };
  const db = serverClient();

  // Which clients are in scope (managers → all; sales → their own).
  let cq = db.from("clients").select("id, assigned_to, deleted_at");
  if (assignedTo) cq = cq.eq("assigned_to", assignedTo);
  const { data: cs } = await cq;
  if (!cs) return empty;
  const ids = new Set(
    (cs as { id: string; deleted_at: string | null }[])
      .filter((c) => !c.deleted_at)
      .map((c) => c.id)
  );
  if (ids.size === 0) return empty;

  const { data: qs } = await db.from("quotes").select("status, client_id");
  if (!qs) return empty;

  let draft = 0,
    sent = 0,
    accepted = 0,
    alternative = 0,
    lost = 0;
  for (const q of qs as { status: string; client_id: string }[]) {
    if (!ids.has(q.client_id)) continue;
    if (q.status === "draft") draft++;
    else if (q.status === "sent") sent++;
    else if (q.status === "accepted") accepted++;
    else if (q.status === "alternative") alternative++;
    else if (q.status === "lost" || q.status === "rejected") lost++;
  }
  const decided = accepted + lost;
  return {
    draft,
    sent,
    accepted,
    alternative,
    lost,
    decided,
    acceptanceRate: decided > 0 ? Math.round((accepted / decided) * 100) : 0,
  };
}

export async function getQuote(id: string): Promise<Quote | null> {
  const db = serverClient();
  const { data, error } = await db
    .from("quotes")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return null;
  const quote = toQuote(data as DbQuote);
  // Attach payments (fail soft if the table isn't there yet).
  const { data: pays } = await db
    .from("payments")
    .select("*")
    .eq("quote_id", id)
    .order("paid_on", { ascending: true });
  if (pays) quote.payments = (pays as DbPayment[]).map(toPayment);
  return quote;
}

export async function getClient(id: string): Promise<Client | null> {
  const db = serverClient();
  // Prefer the full select (with quotes). If the quotes table isn't there yet,
  // fall back gracefully so client pages never break.
  let { data, error } = await db
    .from("clients")
    .select("*, projects(*), activities(*), quotes(*)")
    .eq("id", id)
    .order("created_at", { foreignTable: "activities", ascending: false })
    .single();

  if (error) {
    ({ data, error } = await db
      .from("clients")
      .select("*, projects(*), activities(*)")
      .eq("id", id)
      .order("created_at", { foreignTable: "activities", ascending: false })
      .single());
  }

  if (error) return null;
  // Archived clients behave as if they no longer exist.
  if ((data as DbClient).deleted_at) return null;
  const client = toClient(data as DbClient);
  await attachProjectFiles(client);
  await attachPayments(client);
  // Load every follow-up (pending + done) so the client page shows history.
  await attachFollowUps([client], { includeDone: true });
  return client;
}

// Loads payments for a client and attaches them to the matching quote inside
// each project. Fails soft if the table isn't there yet.
async function attachPayments(client: Client): Promise<void> {
  const db = serverClient();
  const { data, error } = await db
    .from("payments")
    .select("*")
    .eq("client_id", client.id)
    .order("paid_on", { ascending: true });
  if (error || !data) return;

  const byQuote = new Map<string, Payment[]>();
  for (const p of (data as DbPayment[]).map(toPayment)) {
    // Sign the receipt for viewing, if there's one attached.
    if (p.receiptPath) {
      const { data: signed } = await db.storage
        .from("project-files")
        .createSignedUrl(p.receiptPath, 3600);
      p.receiptUrl = signed?.signedUrl;
    }
    const list = byQuote.get(p.quoteId) ?? [];
    list.push(p);
    byQuote.set(p.quoteId, list);
  }

  for (const project of client.projects) {
    for (const quote of project.quotes) {
      quote.payments = byQuote.get(quote.id) ?? [];
    }
  }
}

// Loads project files for a client and attaches them (with signed URLs) to each
// project. Fails soft if the table isn't there yet.
async function attachProjectFiles(client: Client): Promise<void> {
  const db = serverClient();
  const { data, error } = await db
    .from("project_files")
    .select("*")
    .eq("client_id", client.id)
    .order("created_at", { ascending: false });
  if (error || !data) return;

  const rows = data as {
    id: string;
    project_id: string;
    name: string;
    path: string;
    mime: string | null;
    size: number;
    category: string;
    uploaded_by: string;
    created_at: string;
  }[];

  const byProject = new Map<string, ProjectFile[]>();
  for (const r of rows) {
    const { data: signed } = await db.storage
      .from("project-files")
      .createSignedUrl(r.path, 3600);
    const file: ProjectFile = {
      id: r.id,
      name: r.name,
      path: r.path,
      mime: r.mime ?? undefined,
      size: r.size,
      category: r.category as FileCategory,
      uploadedBy: r.uploaded_by,
      createdAt: r.created_at,
      url: signed?.signedUrl,
    };
    const list = byProject.get(r.project_id) ?? [];
    list.push(file);
    byProject.set(r.project_id, list);
  }

  for (const p of client.projects) {
    p.files = byProject.get(p.id) ?? [];
  }
}

// ─── Company documents ─────────────────────────────────────────────────────────

export interface CompanyDocument {
  id: string;
  name: string;
  path: string;
  mime?: string;
  size: number;
  uploadedBy: string;
  createdAt: string;
  url?: string; // short-lived signed download URL
}

export async function getDocuments(): Promise<CompanyDocument[]> {
  const db = serverClient();
  const { data, error } = await db
    .from("documents")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return []; // table may not exist yet — fail soft

  const rows = data as {
    id: string;
    name: string;
    path: string;
    mime: string | null;
    size: number;
    uploaded_by: string;
    created_at: string;
  }[];

  // Generate short-lived signed URLs for download.
  const docs: CompanyDocument[] = [];
  for (const r of rows) {
    const { data: signed } = await db.storage
      .from("company-docs")
      .createSignedUrl(r.path, 3600);
    docs.push({
      id: r.id,
      name: r.name,
      path: r.path,
      mime: r.mime ?? undefined,
      size: r.size,
      uploadedBy: r.uploaded_by,
      createdAt: r.created_at,
      url: signed?.signedUrl,
    });
  }
  return docs;
}
