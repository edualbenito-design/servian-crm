"use server";

import { revalidatePath } from "next/cache";
import { serverClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { PIPELINE_STAGES, reconcileStageStatus, statusFromStage } from "@/lib/data";
import { publicQuoteUrl } from "@/lib/quote-link";
import type { Activity, ActivityType, Project, Quote, QuoteItem, QuoteStatus, Payment, PaymentMethod, PaymentPlanItem, ProjectFile, FileCategory, PropertyType, LeadSource, ProjectStatus, PipelineStage, Salesperson, FollowUp, FollowUpStatus, Milestone, Alert, AlertMessage, AlertRole } from "@/lib/data";

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
  await assertCanAccessClient(clientId);
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

// ─── Follow-up tasks ─────────────────────────────────────────────────────────
// A follow-up is a task on a project (or general, for early leads). It stays
// pending — and keeps alerting when overdue — until it's marked done or moved.
// Every action carries a note (the "why"). See the follow_ups table SQL.

type DbFollowUpRow = {
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

function rowToFollowUp(f: DbFollowUpRow): FollowUp {
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

function revalidateFollowUp(clientId: string) {
  revalidatePath("/");
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
  revalidatePath(`/clients/${clientId}`);
}

// Create a new pending follow-up. projectId null = general (client-level).
export async function addFollowUp(
  clientId: string,
  projectId: string | null,
  dueDate: string,
  note: string
): Promise<FollowUp> {
  await assertCanAccessClient(clientId);
  const profile = await getCurrentProfile();
  const db = serverClient();
  const { data, error } = await db
    .from("follow_ups")
    .insert({
      client_id: clientId,
      project_id: projectId,
      due_date: dueDate,
      note: note.trim() || null,
      status: "pending",
      created_by: profile?.name ?? null,
    })
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not create follow-up.");

  await logActivity(
    clientId,
    "note",
    `📅 Follow-up set for ${dueDate}${note.trim() ? ` — ${note.trim()}` : ""}`,
    projectId
  );
  revalidateFollowUp(clientId);
  return rowToFollowUp(data as DbFollowUpRow);
}

// Move a pending follow-up to a new date, with a note explaining why.
export async function rescheduleFollowUp(
  clientId: string,
  followUpId: string,
  newDate: string,
  reason: string
): Promise<void> {
  await assertCanAccessClient(clientId);
  const db = serverClient();
  // Scope by client_id so a user can't touch another client's follow-up.
  const { data, error } = await db
    .from("follow_ups")
    .update({ due_date: newDate })
    .eq("id", followUpId)
    .eq("client_id", clientId)
    .select("project_id")
    .single();
  if (error) throw new Error(error.message);

  await logActivity(
    clientId,
    "note",
    `↪ Follow-up moved to ${newDate}${reason.trim() ? ` — ${reason.trim()}` : ""}`,
    (data?.project_id as string | null) ?? null
  );
  revalidateFollowUp(clientId);
}

// Mark a follow-up done, recording who did it and a result note.
export async function completeFollowUp(
  clientId: string,
  followUpId: string,
  doneNote: string
): Promise<{ doneAt: string; doneBy: string }> {
  await assertCanAccessClient(clientId);
  const profile = await getCurrentProfile();
  const db = serverClient();
  const doneAt = new Date().toISOString();
  const doneBy = profile?.name ?? "—";
  const { data, error } = await db
    .from("follow_ups")
    .update({
      status: "done",
      done_note: doneNote.trim() || null,
      done_at: doneAt,
      done_by: doneBy,
    })
    .eq("id", followUpId)
    .eq("client_id", clientId)
    .select("project_id")
    .single();
  if (error) throw new Error(error.message);

  await logActivity(
    clientId,
    "note",
    `✓ Follow-up done by ${doneBy}${doneNote.trim() ? ` — ${doneNote.trim()}` : ""}`,
    (data?.project_id as string | null) ?? null
  );
  revalidateFollowUp(clientId);
  return { doneAt, doneBy };
}

// Edit a follow-up's fields (fix a wrong date/note, or tweak the result note on
// a done one) without deleting and recreating it.
export async function editFollowUp(
  clientId: string,
  followUpId: string,
  dueDate: string,
  note: string,
  doneNote?: string
): Promise<void> {
  await assertCanAccessClient(clientId);
  const db = serverClient();
  const patch: Record<string, unknown> = {
    due_date: dueDate,
    note: note.trim() || null,
  };
  if (doneNote !== undefined) patch.done_note = doneNote.trim() || null;
  const { data, error } = await db
    .from("follow_ups")
    .update(patch)
    .eq("id", followUpId)
    .eq("client_id", clientId)
    .select("project_id")
    .single();
  if (error) throw new Error(error.message);
  await logActivity(
    clientId,
    "note",
    `✏️ Follow-up edited`,
    (data?.project_id as string | null) ?? null
  );
  revalidateFollowUp(clientId);
}

// Remove a follow-up entirely (e.g. created by mistake).
export async function deleteFollowUp(
  clientId: string,
  followUpId: string
): Promise<void> {
  await assertCanAccessClient(clientId);
  const db = serverClient();
  const { error } = await db
    .from("follow_ups")
    .delete()
    .eq("id", followUpId)
    .eq("client_id", clientId);
  if (error) throw new Error(error.message);
  revalidateFollowUp(clientId);
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
  // If an initial follow-up date was given, create it as a task too (best
  // effort — ignored if the follow_ups table isn't there yet).
  if (fields.nextFollowUp) {
    await db.from("follow_ups").insert({
      client_id: data.id,
      project_id: null,
      due_date: fields.nextFollowUp,
      note: null,
      status: "pending",
    });
  }
  revalidatePath("/");
  return data.id;
}

// Non-blocking duplicate check when adding a client: a client counts as a
// duplicate only if the SAME phone number is already registered (names can
// legitimately repeat). Matches on the last 9 digits so +971 50… and 050… match.
export async function checkPhoneDuplicate(
  phone: string
): Promise<{ name: string; assignedTo: string } | null> {
  const profile = await getCurrentProfile();
  if (!profile) return null;
  const key = (phone || "").replace(/\D/g, "").slice(-9);
  if (key.length < 7) return null; // too short to be a real match
  const db = serverClient();
  const { data } = await db.from("clients").select("name, phone, assigned_to, deleted_at");
  for (const c of (data as { name: string; phone: string | null; assigned_to: string; deleted_at: string | null }[] | null) ?? []) {
    if (c.deleted_at) continue;
    const cn = String(c.phone ?? "").replace(/\D/g, "").slice(-9);
    if (cn.length >= 7 && cn === key) {
      return { name: c.name, assignedTo: c.assigned_to };
    }
  }
  return null;
}

export async function createProject(clientId: string, fields: ProjectFields): Promise<Project> {
  await assertCanAccessClient(clientId);
  const db = serverClient();
  // Keep status and pipeline stage consistent (Completed→7, Lost→8).
  const { stage, status } = reconcileStageStatus(
    (Number(fields.pipelineStage) || 1) as PipelineStage,
    fields.status
  );
  const nowIso = new Date().toISOString();
  const isOutcome = stage >= 6 && stage <= 9;
  const base = {
    client_id: clientId,
    name: fields.name.trim() || "Untitled Project",
    description: fields.description.trim(),
    budget: Math.max(0, Number(fields.budget) || 0),
    status,
    pipeline_stage: stage,
    start_date: fields.startDate || new Date().toISOString().slice(0, 10),
    end_date: fields.endDate || null,
    contractor: fields.contractor.trim() || null,
    team_members: parseLines(fields.teamMembers),
    suppliers: parseSuppliers(fields.suppliers),
  };
  // Try with the stage-date columns; retry without if they aren't there yet.
  let { data, error } = await db
    .from("projects")
    .insert({ ...base, stage_changed_at: nowIso, closed_at: isOutcome ? nowIso : null })
    .select()
    .single();
  if (error) {
    ({ data, error } = await db.from("projects").insert(base).select().single());
  }

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
    milestones: data.milestones ?? [],
    approved: false,
    quotes: [],
    followUps: [],
    files: [],
  };
}

export async function updateProject(projectId: string, clientId: string, fields: ProjectFields): Promise<void> {
  await assertCanAccessClient(clientId);
  const db = serverClient();

  // Current stage/close date, to detect an actual pipeline move.
  const { data: cur } = await db
    .from("projects")
    .select("pipeline_stage")
    .eq("id", projectId)
    .maybeSingle();
  const { data: curClose } = await db
    .from("projects")
    .select("closed_at")
    .eq("id", projectId)
    .maybeSingle();
  const currentStage = ((cur as { pipeline_stage?: number } | null)?.pipeline_stage ?? 1) as PipelineStage;

  // Keep status and pipeline stage consistent (Completed→7, Lost→8).
  const { stage, status } = reconcileStageStatus(
    (Number(fields.pipelineStage) || 1) as PipelineStage,
    fields.status
  );
  const stageMoved = stage !== currentStage;
  const nowIso = new Date().toISOString();
  const isOutcome = stage >= 6 && stage <= 9;
  const closedAt = isOutcome
    ? ((curClose as { closed_at?: string | null } | null)?.closed_at ?? nowIso)
    : null;

  const base = {
    name: fields.name.trim() || "Untitled Project",
    description: fields.description.trim(),
    budget: Math.max(0, Number(fields.budget) || 0),
    status,
    pipeline_stage: stage,
    start_date: fields.startDate || new Date().toISOString().slice(0, 10),
    end_date: fields.endDate || null,
    contractor: fields.contractor.trim() || null,
    team_members: parseLines(fields.teamMembers),
    suppliers: parseSuppliers(fields.suppliers),
  };
  // Only touch the stage-date columns when the stage actually moved (so a plain
  // edit doesn't reset idle tracking). Retry without them if not migrated yet.
  let error;
  if (stageMoved) {
    ({ error } = await db
      .from("projects")
      .update({ ...base, stage_changed_at: nowIso, closed_at: closedAt })
      .eq("id", projectId));
    if (error) {
      ({ error } = await db.from("projects").update(base).eq("id", projectId));
    }
  } else {
    ({ error } = await db.from("projects").update(base).eq("id", projectId));
  }

  if (error) throw new Error(error.message);
  await logActivity(
    clientId,
    "project_updated",
    stageMoved
      ? `Project updated — moved to Stage ${stage} (${PIPELINE_STAGES[stage]})`
      : `Project details updated`,
    projectId
  );
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/pipeline");
}

export async function updatePipelineStage(projectId: string, stage: PipelineStage): Promise<void> {
  const db = serverClient();

  // Base lookup (always-present columns) for the timeline entry + status sync.
  const { data: proj } = await db
    .from("projects")
    .select("name, client_id, status")
    .eq("id", projectId)
    .single();
  if (!proj) throw new Error("Project not found.");
  await assertCanAccessClient(proj.client_id);

  // closed_at is sealed the FIRST time a deal reaches an outcome (6/7/8/9) and
  // preserved while moving between outcomes; cleared only when reopened into the
  // live funnel (1–5). Read the current value best-effort (column may not exist).
  const { data: prev } = await db
    .from("projects")
    .select("closed_at")
    .eq("id", projectId)
    .maybeSingle();

  const nowIso = new Date().toISOString();
  const isOutcome = stage >= 6 && stage <= 9;
  const closedAt = isOutcome
    ? ((prev as { closed_at?: string | null } | null)?.closed_at ?? nowIso)
    : null;
  // Keep the project status in step with the board (Completed/Lost, or revive).
  const status = statusFromStage(
    stage,
    ((proj as { status?: string } | null)?.status as ProjectStatus) ?? "active"
  );

  // Stamp stage_changed_at on every move. Retry without the new columns if the
  // migration hasn't been applied yet (§7.5, resilient — deploy before SQL).
  let { error } = await db
    .from("projects")
    .update({ pipeline_stage: stage, status, stage_changed_at: nowIso, closed_at: closedAt })
    .eq("id", projectId);
  if (error) {
    ({ error } = await db
      .from("projects")
      .update({ pipeline_stage: stage, status })
      .eq("id", projectId));
  }

  if (error) throw new Error(error.message);

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
  await assertCanAccessClient(clientId);
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
  await assertCanAccessClient(clientId);
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

// Persist a project's site-progress milestones (jsonb). Pass an optional note to
// log in the project history (e.g. when a stage is completed).
export async function setProjectMilestones(
  clientId: string,
  projectId: string,
  milestones: Milestone[],
  logNote?: string
): Promise<void> {
  await assertCanAccessClient(clientId);
  const db = serverClient();
  const { error } = await db
    .from("projects")
    .update({ milestones })
    .eq("id", projectId);
  if (error) {
    throw new Error(
      "Could not save milestones. Run the site-progress SQL migration first."
    );
  }
  if (logNote) await logActivity(clientId, "project_updated", logNote, projectId);
  revalidatePath(`/clients/${clientId}`);
}

// ─── Deletion (archive) with manager sign-off ───────────────────────────────────
//
// Company data is never hard-deleted from the UI. A commercial can *request* a
// deletion; a manager confirms it, which archives the record (sets deleted_at so
// it disappears from every list but stays recoverable in the database). Managers
// may archive directly. Requires the deletion columns on clients/projects (see
// the SQL handed to the user).

// Resolves a project's client so we can reuse the client-level access check.
async function assertCanAccessProjectClient(projectId: string): Promise<void> {
  const db = serverClient();
  const { data } = await db
    .from("projects")
    .select("client_id")
    .eq("id", projectId)
    .single();
  if (!data) throw new Error("Project not found.");
  await assertCanAccessClient(data.client_id);
}

// Commercial (owner) or manager asks for a client to be deleted.
export async function requestClientDeletion(
  clientId: string,
  reason: string
): Promise<void> {
  await assertCanAccessClient(clientId);
  const profile = await getCurrentProfile();
  const db = serverClient();
  const { error } = await db
    .from("clients")
    .update({
      deletion_requested_by: profile?.name ?? "",
      deletion_requested_at: new Date().toISOString(),
      deletion_reason: reason.trim() || null,
    })
    .eq("id", clientId);
  if (error) throw new Error(error.message);
  await logActivity(
    clientId,
    "note",
    `🗑️ Deletion requested by ${profile?.name ?? "someone"}${
      reason.trim() ? ` — ${reason.trim()}` : ""
    }`
  );
  revalidatePath("/");
  revalidatePath(`/clients/${clientId}`);
}

// Manager rejects a pending request, or the owner withdraws their own.
export async function cancelClientDeletion(clientId: string): Promise<void> {
  await assertCanAccessClient(clientId);
  const db = serverClient();
  const { error } = await db
    .from("clients")
    .update({
      deletion_requested_by: null,
      deletion_requested_at: null,
      deletion_reason: null,
    })
    .eq("id", clientId);
  if (error) throw new Error(error.message);
  revalidatePath(`/clients/${clientId}`);
}

// Manager confirms the deletion → archive the client (soft delete, recoverable).
export async function deleteClient(clientId: string): Promise<void> {
  const profile = await getCurrentProfile();
  if (!profile || !profile.isManager) {
    throw new Error("Only managers can delete clients.");
  }
  const db = serverClient();
  const { error } = await db
    .from("clients")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: profile.name,
      deletion_requested_by: null,
      deletion_requested_at: null,
      deletion_reason: null,
    })
    .eq("id", clientId);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/pipeline");
}

// Commercial (owner) or manager asks for a project to be deleted.
export async function requestProjectDeletion(
  clientId: string,
  projectId: string,
  reason: string
): Promise<void> {
  await assertCanAccessProjectClient(projectId);
  const profile = await getCurrentProfile();
  const db = serverClient();
  const { error } = await db
    .from("projects")
    .update({
      deletion_requested_by: profile?.name ?? "",
      deletion_requested_at: new Date().toISOString(),
      deletion_reason: reason.trim() || null,
    })
    .eq("id", projectId);
  if (error) throw new Error(error.message);
  await logActivity(
    clientId,
    "note",
    `🗑️ Project deletion requested by ${profile?.name ?? "someone"}${
      reason.trim() ? ` — ${reason.trim()}` : ""
    }`,
    projectId
  );
  revalidatePath(`/clients/${clientId}`);
}

// Manager rejects a pending project request, or the owner withdraws theirs.
export async function cancelProjectDeletion(
  clientId: string,
  projectId: string
): Promise<void> {
  await assertCanAccessProjectClient(projectId);
  const db = serverClient();
  const { error } = await db
    .from("projects")
    .update({
      deletion_requested_by: null,
      deletion_requested_at: null,
      deletion_reason: null,
    })
    .eq("id", projectId);
  if (error) throw new Error(error.message);
  revalidatePath(`/clients/${clientId}`);
}

// Manager confirms → archive the project (soft delete, recoverable).
export async function deleteProject(
  clientId: string,
  projectId: string
): Promise<void> {
  const profile = await getCurrentProfile();
  if (!profile || !profile.isManager) {
    throw new Error("Only managers can delete projects.");
  }
  const db = serverClient();
  const { error } = await db
    .from("projects")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: profile.name,
      deletion_requested_by: null,
      deletion_requested_at: null,
      deletion_reason: null,
    })
    .eq("id", projectId);
  if (error) throw new Error(error.message);
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/pipeline");
}

