"use server";

import { revalidatePath } from "next/cache";
import { serverClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { PIPELINE_STAGES } from "@/lib/data";
import type { Activity, ActivityType, Project, Quote, QuoteItem, QuoteStatus, ProjectFile, FileCategory, PropertyType, LeadSource, ProjectStatus, PipelineStage, Salesperson } from "@/lib/data";

// Records an entry in the client's activity timeline. Best-effort: a logging
// failure should never block the main write.
async function logActivity(
  clientId: string,
  type: ActivityType,
  description: string,
  projectId: string | null = null
): Promise<Activity | null> {
  const db = serverClient();
  const { data, error } = await db
    .from("activities")
    .insert({ client_id: clientId, project_id: projectId, type, description })
    .select()
    .single();

  if (error) return null;
  return {
    id: data.id,
    type: data.type as ActivityType,
    description: data.description,
    createdAt: data.created_at,
    projectId: data.project_id,
  };
}

type ClientFields = {
  name: string;
  phone: string;
  email: string;
  location: string;
  propertyType: PropertyType;
  renovationType: string;
  leadSource: LeadSource;
  assignedTo: Salesperson;
  capturedBy: string;
  capturedAt: string;
  nextFollowUp: string;
  notes: string;
};

type ProjectFields = {
  name: string;
  description: string;
  budget: string;
  status: ProjectStatus;
  pipelineStage: string;
  startDate: string;
  endDate: string;
  contractor: string;
  teamMembers: string; // one worker name per line
  suppliers: string; // one per line, "Supplier — material"
};

// Turns a textarea (one item per line) into a clean string array.
function parseLines(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

// Parses supplier lines like "Al Noor Steel — rebar" into {name, material}.
function parseSuppliers(text: string): { name: string; material: string }[] {
  return parseLines(text).map((line) => {
    const parts = line.split(/\s*[—|\-–:]\s*/);
    return {
      name: parts[0]?.trim() ?? line,
      material: parts.slice(1).join(" ").trim(),
    };
  });
}

export async function updateClient(clientId: string, fields: ClientFields): Promise<void> {
  const db = serverClient();
  const base = {
    name: fields.name.trim() || undefined,
    phone: fields.phone.trim() || undefined,
    email: fields.email.trim() || undefined,
    location: fields.location.trim() || undefined,
    property_type: fields.propertyType,
    renovation_type: fields.renovationType.trim() || null,
    lead_source: fields.leadSource,
    assigned_to: fields.assignedTo,
    captured_by: fields.capturedBy.trim() || null,
    captured_at: fields.capturedAt || null,
    notes: fields.notes.trim() || null,
  };

  // Try with next_follow_up; if the column isn't there yet, retry without it.
  let { error } = await db
    .from("clients")
    .update({ ...base, next_follow_up: fields.nextFollowUp || null })
    .eq("id", clientId);
  if (error) {
    ({ error } = await db.from("clients").update(base).eq("id", clientId));
  }

  if (error) throw new Error(error.message);
  await logActivity(clientId, "client_updated", "Client details updated");
  revalidatePath("/");
  revalidatePath(`/clients/${clientId}`);
}

// Creates a new client (manual lead entry) and returns its id.
export async function createClient(fields: ClientFields): Promise<string> {
  const db = serverClient();
  const base = {
    name: fields.name.trim() || "New Client",
    phone: fields.phone.trim() || "",
    email: fields.email.trim() || "",
    location: fields.location.trim() || "",
    property_type: fields.propertyType,
    renovation_type: fields.renovationType.trim() || null,
    lead_source: fields.leadSource,
    assigned_to: fields.assignedTo,
    captured_by: fields.capturedBy.trim() || null,
    captured_at: fields.capturedAt || new Date().toISOString().slice(0, 10),
    notes: fields.notes.trim() || null,
  };

  let { data, error } = await db
    .from("clients")
    .insert({ ...base, next_follow_up: fields.nextFollowUp || null })
    .select("id")
    .single();
  if (error) {
    ({ data, error } = await db
      .from("clients")
      .insert(base)
      .select("id")
      .single());
  }

  if (error || !data) throw new Error(error?.message ?? "Failed to create client.");
  await logActivity(data.id, "client_updated", "Client created");
  revalidatePath("/");
  return data.id;
}

export async function createProject(clientId: string, fields: ProjectFields): Promise<Project> {
  const db = serverClient();
  const { data, error } = await db
    .from("projects")
    .insert({
      client_id: clientId,
      name: fields.name.trim() || "Untitled Project",
      description: fields.description.trim(),
      budget: Math.max(0, Number(fields.budget) || 0),
      status: fields.status,
      pipeline_stage: Number(fields.pipelineStage) || 1,
      start_date: fields.startDate || new Date().toISOString().slice(0, 10),
      end_date: fields.endDate || null,
      contractor: fields.contractor.trim() || null,
      team_members: parseLines(fields.teamMembers),
      suppliers: parseSuppliers(fields.suppliers),
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  await logActivity(
    clientId,
    "project_created",
    `Project created`,
    data.id
  );
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/pipeline");

  return {
    id: data.id,
    name: data.name,
    description: data.description,
    budget: data.budget,
    status: data.status as ProjectStatus,
    pipelineStage: data.pipeline_stage as PipelineStage,
    startDate: data.start_date,
    endDate: data.end_date ?? undefined,
    activities: [],
    contractor: data.contractor ?? undefined,
    teamMembers: data.team_members ?? [],
    suppliers: data.suppliers ?? [],
    approved: false,
    quotes: [],
    files: [],
  };
}

export async function updateProject(projectId: string, clientId: string, fields: ProjectFields): Promise<void> {
  const db = serverClient();
  const { error } = await db
    .from("projects")
    .update({
      name: fields.name.trim() || "Untitled Project",
      description: fields.description.trim(),
      budget: Math.max(0, Number(fields.budget) || 0),
      status: fields.status,
      pipeline_stage: Number(fields.pipelineStage) || 1,
      start_date: fields.startDate || new Date().toISOString().slice(0, 10),
      end_date: fields.endDate || null,
      contractor: fields.contractor.trim() || null,
      team_members: parseLines(fields.teamMembers),
      suppliers: parseSuppliers(fields.suppliers),
    })
    .eq("id", projectId);

  if (error) throw new Error(error.message);
  await logActivity(
    clientId,
    "project_updated",
    `Project details updated`,
    projectId
  );
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/pipeline");
}

export async function updatePipelineStage(projectId: string, stage: PipelineStage): Promise<void> {
  const db = serverClient();
  const { error } = await db
    .from("projects")
    .update({ pipeline_stage: stage })
    .eq("id", projectId);

  if (error) throw new Error(error.message);

  // Look up the project so we can write a readable timeline entry.
  const { data: proj } = await db
    .from("projects")
    .select("name, client_id")
    .eq("id", projectId)
    .single();

  if (proj) {
    await logActivity(
      proj.client_id,
      "stage_changed",
      `Moved to Stage ${stage} — ${PIPELINE_STAGES[stage]}`,
      projectId
    );
    revalidatePath(`/clients/${proj.client_id}`);
  }
  revalidatePath("/pipeline");
}

// Adds a manual note to the client's general (client-level) history.
export async function addNote(clientId: string, text: string): Promise<Activity | null> {
  const activity = await logActivity(clientId, "note", text.trim(), null);
  revalidatePath(`/clients/${clientId}`);
  return activity;
}

// Adds a manual note to a specific project's history.
export async function addProjectNote(
  clientId: string,
  projectId: string,
  text: string
): Promise<Activity | null> {
  const activity = await logActivity(clientId, "note", text.trim(), projectId);
  revalidatePath(`/clients/${clientId}`);
  return activity;
}

// Manager sign-off on a project. Only managers may call this.
export async function setProjectApproval(
  clientId: string,
  projectId: string,
  approve: boolean
): Promise<{ approvedBy?: string; approvedAt?: string }> {
  const profile = await getCurrentProfile();
  if (!profile || !profile.isManager) {
    throw new Error("Only managers can approve projects.");
  }

  const db = serverClient();
  const approvedAt = approve ? new Date().toISOString() : null;
  const approvedBy = approve ? profile.name : null;

  const { error } = await db
    .from("projects")
    .update({
      approved: approve,
      approved_by: approvedBy,
      approved_at: approvedAt,
    })
    .eq("id", projectId);

  if (error) throw new Error(error.message);

  await logActivity(
    clientId,
    "note",
    approve
      ? `✓ Approved by ${profile.name}`
      : `Approval revoked by ${profile.name}`,
    projectId
  );
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/pipeline");

  return {
    approvedBy: approvedBy ?? undefined,
    approvedAt: approvedAt ?? undefined,
  };
}

// ─── Quotations ────────────────────────────────────────────────────────────────

type QuoteFields = {
  issueDate: string;
  validUntil: string;
  vatRate: number;
  notes: string;
  items: QuoteItem[];
};

function cleanItems(items: QuoteItem[]): QuoteItem[] {
  return items
    .map((it) => ({
      description: (it.description ?? "").trim(),
      qty: Math.max(0, Number(it.qty) || 0),
      unitPrice: Math.max(0, Number(it.unitPrice) || 0),
    }))
    .filter((it) => it.description || it.qty || it.unitPrice);
}

// Generates the next quote number for a client's project, e.g. Q-2026-0007.
async function nextQuoteNumber(): Promise<string> {
  const db = serverClient();
  const year = new Date().getFullYear();
  const { count } = await db
    .from("quotes")
    .select("id", { count: "exact", head: true });
  const seq = String((count ?? 0) + 1).padStart(4, "0");
  return `Q-${year}-${seq}`;
}

export async function createQuote(
  clientId: string,
  projectId: string,
  fields: QuoteFields
): Promise<Quote> {
  const db = serverClient();
  const number = await nextQuoteNumber();
  const { data, error } = await db
    .from("quotes")
    .insert({
      project_id: projectId,
      client_id: clientId,
      number,
      status: "draft",
      issue_date: fields.issueDate || new Date().toISOString().slice(0, 10),
      valid_until: fields.validUntil || null,
      vat_rate: fields.vatRate,
      notes: fields.notes.trim() || null,
      items: cleanItems(fields.items),
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  await logActivity(clientId, "note", `Quote ${number} created`, projectId);
  revalidatePath(`/clients/${clientId}`);

  return {
    id: data.id,
    projectId,
    clientId,
    number: data.number,
    status: data.status as QuoteStatus,
    issueDate: data.issue_date,
    validUntil: data.valid_until ?? undefined,
    vatRate: Number(data.vat_rate) || 0,
    notes: data.notes ?? undefined,
    items: data.items ?? [],
    sentAt: data.sent_at ?? undefined,
    createdAt: data.created_at,
  };
}

export async function updateQuote(
  clientId: string,
  quoteId: string,
  fields: QuoteFields
): Promise<void> {
  const db = serverClient();
  const { error } = await db
    .from("quotes")
    .update({
      issue_date: fields.issueDate || new Date().toISOString().slice(0, 10),
      valid_until: fields.validUntil || null,
      vat_rate: fields.vatRate,
      notes: fields.notes.trim() || null,
      items: cleanItems(fields.items),
    })
    .eq("id", quoteId);
  if (error) throw new Error(error.message);
  revalidatePath(`/clients/${clientId}`);
}

export async function setQuoteStatus(
  clientId: string,
  projectId: string,
  quoteId: string,
  status: QuoteStatus
): Promise<{ sentAt?: string }> {
  const db = serverClient();
  const sentAt =
    status === "sent" ? new Date().toISOString() : null;
  const patch: Record<string, unknown> = { status };
  if (status === "sent") patch.sent_at = sentAt;

  const { error } = await db.from("quotes").update(patch).eq("id", quoteId);
  if (error) throw new Error(error.message);

  const label =
    status === "sent"
      ? "marked as sent"
      : status === "accepted"
        ? "accepted by client"
        : status === "rejected"
          ? "rejected by client"
          : "set to draft";
  await logActivity(clientId, "note", `Quote ${label}`, projectId);
  revalidatePath(`/clients/${clientId}`);
  return { sentAt: sentAt ?? undefined };
}

export async function deleteQuote(
  clientId: string,
  quoteId: string
): Promise<void> {
  const db = serverClient();
  const { error } = await db.from("quotes").delete().eq("id", quoteId);
  if (error) throw new Error(error.message);
  revalidatePath(`/clients/${clientId}`);
}

// ─── Company documents (managers only) ─────────────────────────────────────────

const DOCS_BUCKET = "company-docs";

export async function uploadDocument(formData: FormData): Promise<void> {
  const profile = await getCurrentProfile();
  if (!profile || !profile.isManager) {
    throw new Error("Only managers can upload documents.");
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("No file provided.");
  }

  const db = serverClient();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${Date.now()}-${safeName}`;

  const { error: upErr } = await db.storage
    .from(DOCS_BUCKET)
    .upload(path, file, { contentType: file.type || undefined, upsert: false });
  if (upErr) throw new Error(upErr.message);

  const { error: dbErr } = await db.from("documents").insert({
    name: file.name,
    path,
    mime: file.type || null,
    size: file.size,
    uploaded_by: profile.name,
  });
  if (dbErr) throw new Error(dbErr.message);

  revalidatePath("/documents");
}

export async function deleteDocument(
  documentId: string,
  path: string
): Promise<void> {
  const profile = await getCurrentProfile();
  if (!profile || !profile.isManager) {
    throw new Error("Only managers can delete documents.");
  }
  const db = serverClient();
  await db.storage.from(DOCS_BUCKET).remove([path]);
  const { error } = await db.from("documents").delete().eq("id", documentId);
  if (error) throw new Error(error.message);
  revalidatePath("/documents");
}

// ─── Project files (renders, receipts, documents) ───────────────────────────────

const PROJECT_FILES_BUCKET = "project-files";

// A commercial may only touch files for their own clients; managers, any.
async function assertCanAccessClient(clientId: string): Promise<void> {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("Not authenticated.");
  if (profile.isManager) return;
  const db = serverClient();
  const { data } = await db
    .from("clients")
    .select("assigned_to")
    .eq("id", clientId)
    .single();
  if (!data || data.assigned_to !== profile.name) {
    throw new Error("Not allowed for this client.");
  }
}

export async function uploadProjectFile(
  formData: FormData
): Promise<ProjectFile> {
  const clientId = String(formData.get("clientId") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  const category = String(formData.get("category") ?? "other") as FileCategory;
  await assertCanAccessClient(clientId);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("No file provided.");
  }

  const profile = await getCurrentProfile();
  const db = serverClient();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${projectId}/${Date.now()}-${safeName}`;

  const { error: upErr } = await db.storage
    .from(PROJECT_FILES_BUCKET)
    .upload(path, file, { contentType: file.type || undefined, upsert: false });
  if (upErr) throw new Error(upErr.message);

  const { data, error: dbErr } = await db
    .from("project_files")
    .insert({
      project_id: projectId,
      client_id: clientId,
      name: file.name,
      path,
      mime: file.type || null,
      size: file.size,
      category,
      uploaded_by: profile?.name ?? "",
    })
    .select()
    .single();
  if (dbErr) throw new Error(dbErr.message);

  await logActivity(clientId, "note", `File uploaded: ${file.name}`, projectId);
  revalidatePath(`/clients/${clientId}`);

  const { data: signed } = await db.storage
    .from(PROJECT_FILES_BUCKET)
    .createSignedUrl(path, 3600);

  return {
    id: data.id,
    name: data.name,
    path: data.path,
    mime: data.mime ?? undefined,
    size: data.size,
    category: data.category as FileCategory,
    uploadedBy: data.uploaded_by,
    createdAt: data.created_at,
    url: signed?.signedUrl,
  };
}

export async function deleteProjectFile(
  clientId: string,
  fileId: string,
  path: string
): Promise<void> {
  await assertCanAccessClient(clientId);
  const db = serverClient();
  await db.storage.from(PROJECT_FILES_BUCKET).remove([path]);
  const { error } = await db.from("project_files").delete().eq("id", fileId);
  if (error) throw new Error(error.message);
  revalidatePath(`/clients/${clientId}`);
}
