"use server";

import { revalidatePath } from "next/cache";
import { serverClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { PIPELINE_STAGES } from "@/lib/data";
import type { Activity, ActivityType, Project, PropertyType, LeadSource, ProjectStatus, PipelineStage, Salesperson } from "@/lib/data";

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
  leadSource: LeadSource;
  assignedTo: Salesperson;
  capturedBy: string;
  capturedAt: string;
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
  const { error } = await db
    .from("clients")
    .update({
      name: fields.name.trim() || undefined,
      phone: fields.phone.trim() || undefined,
      email: fields.email.trim() || undefined,
      location: fields.location.trim() || undefined,
      property_type: fields.propertyType,
      lead_source: fields.leadSource,
      assigned_to: fields.assignedTo,
      captured_by: fields.capturedBy.trim() || null,
      captured_at: fields.capturedAt || null,
      notes: fields.notes.trim() || null,
    })
    .eq("id", clientId);

  if (error) throw new Error(error.message);
  await logActivity(clientId, "client_updated", "Client details updated");
  revalidatePath("/");
  revalidatePath(`/clients/${clientId}`);
}

// Creates a new client (manual lead entry) and returns its id.
export async function createClient(fields: ClientFields): Promise<string> {
  const db = serverClient();
  const { data, error } = await db
    .from("clients")
    .insert({
      name: fields.name.trim() || "New Client",
      phone: fields.phone.trim() || "",
      email: fields.email.trim() || "",
      location: fields.location.trim() || "",
      property_type: fields.propertyType,
      lead_source: fields.leadSource,
      assigned_to: fields.assignedTo,
      captured_by: fields.capturedBy.trim() || null,
      captured_at: fields.capturedAt || new Date().toISOString().slice(0, 10),
      notes: fields.notes.trim() || null,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
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