// ─── Quotations ────────────────────────────────────────────────────────────────

type QuoteFields = {
  issueDate: string;
  validUntil: string;
  vatRate: number;
  discountPct: number;
  discountReason: string;
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
  // Use the highest sequence ever issued (not the row count) so deleting a quote
  // never makes the next one REUSE a number — which would duplicate Q-numbers.
  const { data } = await db.from("quotes").select("number");
  let max = 0;
  for (const q of (data as { number: string | null }[] | null) ?? []) {
    const m = String(q.number ?? "").match(/(\d+)\s*$/);
    if (m) max = Math.max(max, Number(m[1]));
  }
  const seq = String(max + 1).padStart(4, "0");
  return `Q-${year}-${seq}`;
}

export async function createQuote(
  clientId: string,
  projectId: string,
  fields: QuoteFields
): Promise<Quote> {
  await assertCanAccessClient(clientId);
  const db = serverClient();
  const number = await nextQuoteNumber();
  const pct = Math.min(100, Math.max(0, Number(fields.discountPct) || 0));
  const base = {
    project_id: projectId,
    client_id: clientId,
    number,
    status: "draft",
    issue_date: fields.issueDate || new Date().toISOString().slice(0, 10),
    valid_until: fields.validUntil || null,
    vat_rate: fields.vatRate,
    notes: fields.notes.trim() || null,
    items: cleanItems(fields.items),
  };
  // Try with discount columns; retry without if they're not there yet.
  let { data, error } = await db
    .from("quotes")
    .insert({ ...base, discount_pct: pct || null, discount_reason: fields.discountReason.trim() || null })
    .select()
    .single();
  if (error) {
    ({ data, error } = await db.from("quotes").insert(base).select().single());
  }

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
    discountPct: data.discount_pct != null ? Number(data.discount_pct) : undefined,
    discountReason: data.discount_reason ?? undefined,
    notes: data.notes ?? undefined,
    items: data.items ?? [],
    sentAt: data.sent_at ?? undefined,
    createdAt: data.created_at,
    payments: [],
    paymentPlan: [],
  };
}

