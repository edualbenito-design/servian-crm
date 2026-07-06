import { serverClient } from "./supabase/server";
import type { Client, Project, Activity, ActivityType, Quote, QuoteStatus, QuoteItem, ProjectFile, FileCategory, PropertyType, LeadSource, ProjectStatus, PipelineStage, Salesperson } from "./data";

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
};

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
    notes: c.notes ?? undefined,
    // Hide archived (soft-deleted) projects everywhere.
    projects: c.projects
      .filter((p) => !p.deleted_at)
      .map((p) =>
        toProject(p, byProject.get(p.id) ?? [], quotesByProject.get(p.id) ?? [])
      ),
    activities: clientActivities,
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
  return (data as DbClient[])
    .filter((c) => !c.deleted_at)
    .map(toClient);
}

export async function getQuote(id: string): Promise<Quote | null> {
  const db = serverClient();
  const { data, error } = await db
    .from("quotes")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return null;
  return toQuote(data as DbQuote);
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
  return client;
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
