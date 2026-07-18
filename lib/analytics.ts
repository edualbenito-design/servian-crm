import type { Client, Project, LeadSource, PipelineStage } from "./data";
import {
  PIPELINE_STAGES,
  followUpState,
  isWonStage,
  isDeadStage,
  isCompletedStage,
  isOpenStage,
  daysSince,
  LOST_STAGE,
  GHOSTING_STAGE,
} from "./data";

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
    // Active = live deals (open funnel + on site); Completed = finished.
    activeProjects: projects.filter(
      (p) => !isDeadStage(p.pipelineStage) && !isCompletedStage(p.pipelineStage)
    ).length,
    completedProjects: projects.filter((p) => isCompletedStage(p.pipelineStage))
      .length,
    approvedProjects: projects.filter((p) => p.approved).length,
    // Pipeline value = deals still in the funnel (not yet won, not dead).
    pipelineValue: projects
      .filter((p) => isOpenStage(p.pipelineStage))
      .reduce((s, p) => s + p.budget, 0),
    // Won value = deals won (on site + completed).
    wonValue: projects
      .filter((p) => isWonStage(p.pipelineStage))
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
  open: number; // still in the funnel (stages 1–5)
  won: number; // won (on site + completed)
  lost: number;
  ghosting: number;
  decided: number; // won + lost + ghosting (deals that reached an outcome)
  winRate: number; // won / decided
}

export function conversionFunnel(clients: Client[]): Conversion {
  const projects = allProjects(clients).map((x) => x.project);
  const total = projects.length;
  const open = projects.filter((p) => isOpenStage(p.pipelineStage)).length;
  const won = projects.filter((p) => isWonStage(p.pipelineStage)).length;
  const lost = projects.filter((p) => p.pipelineStage === LOST_STAGE).length;
  const ghosting = projects.filter(
    (p) => p.pipelineStage === GHOSTING_STAGE
  ).length;
  const decided = won + lost + ghosting;
  return {
    total,
    open,
    won,
    lost,
    ghosting,
    decided,
    winRate: decided > 0 ? Math.round((won / decided) * 100) : 0,
  };
}

// ── Time to close (captured → outcome), using the sealed closed_at ─────────────
// How long deals take from capture to a final outcome. Won and lost are split so
// a slow "yes" and a slow "no" don't blur together. Needs closed_at populated
// (deals closed before the migration backfill to their creation date).

export interface CloseTimes {
  avgDays: number | null; // across all closed deals
  samples: number;
  wonAvgDays: number | null; // won (on site + completed)
  wonSamples: number;
  lostAvgDays: number | null; // lost + ghosting
  lostSamples: number;
}

export function closeTimes(clients: Client[]): CloseTimes {
  const won: number[] = [];
  const lost: number[] = [];
  for (const c of clients) {
    const start = c.capturedAt ?? c.createdAt;
    for (const p of c.projects) {
      if (!p.closedAt) continue;
      const days = daysSince(start, new Date(p.closedAt));
      if (days == null || days < 0) continue;
      if (isWonStage(p.pipelineStage)) won.push(days);
      else if (isDeadStage(p.pipelineStage)) lost.push(days);
    }
  }
  const avg = (xs: number[]) =>
    xs.length ? Math.round(xs.reduce((s, d) => s + d, 0) / xs.length) : null;
  const all = [...won, ...lost];
  return {
    avgDays: avg(all),
    samples: all.length,
    wonAvgDays: avg(won),
    wonSamples: won.length,
    lostAvgDays: avg(lost),
    lostSamples: lost.length,
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
  for (let s = 1 as PipelineStage; s <= 9; s = (s + 1) as PipelineStage) {
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
