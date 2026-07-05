"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PIPELINE_STAGES,
  type ProjectStatus,
  type Salesperson,
} from "@/lib/data";
import {
  projectCategory,
  type AssignedProject,
  type ProjectCategory,
  type TeamStats,
} from "@/lib/team";

const avatarColor: Record<Salesperson, string> = {
  Joana: "bg-indigo-200 text-indigo-800 dark:bg-indigo-800 dark:text-indigo-200",
  Alfie: "bg-teal-200 text-teal-800 dark:bg-teal-800 dark:text-teal-200",
  Elsayed: "bg-rose-200 text-rose-800 dark:bg-rose-800 dark:text-rose-200",
  Faizan: "bg-amber-200 text-amber-800 dark:bg-amber-800 dark:text-amber-200",
  Eduardo: "bg-sky-200 text-sky-800 dark:bg-sky-800 dark:text-sky-200",
  Sergio: "bg-fuchsia-200 text-fuchsia-800 dark:bg-fuchsia-800 dark:text-fuchsia-200",
  Unassigned: "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400",
};

const statusStyle: Record<ProjectStatus, string> = {
  active:
    "bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-400 dark:border-emerald-800/60",
  completed:
    "bg-zinc-100 text-zinc-600 border border-zinc-200 dark:bg-zinc-800/60 dark:text-zinc-400 dark:border-zinc-700/60",
  "on-hold":
    "bg-yellow-100 text-yellow-700 border border-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-400 dark:border-yellow-800/50",
};

const statusLabel: Record<ProjectStatus, string> = {
  active: "Active",
  completed: "Completed",
  "on-hold": "On Hold",
};

const categoryDot: Record<ProjectCategory, string> = {
  pending: "bg-sky-500",
  "follow-up": "bg-amber-500",
  completed: "bg-emerald-500",
};

// Filter chips: value maps to a category (or "all").
type Filter = "all" | ProjectCategory;

function initials(name: Salesperson): string {
  if (name === "Unassigned") return "—";
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

export function TeamMemberView({
  person,
  projects,
  stats,
}: {
  person: Salesperson;
  projects: AssignedProject[];
  stats: TeamStats;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");

  const visible =
    filter === "all"
      ? projects
      : projects.filter((p) => projectCategory(p.project) === filter);

  const chips: { value: Filter; label: string; count: number }[] = [
    { value: "all", label: "All", count: stats.total },
    { value: "pending", label: "To Contact", count: stats.pending },
    { value: "follow-up", label: "In Follow-up", count: stats.followUp },
    { value: "completed", label: "Completed", count: stats.completed },
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Back */}
      <Link
        href="/team"
        className="inline-flex items-center gap-1.5 text-sm text-(--text-muted) hover:text-(--text-secondary) transition-colors mb-8"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back to Team
      </Link>

      {/* Header */}
      <div className="flex items-center gap-5 mb-8">
        <div
          className={`w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold select-none ${avatarColor[person]}`}
        >
          {initials(person)}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-(--text-primary) tracking-tight">
            {person}
          </h1>
          <p className="mt-0.5 text-sm text-(--text-secondary)">
            {stats.total} projects · {stats.open} open · {stats.completed}{" "}
            completed
          </p>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {chips.map((chip) => {
          const isActive = filter === chip.value;
          return (
            <button
              key={chip.value}
              type="button"
              onClick={() => setFilter(chip.value)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                isActive
                  ? "bg-(--accent) text-white dark:text-black border-(--accent)"
                  : "bg-(--card) text-(--text-secondary) border-(--border) hover:border-(--accent)/40"
              }`}
            >
              {chip.label}
              <span
                className={`text-xs font-bold ${
                  isActive ? "text-white/80 dark:text-black/70" : "text-(--text-muted)"
                }`}
              >
                {chip.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Projects list */}
      <div className="bg-(--card) border border-(--border) rounded-xl overflow-hidden">
        {visible.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-(--text-muted)">
              No projects in this category.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-(--border)">
            {visible.map(({ project, clientId, clientName, clientLocation }) => {
              const cat = projectCategory(project);
              return (
                <div
                  key={project.id}
                  onClick={() => router.push(`/clients/${clientId}`)}
                  className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-(--surface)/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${categoryDot[cat]}`}
                      title={cat}
                    />
                    <div className="min-w-0">
                      <p className="font-semibold text-(--text-primary) truncate">
                        {project.name}
                      </p>
                      <p className="text-xs text-(--text-muted) truncate">
                        {clientName} · {clientLocation}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="hidden sm:block text-right">
                      <p className="text-xs text-(--text-muted)">
                        Stage {project.pipelineStage}
                      </p>
                      <p className="text-xs text-(--text-secondary)">
                        {PIPELINE_STAGES[project.pipelineStage]}
                      </p>
                    </div>
                    <span className="font-mono text-xs font-bold text-(--accent) w-24 text-right">
                      {formatCurrency(project.budget)}
                    </span>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0 ${statusStyle[project.status]}`}
                    >
                      {statusLabel[project.status]}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
