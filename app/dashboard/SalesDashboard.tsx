import Link from "next/link";
import type { Client } from "@/lib/data";
import { followUpState, PIPELINE_STAGES } from "@/lib/data";
import { pipelineFunnel, conversionFunnel } from "@/lib/analytics";
import type { QuoteStats, MonthMovement } from "@/lib/db";
import { ConversionCard } from "./ConversionCard";
import { ThisMonthCard } from "./ThisMonthCard";

function num(n: number) {
  return new Intl.NumberFormat("en-AE", { maximumFractionDigits: 0 }).format(n);
}

function formatDate(s?: string) {
  if (!s) return "";
  return new Date(s + "T00:00:00").toLocaleDateString("en-AE", {
    day: "numeric",
    month: "short",
  });
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-(--card) border border-(--border) rounded-xl p-3 sm:p-5">
      <p className="text-[10px] sm:text-xs font-medium text-(--text-muted) uppercase tracking-widest mb-1">
        {label}
      </p>
      <p className="text-lg sm:text-2xl font-bold text-(--text-primary) truncate">
        {value}
      </p>
    </div>
  );
}

export function SalesDashboard({
  clients,
  name,
  quoteStats,
  movement,
}: {
  clients: Client[];
  name: string;
  quoteStats: QuoteStats;
  movement: MonthMovement[];
}) {
  const projects = clients.flatMap((c) => c.projects);
  const activeProjects = projects.filter((p) => p.status === "active").length;
  const pipelineValue = projects
    .filter((p) => p.status !== "completed")
    .reduce((s, p) => s + p.budget, 0);

  // Follow-up buckets, sorted by date.
  const withFollow = clients
    .filter((c) => c.nextFollowUp)
    .sort((a, b) => (a.nextFollowUp! < b.nextFollowUp! ? -1 : 1));
  const overdue = withFollow.filter(
    (c) => followUpState(c.nextFollowUp) === "overdue"
  );
  const today = withFollow.filter(
    (c) => followUpState(c.nextFollowUp) === "today"
  );
  const upcoming = withFollow.filter(
    (c) => followUpState(c.nextFollowUp) === "upcoming"
  );

  const funnel = pipelineFunnel(clients);
  const maxFunnel = Math.max(1, ...funnel.map((f) => f.count));
  const conversion = conversionFunnel(clients);

  const dueCount = overdue.length + today.length;

  function FollowRow({ c }: { c: Client }) {
    const st = followUpState(c.nextFollowUp);
    return (
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <Link href={`/clients/${c.id}`} className="min-w-0 flex-1 group">
          <p className="text-sm font-medium text-(--text-primary) group-hover:text-(--accent) truncate">
            {c.name}
          </p>
          <p className="text-xs text-(--text-muted) truncate">
            {c.location || c.phone}
          </p>
        </Link>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              st === "overdue"
                ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                : st === "today"
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                  : "bg-(--surface) border border-(--border) text-(--text-secondary)"
            }`}
          >
            {st === "overdue"
              ? "Overdue"
              : st === "today"
                ? "Today"
                : formatDate(c.nextFollowUp)}
          </span>
          {c.phone && (
            <a
              href={`https://wa.me/${c.phone.replace(/[^0-9]/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
              title="WhatsApp"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.29.173-1.414-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885M20.52 3.449C18.24 1.245 15.24.044 12.045.044 5.463.044.104 5.4.101 11.986c0 2.096.549 4.14 1.595 5.945L0 24l6.335-1.652a11.96 11.96 0 005.71 1.454h.006c6.585 0 11.946-5.357 11.949-11.945a11.9 11.9 0 00-3.481-8.418" />
              </svg>
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-(--text-primary) tracking-tight">
          My Dashboard
        </h1>
        <p className="mt-1 text-sm text-(--text-secondary)">
          {name} — your clients, projects and follow-ups
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Kpi label="My Clients" value={String(clients.length)} />
        <Kpi label="Active Projects" value={String(activeProjects)} />
        <Kpi label="Pipeline · AED" value={num(pipelineValue)} />
        <Kpi label="Follow-ups Due" value={String(dueCount)} />
      </div>

      {/* Follow-ups to-do */}
      <div className="bg-(--card) border border-(--border) rounded-xl overflow-hidden mb-6">
        <div className="px-4 sm:px-5 py-3 border-b border-(--border)">
          <h2 className="text-sm font-semibold text-(--text-primary)">
            Today&apos;s follow-ups
          </h2>
          <p className="text-xs text-(--text-muted) mt-0.5">
            Who to contact — tap the name to open, or WhatsApp directly
          </p>
        </div>

        {overdue.length === 0 && today.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-(--text-muted)">
            Nothing due right now. 🎉
          </div>
        ) : (
          <div className="divide-y divide-(--border)">
            {overdue.map((c) => (
              <FollowRow key={c.id} c={c} />
            ))}
            {today.map((c) => (
              <FollowRow key={c.id} c={c} />
            ))}
          </div>
        )}

        {upcoming.length > 0 && (
          <>
            <div className="px-4 sm:px-5 py-2 bg-(--surface)/50 border-t border-(--border)">
              <p className="text-[11px] font-semibold text-(--text-muted) uppercase tracking-wider">
                Upcoming
              </p>
            </div>
            <div className="divide-y divide-(--border)">
              {upcoming.slice(0, 8).map((c) => (
                <FollowRow key={c.id} c={c} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* My pipeline */}
      <div className="bg-(--card) border border-(--border) rounded-xl p-5">
        <h2 className="text-sm font-semibold text-(--text-primary) mb-4">
          My pipeline
        </h2>
        <div className="space-y-2">
          {funnel.map((f) => (
            <div key={f.stage} className="flex items-center gap-3">
              <span className="w-24 sm:w-40 shrink-0 text-xs text-(--text-secondary) truncate">
                {f.stage}. {PIPELINE_STAGES[f.stage]}
              </span>
              <div className="flex-1 h-5 rounded bg-(--surface) overflow-hidden">
                <div
                  className="h-full bg-(--accent)/70 rounded"
                  style={{ width: `${(f.count / maxFunnel) * 100}%` }}
                />
              </div>
              <span className="w-8 shrink-0 text-xs font-semibold text-(--text-secondary) text-right">
                {f.count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Conversion + monthly movement */}
      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        <ConversionCard conversion={conversion} quoteStats={quoteStats} />
        <ThisMonthCard movement={movement} />
      </div>
    </div>
  );
}
