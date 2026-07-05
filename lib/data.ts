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
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  location: string;
  propertyType: PropertyType;
  leadSource: LeadSource;
  assignedTo: Salesperson; // managing commercial
  capturedBy?: Capturer; // who brought the lead in
  capturedAt?: string; // date the lead was captured (YYYY-MM-DD)
  createdAt?: string; // row creation timestamp (fallback for month grouping)
  notes?: string;
  projects: Project[];
  activities: Activity[];
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
