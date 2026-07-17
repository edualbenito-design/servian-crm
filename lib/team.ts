import type { Client, Project, Salesperson } from "./data";
import { isCompletedStage, isDeadStage } from "./data";

// A project together with the client it belongs to, so it can be shown and
// linked from the team views.
export interface AssignedProject {
  project: Project;
  clientId: string;
  clientName: string;
  clientLocation: string;
}

// The commercial categories the user works with.
export type ProjectCategory = "pending" | "follow-up" | "completed" | "lost";

export const CATEGORY_LABEL: Record<ProjectCategory, string> = {
  pending: "Pending Contact",
  "follow-up": "In Follow-up",
  completed: "Completed",
  lost: "Lost / Ghosting",
};

// Classifies a project by where it sits in the pipeline.
//  - pending:   Stage 1 (New Lead) — nobody has reached out yet
//  - completed: Completed (won job finished)
//  - lost:      Lost or Ghosting (dead deals)
//  - follow-up: everything in between (still in progress / on site)
export function projectCategory(p: Project): ProjectCategory {
  if (isDeadStage(p.pipelineStage)) return "lost";
  if (isCompletedStage(p.pipelineStage)) return "completed";
  if (p.pipelineStage === 1) return "pending";
  return "follow-up";
}

// All projects owned by a salesperson (a salesperson owns clients, and each
// client can have several projects).
export function projectsForSalesperson(
  clients: Client[],
  person: Salesperson
): AssignedProject[] {
  const out: AssignedProject[] = [];
  for (const c of clients) {
    if (c.assignedTo !== person) continue;
    for (const project of c.projects) {
      out.push({
        project,
        clientId: c.id,
        clientName: c.name,
        clientLocation: c.location,
      });
    }
  }
  return out;
}

export interface TeamStats {
  total: number;
  pending: number;
  followUp: number;
  completed: number;
  lost: number; // lost + ghosting (dead deals)
  open: number; // pending + follow-up (everything still live)
}

export function statsFor(projects: AssignedProject[]): TeamStats {
  let pending = 0;
  let followUp = 0;
  let completed = 0;
  let lost = 0;
  for (const { project } of projects) {
    const cat = projectCategory(project);
    if (cat === "pending") pending++;
    else if (cat === "follow-up") followUp++;
    else if (cat === "lost") lost++;
    else completed++;
  }
  return {
    total: projects.length,
    pending,
    followUp,
    completed,
    lost,
    open: pending + followUp,
  };
}

// URL-safe slug for a salesperson name, and the reverse lookup.
export function salespersonSlug(name: Salesperson): string {
  return name.toLowerCase().replace(/\s+/g, "-");
}
