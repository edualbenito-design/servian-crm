import type { Client, Project, LeadSource, PipelineStage } from "./data";
import { PIPELINE_STAGES, followUpState } from "./data";

export function monthKey(dateStr?: string): string {
  return dateStr ? dateStr.slice(0, 7) : "";
}

function clientMonth(c: Client): string {
  return monthKey(c.capturedAt ?? c.createdAt);
}

// All projects across all clients, tagged with their client.
function allProjects(clients: Client[]): { project: Project; client: Client }[] {
  const out: { project: Project; client: Client }[] = [];
  for (const c of clients) for (const p of c.projects) out.push({ project: p, client: c });
  return out;
}

// ── Headline KPIs ─────────────────────────────────────────────────────────────

export interface Kpis {
  totalClients: number;
  leadsThisMonth: number;
  activeProjects: number;
  completedProjects: number;
  approvedProjects: number;
  pipelineValue: number; // value of not-completed projects
  wonValue: number; // value of completed projects
  followUpsDue: number; // clients overdue or due today
}

export function computeKpis(clients: Client[]): Kpis {
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const projects = allProjects(clients).map((x) => x.project);
  return {
    totalClients: clients.length,
    leadsThisMonth: clients.filter((c) => clientMonth(c) === thisMonth).length,
    activeProjects: projects.filter((p) => p.status === "active").length,
    completedProjects: projects.filter((p) => p.status === "completed").length,
    approvedProjects: projects.filter((p) => p.approved).length,
    pipelineValue: projects
      .filter((p) => p.status !== "completed")
      .reduce((s, p) => s + p.budget, 0),
    wonValue: projects
      .filter((p) => p.status === "completed")
      .reduce((s, p) => s + p.budget, 0),
    followUpsDue: clients.filter((c) => {
      const s = followUpState(c.nextFollowUp);
      return s === "overdue" || s === "today";
    }).length,
  };
}

// ── Deal conversion (based on how far each project got in the pipeline) ─────────
// Uses the project's current stage as "furthest reached": Quoted = a quote was
// sent (stage ≥ 4), Confirmed = won the job (stage ≥ 7), Completed = finished.

export interface Conversion {
  total: number;
  quoted: number; // reached "Quote 1 Sent" or beyond
  confirmed: number; // reached "Project Confirmed" or beyond
  completed: number;
  quotedRate: number; // quoted / total
  winRate: number; // confirmed / quoted (of quoted deals, how many were won)
  closeRate: number; // confirmed / total (overall lead → won)
}

export function conversionFunnel(clients: Client[]): Conversion {
  const projects = allProjects(clients).map((x) => x.project);
  const total = projects.length;
  const quoted = projects.filter((p) => p.pipelineStage >= 4).length;
  const confirmed = projects.filter((p) => p.pipelineStage >= 7).length;
  const completed = projects.filter(
    (p) => p.status === "completed" || p.pipelineStage === 8
  ).length;
  const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);
  return {
    total,
    quoted,
    confirmed,
    completed,
    quotedRate: pct(quoted, total),
    winRate: pct(confirmed, quoted),
    closeRate: pct(confirmed, total),
  };
}

// ── Leads captured per month (last N months, oldest→newest) ────────────────────

export interface MonthBar {
  key: string;
  label: string;
  count: number;
}

export function leadsByMonth(clients: Client[], months = 6): MonthBar[] {
  const now = new Date();
  const bars: MonthBar[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    bars.push({
      key,
      label: d.toLocaleDateString("en-AE", { month: "short" }),
      count: clients.filter((c) => clientMonth(c) === key).length,
    });
  }
  return bars;
}

// ── Leads by source ────────────────────────────────────────────────────────────

export function leadsBySource(clients: Client[]): Record<LeadSource, number> {
  const out: Record<LeadSource, number> = { referral: 0, instagram: 0, other: 0 };
  for (const c of clients) out[c.leadSource]++;
  return out;
}

// ── Pipeline funnel (projects per stage) ───────────────────────────────────────

export interface StageBar {
  stage: PipelineStage;
  label: string;
  count: number;
  value: number;
}

export function pipelineFunnel(clients: Client[]): StageBar[] {
  const projects = allProjects(clients).map((x) => x.project);
  const bars: StageBar[] = [];
  for (let s = 1 as PipelineStage; s <= 8; s = (s + 1) as PipelineStage) {
    const inStage = projects.filter((p) => p.pipelineStage === s);
    bars.push({
      stage: s,
      label: PIPELINE_STAGES[s],
      count: inStage.length,
      value: inStage.reduce((sum, p) => sum + p.budget, 0),
    });
  }
  return bars;
}

// ── Performance by commercial (managing person) ────────────────────────────────

export interface CommercialRow {
  name: string;
  clients: number;
  activeProjects: number;
  value: number;
}

export function performanceByCommercial(clients: Client[]): CommercialRow[] {
  const map = new Map<string, CommercialRow>();
  for (const c of clients) {
    const key = c.assignedTo;
    const row =
      map.get(key) ?? { name: key, clients: 0, activeProjects: 0, value: 0 };
    row.clients++;
    for (const p of c.projects) {
      if (p.status === "active") row.activeProjects++;
      row.value += p.budget;
    }
    map.set(key, row);
  }
  return Array.from(map.values()).sort((a, b) => b.value - a.value);
}

// ── Average project duration by size ───────────────────────────────────────────

export interface DurationBucket {
  label: string;
  avgDays: number | null;
  samples: number;
}

export function durationBySize(clients: Client[]): DurationBucket[] {
  const buckets = [
    { label: "Small (< 20k)", min: 0, max: 20000, days: [] as number[] },
    { label: "Medium (20k–100k)", min: 20000, max: 100000, days: [] as number[] },
    { label: "Large (> 100k)", min: 100000, max: Infinity, days: [] as number[] },
  ];
  for (const { project: p } of allProjects(clients)) {
    if (p.status !== "completed" || !p.endDate) continue;
    const start = new Date(p.startDate).getTime();
    const end = new Date(p.endDate).getTime();
    if (isNaN(start) || isNaN(end) || end < start) continue;
    const days = Math.round((end - start) / 86400000);
    const b = buckets.find((x) => p.budget >= x.min && p.budget < x.max);
    if (b) b.days.push(days);
  }
  return buckets.map((b) => ({
    label: b.label,
    samples: b.days.length,
    avgDays: b.days.length
      ? Math.round(b.days.reduce((s, d) => s + d, 0) / b.days.length)
      : null,
  }));
}
