import { redirect } from "next/navigation";
import { getClients } from "@/lib/db";
import { getCurrentProfile } from "@/lib/auth";
import {
  computeKpis,
  leadsByMonth,
  leadsBySource,
  pipelineFunnel,
  performanceByCommercial,
  durationBySize,
} from "@/lib/analytics";

function money(n: number) {
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
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

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-(--card) border border-(--border) rounded-xl p-5">
      <h2 className="text-sm font-semibold text-(--text-primary) mb-4">
        {title}
      </h2>
      {children}
    </div>
  );
}

export default async function DashboardPage() {
  const profile = await getCurrentProfile();
  if (profile && !profile.isManager) redirect("/");

  const clients = await getClients();

  const kpis = computeKpis(clients);
  const months = leadsByMonth(clients, 6);
  const sources = leadsBySource(clients);
  const funnel = pipelineFunnel(clients);
  const commercials = performanceByCommercial(clients);
  const durations = durationBySize(clients);

  const maxMonth = Math.max(1, ...months.map((m) => m.count));
  const maxFunnel = Math.max(1, ...funnel.map((f) => f.count));
  const maxCommercial = Math.max(1, ...commercials.map((c) => c.value));
  const totalSources = Math.max(
    1,
    sources.referral + sources.instagram + sources.other
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-(--text-primary) tracking-tight">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-(--text-secondary)">
          Business overview across all clients and projects
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Kpi label="Total Clients" value={String(kpis.totalClients)} />
        <Kpi label="Leads This Month" value={String(kpis.leadsThisMonth)} />
        <Kpi label="Active Projects" value={String(kpis.activeProjects)} />
        <Kpi label="Approved Projects" value={String(kpis.approvedProjects)} />
        <Kpi label="Pipeline Value" value={money(kpis.pipelineValue)} />
        <Kpi label="Won Value" value={money(kpis.wonValue)} />
        <Kpi label="Follow-ups Due" value={String(kpis.followUpsDue)} />
        <Kpi
          label="Win Rate"
          value={`${
            kpis.completedProjects + kpis.activeProjects > 0
              ? Math.round(
                  (kpis.completedProjects /
                    (kpis.completedProjects + kpis.activeProjects)) *
                    100
                )
              : 0
          }%`}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Leads by month */}
        <Card title="Leads captured by month">
          <div className="flex items-end justify-between gap-3 h-40">
            {months.map((m) => (
              <div key={m.key} className="flex-1 flex flex-col items-center gap-2">
                <span className="text-xs font-semibold text-(--text-secondary)">
                  {m.count}
                </span>
                <div
                  className="w-full bg-(--accent) rounded-t-md min-h-[4px] transition-all"
                  style={{ height: `${(m.count / maxMonth) * 100}%` }}
                />
                <span className="text-xs text-(--text-muted)">{m.label}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Leads by source */}
        <Card title="Leads by source">
          <div className="space-y-3">
            {(["referral", "instagram", "other"] as const).map((s) => {
              const count = sources[s];
              const pct = Math.round((count / totalSources) * 100);
              const label =
                s === "referral"
                  ? "Referral"
                  : s === "instagram"
                    ? "Instagram"
                    : "Other";
              return (
                <div key={s}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-(--text-secondary)">{label}</span>
                    <span className="text-(--text-muted)">
                      {count} · {pct}%
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-(--surface) overflow-hidden">
                    <div
                      className="h-full bg-(--accent) rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Pipeline funnel */}
      <Card title="Pipeline — projects per stage">
        <div className="space-y-2">
          {funnel.map((f) => (
            <div key={f.stage} className="flex items-center gap-3">
              <span className="w-24 sm:w-40 shrink-0 text-xs text-(--text-secondary) truncate">
                {f.stage}. {f.label}
              </span>
              <div className="flex-1 h-5 rounded bg-(--surface) overflow-hidden">
                <div
                  className="h-full bg-(--accent)/70 rounded flex items-center"
                  style={{ width: `${(f.count / maxFunnel) * 100}%` }}
                />
              </div>
              <span className="w-8 shrink-0 text-xs font-semibold text-(--text-secondary) text-right">
                {f.count}
              </span>
              <span className="hidden sm:block w-24 shrink-0 text-xs font-mono text-(--text-muted) text-right">
                {money(f.value)}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        {/* Performance by commercial */}
        <Card title="Performance by commercial">
          <div className="space-y-3">
            {commercials.map((c) => (
              <div key={c.name}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-(--text-secondary) font-medium">
                    {c.name}
                  </span>
                  <span className="text-(--text-muted)">
                    {c.clients} clients · {c.activeProjects} active ·{" "}
                    {money(c.value)}
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-(--surface) overflow-hidden">
                  <div
                    className="h-full bg-(--accent) rounded-full"
                    style={{ width: `${(c.value / maxCommercial) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Avg duration by size */}
        <Card title="Avg. project duration by size">
          <div className="space-y-4">
            {durations.map((d) => (
              <div
                key={d.label}
                className="flex items-center justify-between border-b border-(--border) last:border-0 pb-3 last:pb-0"
              >
                <span className="text-sm text-(--text-secondary)">
                  {d.label}
                </span>
                <span className="text-sm font-semibold text-(--text-primary)">
                  {d.avgDays !== null ? (
                    <>
                      {d.avgDays} days{" "}
                      <span className="text-xs font-normal text-(--text-muted)">
                        ({d.samples})
                      </span>
                    </>
                  ) : (
                    <span className="text-(--text-muted)">No data yet</span>
                  )}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-(--text-muted)">
            Based on completed projects with start and end dates.
          </p>
        </Card>
      </div>
    </div>
  );
}