export async function updateQuote(
  clientId: string,
  quoteId: string,
  fields: QuoteFields
): Promise<void> {
  await assertCanAccessClient(clientId);
  const db = serverClient();
  const pct = Math.min(100, Math.max(0, Number(fields.discountPct) || 0));
  const base = {
    issue_date: fields.issueDate || new Date().toISOString().slice(0, 10),
    valid_until: fields.validUntil || null,
    vat_rate: fields.vatRate,
    notes: fields.notes.trim() || null,
    items: cleanItems(fields.items),
  };
  // Try with discount columns; retry without if they're not there yet.
  let { error } = await db
    .from("quotes")
    .update({ ...base, discount_pct: pct || null, discount_reason: fields.discountReason.trim() || null })
    .eq("id", quoteId);
  if (error) {
    ({ error } = await db.from("quotes").update(base).eq("id", quoteId));
  }
  if (error) throw new Error(error.message);
  revalidatePath(`/clients/${clientId}`);
}

export async function setQuoteStatus(
  clientId: string,
  projectId: string,
  quoteId: string,
  status: QuoteStatus
): Promise<{ sentAt?: string; supersededIds: string[] }> {
  await assertCanAccessClient(clientId);
  const db = serverClient();
  const sentAt = status === "sent" ? new Date().toISOString() : null;
  const patch: Record<string, unknown> = { status };
  if (status === "sent") patch.sent_at = sentAt;

  const { error } = await db.from("quotes").update(patch).eq("id", quoteId);
  if (error) throw new Error(error.message);

  // Accepting one quote makes the other open quotes of the SAME project
  // "alternative" (the client is paying via this one — those aren't losses).
  // Resilient: if the DB CHECK constraint hasn't been updated yet (see
  // sql/2026-07-17-quote-status-alternative-lost.sql), this fails soft and the
  // acceptance still succeeds — siblings just aren't auto-moved.
  let supersededIds: string[] = [];
  if (status === "accepted") {
    const { data: siblings } = await db
      .from("quotes")
      .update({ status: "alternative" })
      .eq("project_id", projectId)
      .neq("id", quoteId)
      .in("status", ["draft", "sent"])
      .select("id");
    supersededIds = (siblings as { id: string }[] | null)?.map((s) => s.id) ?? [];
  }

  const label =
    status === "sent"
      ? "marked as sent"
      : status === "accepted"
        ? "accepted by client"
        : status === "alternative"
          ? "set as alternative"
          : status === "lost" || status === "rejected"
            ? "marked as lost"
            : "set to draft";
  await logActivity(clientId, "note", `Quote ${label}`, projectId);
  if (supersededIds.length > 0) {
    await logActivity(
      clientId,
      "note",
      `${supersededIds.length} other quote${supersededIds.length === 1 ? "" : "s"} set to alternative`,
      projectId
    );
  }
  revalidatePath(`/clients/${clientId}`);
  return { sentAt: sentAt ?? undefined, supersededIds };
}

