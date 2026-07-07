import { serverClient } from "./supabase/server";
import { quoteTotals, nextPendingFollowUp } from "./data";
import type { Client, Project, Activity, ActivityType, Quote, QuoteStatus, QuoteItem, Payment, PaymentMethod, ProjectFile, FileCategory, PropertyType, LeadSource, ProjectStatus, PipelineStage, Salesperson, FollowUp, FollowUpStatus } from "./data";

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

export interface Collections {
  receivables: Receivable[];
  collectedThisMonth: number; // sum of payments recorded in the current month
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
  if (cErr || !clientsRaw) return { receivables: [], collectedThisMonth: 0 };

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
  if (qErr || !quotesRaw) return { receivables: [], collectedThisMonth: 0 };

  // Payments (fail soft if the table isn't there yet).
  const { data: paysRaw } = await db
    .from("payments")
    .select("quote_id, amount, paid_on");
  const paidByQuote = new Map<string, number>();
  const lastPayByQuote = new Map<string, string>();
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  let collectedThisMonth = 0;
  for (const p of (paysRaw as { quote_id: string; amount: number; paid_on: string | null }[] | null) ?? []) {
    const amt = Number(p.amount) || 0;
    paidByQuote.set(p.quote_id, (paidByQuote.get(p.quote_id) ?? 0) + amt);
    if (p.paid_on) {
      const prev = lastPayByQuote.get(p.quote_id);
      if (!prev || p.paid_on > prev) lastPayByQuote.set(p.quote_id, p.paid_on);
      if (p.paid_on.slice(0, 7) === thisMonth) collectedThisMonth += amt;
    }
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
  return { receivables, collectedThisMonth };
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
