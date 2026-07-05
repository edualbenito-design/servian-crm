import Link from "next/link";
import { redirect } from "next/navigation";
import { getClients } from "@/lib/db";
import { getCurrentProfile } from "@/lib/auth";
import { SALESPEOPLE, type Salesperson } from "@/lib/data";
import {
  projectsForSalesperson,
  statsFor,
  salespersonSlug,
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

function initials(name: Salesperson): string {
  if (name === "Unassigned") return "—";
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");
}

function StatPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="flex flex-col items-center px-3 py-2 rounded-lg bg-(--surface) border border-(--border) min-w-[68px]">
      <span className={`text-lg font-bold ${tone}`}>{value}</span>
      <span className="text-[10px] font-medium text-(--text-muted) uppercase tracking-wide text-center leading-tight mt-0.5">
        {label}
      </span>
    </div>
  );
}

export default async function TeamPage() {
  const profile = await getCurrentProfile();
  if (profile && !profile.isManager) redirect("/");

  const clients = await getClients();

  // Real salespeople first; the "Unassigned" bucket only appears if it has work.
  const members = SALESPEOPLE.map((person) => {
    const projects = projectsForSalesperson(clients, person);
    return { person, stats: statsFor(projects) };
  }).filter((m) => m.person !== "Unassigned" || m.stats.total > 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-(--text-primary) tracking-tight">
          Team
        </h1>
        <p className="mt-1 text-sm text-(--text-secondary)">
          Commercial team workload at a glance — click a member to see their
          projects
        </p>
      </div>

      <div className="space-y-4">
        {members.map(({ person, stats }) => (
          <Link
            key={person}
            href={`/team/${salespersonSlug(person)}`}
            className="flex items-center justify-between gap-4 bg-(--card) border border-(--border) rounded-xl p-5 hover:border-(--accent)/40 hover:bg-(--surface)/40 transition-colors"
          >
            {/* Identity */}
            <div className="flex items-center gap-4 min-w-0">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold shrink-0 select-none ${avatarColor[person]}`}
              >
                {initials(person)}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-(--text-primary) truncate">
                  {person}
                </p>
                <p className="text-xs text-(--text-muted)">
                  {stats.total} {stats.total === 1 ? "project" : "projects"} ·{" "}
                  {stats.open} open
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-2 shrink-0">
              <StatPill label="Total" value={stats.total} tone="text-(--text-primary)" />
              <StatPill label="To Contact" value={stats.pending} tone="text-sky-600 dark:text-sky-400" />
              <StatPill label="Follow-up" value={stats.followUp} tone="text-amber-600 dark:text-amber-400" />
              <StatPill label="Completed" value={stats.completed} tone="text-emerald-600 dark:text-emerald-400" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