export async function deleteQuote(
  clientId: string,
  quoteId: string
): Promise<void> {
  await assertCanAccessClient(clientId);
  const db = serverClient();
  const { error } = await db.from("quotes").delete().eq("id", quoteId);
  if (error) throw new Error(error.message);
  revalidatePath(`/clients/${clientId}`);
}

// Duplicates a quote as a fresh draft (new number, today's date, no invoice/
// payments) so a similar quote doesn't have to be rebuilt. Owner or manager.
export async function duplicateQuote(clientId: string, quoteId: string): Promise<Quote> {
  await assertCanAccessClient(clientId);
  const db = serverClient();
  const { data: src } = await db.from("quotes").select("*").eq("id", quoteId).single();
  if (!src) throw new Error("Quote not found.");

  const number = await nextQuoteNumber();
  const base = {
    project_id: src.project_id,
    client_id: clientId,
    number,
    status: "draft" as const,
    issue_date: new Date().toISOString().slice(0, 10),
    valid_until: null,
    vat_rate: src.vat_rate,
    notes: src.notes ?? null,
    items: src.items ?? [],
  };
  // Try with discount columns; retry without if they're not there yet.
  let { data, error } = await db
    .from("quotes")
    .insert({ ...base, discount_pct: src.discount_pct ?? null, discount_reason: src.discount_reason ?? null })
    .select()
    .single();
  if (error) {
    ({ data, error } = await db.from("quotes").insert(base).select().single());
  }
  if (error || !data) throw new Error(error?.message ?? "Could not duplicate the quote.");

  await logActivity(clientId, "note", `Quote ${number} created (copy of ${src.number})`, src.project_id);
  revalidatePath(`/clients/${clientId}`);
  return {
    id: data.id,
    projectId: data.project_id,
    clientId,
    number: data.number,
    status: data.status as QuoteStatus,
    issueDate: data.issue_date,
    validUntil: data.valid_until ?? undefined,
    vatRate: Number(data.vat_rate) || 0,
    discountPct: data.discount_pct != null ? Number(data.discount_pct) : undefined,
    discountReason: data.discount_reason ?? undefined,
    notes: data.notes ?? undefined,
    items: data.items ?? [],
    sentAt: data.sent_at ?? undefined,
    createdAt: data.created_at,
    payments: [],
    paymentPlan: [],
  };
}

// Builds a WhatsApp link that sends the client a public, read-only link to their
// quotation (or tax invoice). Owner commercial or manager only.
export async function getQuoteWhatsAppLink(
  clientId: string,
  quoteId: string,
  variant: "quote" | "invoice" = "quote"
): Promise<string> {
  await assertCanAccessClient(clientId);
  const db = serverClient();
  const { data: c } = await db
    .from("clients")
    .select("name, phone")
    .eq("id", clientId)
    .single();
  const { data: qrow } = await db
    .from("quotes")
    .select("number, invoice_number")
    .eq("id", quoteId)
    .single();

  const url = publicQuoteUrl(quoteId, variant);
  const isInvoice = variant === "invoice";
  const docName = isInvoice
    ? `tax invoice ${qrow?.invoice_number ?? qrow?.number ?? ""}`.trim()
    : `quotation ${qrow?.number ?? ""}`.trim();
  const hello = c?.name ? `Hello ${c.name.split(" ")[0]},` : "Hello,";
  const message = `${hello}\n\nHere is your ${docName} from Servian Contracting:\n${url}\n\nThank you for your business.`;

  const phone = (c?.phone ?? "").replace(/[^0-9]/g, "");
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

// ─── Payments & invoices ─────────────────────────────────────────────────────────

type PaymentFields = {
  amount: number;
  method: PaymentMethod;
  paidOn: string;
  milestone: string;
  note: string;
};

// Records a payment against an accepted quote. Owner commercial or manager.
export async function addPayment(
  clientId: string,
  projectId: string,
  quoteId: string,
  fields: PaymentFields
): Promise<Payment> {
  await assertCanAccessClient(clientId);
  const profile = await getCurrentProfile();
  const db = serverClient();
  const amount = Math.max(0, Number(fields.amount) || 0);
  const base = {
    quote_id: quoteId,
    project_id: projectId,
    client_id: clientId,
    amount,
    method: fields.method,
    paid_on: fields.paidOn || new Date().toISOString().slice(0, 10),
    note: fields.note.trim() || null,
    created_by: profile?.name ?? null,
  };
  // Try with milestone; if the column isn't there yet, retry without it.
  let { data, error } = await db
    .from("payments")
    .insert({ ...base, milestone: fields.milestone.trim() || null })
    .select()
    .single();
  if (error) {
    ({ data, error } = await db
      .from("payments")
      .insert(base)
      .select()
      .single());
  }
  if (error) throw new Error(error.message);

  await logActivity(
    clientId,
    "note",
    `💵 ${fields.milestone.trim() || "Payment"} recorded: AED ${amount.toLocaleString("en-AE")}`,
    projectId
  );
  revalidatePath(`/clients/${clientId}`);

  return {
    id: data.id,
    quoteId: data.quote_id,
    projectId: data.project_id,
    clientId: data.client_id,
    amount: Number(data.amount) || 0,
    method: (data.method as PaymentMethod) ?? "other",
    paidOn: data.paid_on ?? data.created_at.slice(0, 10),
    milestone: data.milestone ?? undefined,
    note: data.note ?? undefined,
    createdBy: data.created_by ?? undefined,
    createdAt: data.created_at,
  };
}

// Edit an existing payment (fix a typo'd amount, wrong method/date…). Keeps any
// attached receipt untouched. Resilient to a missing milestone column.
export async function updatePayment(
  clientId: string,
  paymentId: string,
  fields: PaymentFields
): Promise<{ amount: number; method: PaymentMethod; paidOn: string; milestone?: string; note?: string }> {
  await assertCanAccessClient(clientId);
  const db = serverClient();
  const amount = Math.max(0, Number(fields.amount) || 0);
  const base = {
    amount,
    method: fields.method,
    paid_on: fields.paidOn || new Date().toISOString().slice(0, 10),
    note: fields.note.trim() || null,
  };
  let { error } = await db
    .from("payments")
    .update({ ...base, milestone: fields.milestone.trim() || null })
    .eq("id", paymentId)
    .eq("client_id", clientId);
  if (error) {
    ({ error } = await db
      .from("payments")
      .update(base)
      .eq("id", paymentId)
      .eq("client_id", clientId));
  }
  if (error) throw new Error(error.message);

  await logActivity(
    clientId,
    "note",
    `✏️ Payment edited: AED ${amount.toLocaleString("en-AE")}`
  );
  revalidatePath(`/clients/${clientId}`);
  return {
    amount,
    method: fields.method,
    paidOn: base.paid_on,
    milestone: fields.milestone.trim() || undefined,
    note: fields.note.trim() || undefined,
  };
}

export async function deletePayment(
  clientId: string,
  paymentId: string
): Promise<void> {
  await assertCanAccessClient(clientId);
  const db = serverClient();
  const { error } = await db.from("payments").delete().eq("id", paymentId);
  if (error) throw new Error(error.message);
  revalidatePath(`/clients/${clientId}`);
}

// Generates the next invoice number, e.g. INV-2026-0007.
async function nextInvoiceNumber(): Promise<string> {
  const db = serverClient();
  const year = new Date().getFullYear();
  // Highest issued sequence, not the count (so a deleted/voided one never causes
  // the next invoice to reuse a number).
  const { data } = await db
    .from("quotes")
    .select("invoice_number")
    .not("invoice_number", "is", null);
  let max = 0;
  for (const q of (data as { invoice_number: string | null }[] | null) ?? []) {
    const m = String(q.invoice_number ?? "").match(/(\d+)\s*$/);
    if (m) max = Math.max(max, Number(m[1]));
  }
  const seq = String(max + 1).padStart(4, "0");
  return `INV-${year}-${seq}`;
}

// Issues a TAX INVOICE from a quote: assigns an invoice number once, idempotent.
export async function createInvoice(
  clientId: string,
  quoteId: string
): Promise<{ invoiceNumber: string; invoicedAt: string }> {
  await assertCanAccessClient(clientId);
  const db = serverClient();

  // If already issued, return the existing number (don't renumber).
  const { data: existing } = await db
    .from("quotes")
    .select("invoice_number, invoiced_at")
    .eq("id", quoteId)
    .single();
  if (existing?.invoice_number) {
    return {
      invoiceNumber: existing.invoice_number,
      invoicedAt: existing.invoiced_at ?? new Date().toISOString(),
    };
  }

  const invoiceNumber = await nextInvoiceNumber();
  const invoicedAt = new Date().toISOString();
  const { error } = await db
    .from("quotes")
    .update({ invoice_number: invoiceNumber, invoiced_at: invoicedAt })
    .eq("id", quoteId);
  if (error) throw new Error(error.message);

  await logActivity(clientId, "note", `🧾 Invoice ${invoiceNumber} issued`);
  revalidatePath(`/clients/${clientId}`);
  return { invoiceNumber, invoicedAt };
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

// ── Manager → commercial alerts ────────────────────────────────────────────────

// Raise a new alert thread on a client (managers only), optionally about one of
// its projects. The first message is the manager's note.
export async function createAlert(
  clientId: string,
  projectId: string | null,
  body: string
): Promise<Alert> {
  const profile = await getCurrentProfile();
  if (!profile || !profile.isManager) throw new Error("Only managers can raise alerts.");
  const text = body.trim();
  if (!text) throw new Error("Write a message first.");

  const db = serverClient();
  const nowIso = new Date().toISOString();
  const { data: a, error } = await db
    .from("alerts")
    .insert({
      client_id: clientId,
      project_id: projectId,
      created_by: profile.name,
      status: "open",
      last_message_at: nowIso,
      manager_read_at: nowIso, // the author has "read" it
    })
    .select("*")
    .single();
  if (error || !a) throw new Error(error?.message ?? "Could not create the alert.");

  const { data: m } = await db
    .from("alert_messages")
    .insert({ alert_id: a.id, author: profile.name, author_role: "manager", body: text })
    .select("*")
    .single();

  revalidatePath(`/clients/${clientId}`);
  return {
    id: a.id,
    clientId,
    projectId: projectId ?? undefined,
    createdBy: profile.name,
    status: "open",
    createdAt: a.created_at,
    lastMessageAt: a.last_message_at,
    managerReadAt: nowIso,
    messages: [
      {
        id: m?.id ?? a.id,
        author: profile.name,
        authorRole: "manager",
        body: text,
        createdAt: m?.created_at ?? nowIso,
      },
    ],
  };
}

// Reply in a thread (manager or the client's commercial). Stamps the author's
// read timestamp so their own message never counts as unread to them.
export async function replyAlert(
  clientId: string,
  alertId: string,
  body: string
): Promise<AlertMessage> {
  await assertCanAccessClient(clientId);
  const profile = await getCurrentProfile();
  const text = body.trim();
  if (!text) throw new Error("Write a message first.");
  const role: AlertRole = profile?.isManager ? "manager" : "sales";

  const db = serverClient();
  const nowIso = new Date().toISOString();
  const { data: m, error } = await db
    .from("alert_messages")
    .insert({ alert_id: alertId, author: profile?.name ?? null, author_role: role, body: text })
    .select("*")
    .single();
  if (error || !m) throw new Error(error?.message ?? "Could not send the message.");

  const readCol = role === "manager" ? "manager_read_at" : "sales_read_at";
  await db
    .from("alerts")
    .update({ last_message_at: nowIso, [readCol]: nowIso })
    .eq("id", alertId)
    .eq("client_id", clientId);

  revalidatePath(`/clients/${clientId}`);
  return { id: m.id, author: profile?.name ?? "", authorRole: role, body: text, createdAt: m.created_at };
}

// Resolve / reopen a thread (manager or the client's commercial).
export async function resolveAlert(clientId: string, alertId: string): Promise<void> {
  await assertCanAccessClient(clientId);
  const profile = await getCurrentProfile();
  const db = serverClient();
  await db
    .from("alerts")
    .update({ status: "resolved", resolved_by: profile?.name ?? null, resolved_at: new Date().toISOString() })
    .eq("id", alertId)
    .eq("client_id", clientId);
  revalidatePath(`/clients/${clientId}`);
}

export async function reopenAlert(clientId: string, alertId: string): Promise<void> {
  await assertCanAccessClient(clientId);
  const db = serverClient();
  await db
    .from("alerts")
    .update({ status: "open", resolved_by: null, resolved_at: null })
    .eq("id", alertId)
    .eq("client_id", clientId);
  revalidatePath(`/clients/${clientId}`);
}

// Mark every alert on a client as read for the current user's role — called when
// they open the client so the header bell clears. Silent (no throw for others).
export async function markAlertsRead(clientId: string): Promise<void> {
  const profile = await getCurrentProfile();
  if (!profile) return;
  if (!profile.isManager) {
    const db0 = serverClient();
    const { data } = await db0.from("clients").select("assigned_to").eq("id", clientId).single();
    if (!data || data.assigned_to !== profile.name) return;
  }
  const db = serverClient();
  const col = profile.isManager ? "manager_read_at" : "sales_read_at";
  await db.from("alerts").update({ [col]: new Date().toISOString() }).eq("client_id", clientId);
}

// Save the expected payment schedule for an accepted quote. Owner or manager.
export async function setPaymentPlan(
  clientId: string,
  quoteId: string,
  items: PaymentPlanItem[]
): Promise<void> {
  await assertCanAccessClient(clientId);
  const db = serverClient();
  const clean = items
    .filter((i) => i.expectedDate)
    .map((i) => ({
      id: i.id,
      label: (i.label || "Payment").trim(),
      expectedDate: i.expectedDate,
      amount: Math.max(0, Number(i.amount) || 0),
    }));
  const { error } = await db
    .from("quotes")
    .update({ payment_plan: clean })
    .eq("id", quoteId)
    .eq("client_id", clientId);
  if (error) throw new Error(error.message);
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/collections");
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
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

// ─── Optional attachments (payment receipts, follow-up screenshots) ──────────────
// A single optional file stored on a payment or follow-up row (e.g. the bank
// transfer screenshot the client sends, or a WhatsApp conversation). Reuses the
// private project-files bucket; the row keeps the path + name.

export interface Attachment {
  path: string;
  name: string;
  url?: string; // short-lived signed URL
}

// Uploads a file under `prefix/id/…` and returns its path + a signed URL.
async function uploadAttachmentFile(
  prefix: string,
  id: string,
  file: File
): Promise<Attachment> {
  const db = serverClient();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${prefix}/${id}/${Date.now()}-${safeName}`;
  const { error: upErr } = await db.storage
    .from(PROJECT_FILES_BUCKET)
    .upload(path, file, { contentType: file.type || undefined, upsert: false });
  if (upErr) throw new Error(upErr.message);
  const { data: signed } = await db.storage
    .from(PROJECT_FILES_BUCKET)
    .createSignedUrl(path, 3600);
  return { path, name: file.name, url: signed?.signedUrl };
}

// Attach (or replace) the proof of payment on a payment row.
export async function attachPaymentReceipt(
  clientId: string,
  paymentId: string,
  formData: FormData
): Promise<Attachment> {
  await assertCanAccessClient(clientId);
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("No file provided.");

  const att = await uploadAttachmentFile("receipts", paymentId, file);
  const db = serverClient();
  const { error } = await db
    .from("payments")
    .update({ receipt_path: att.path, receipt_name: att.name })
    .eq("id", paymentId)
    .eq("client_id", clientId);
  if (error) {
    // Column missing (SQL not run yet) → clean up the orphan upload.
    await db.storage.from(PROJECT_FILES_BUCKET).remove([att.path]);
    throw new Error(
      "Could not save the receipt. Run the attachments SQL migration first."
    );
  }
  await logActivity(clientId, "note", `📎 Payment receipt attached: ${att.name}`);
  revalidatePath(`/clients/${clientId}`);
  return att;
}

export async function removePaymentReceipt(
  clientId: string,
  paymentId: string,
  path: string
): Promise<void> {
  await assertCanAccessClient(clientId);
  const db = serverClient();
  if (path) await db.storage.from(PROJECT_FILES_BUCKET).remove([path]);
  const { error } = await db
    .from("payments")
    .update({ receipt_path: null, receipt_name: null })
    .eq("id", paymentId)
    .eq("client_id", clientId);
  if (error) throw new Error(error.message);
  revalidatePath(`/clients/${clientId}`);
}

// Attach (or replace) a file on a follow-up (e.g. the conversation screenshot).
export async function attachFollowUpFile(
  clientId: string,
  followUpId: string,
  formData: FormData
): Promise<Attachment> {
  await assertCanAccessClient(clientId);
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("No file provided.");

  const att = await uploadAttachmentFile("follow-ups", followUpId, file);
  const db = serverClient();
  const { error } = await db
    .from("follow_ups")
    .update({ attachment_path: att.path, attachment_name: att.name })
    .eq("id", followUpId)
    .eq("client_id", clientId);
  if (error) {
    await db.storage.from(PROJECT_FILES_BUCKET).remove([att.path]);
    throw new Error(
      "Could not save the attachment. Run the attachments SQL migration first."
    );
  }
  revalidatePath(`/clients/${clientId}`);
  return att;
}

export async function removeFollowUpFile(
  clientId: string,
  followUpId: string,
  path: string
): Promise<void> {
  await assertCanAccessClient(clientId);
  const db = serverClient();
  if (path) await db.storage.from(PROJECT_FILES_BUCKET).remove([path]);
  const { error } = await db
    .from("follow_ups")
    .update({ attachment_path: null, attachment_name: null })
    .eq("id", followUpId)
    .eq("client_id", clientId);
  if (error) throw new Error(error.message);
  revalidatePath(`/clients/${clientId}`);
}
