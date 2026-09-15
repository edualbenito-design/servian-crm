import Link from "next/link";
import { getClients, getQuoteStats, getMonthlyMovement, getReportMonths, getMonthlyReport, getCollections } from "@/lib/db";
import { collectionsSummary } from "@/lib/collections";
import { getCurrentProfile } from "@/lib/auth";
import {
  computeKpis,
  leadsByMonth,
  leadsBySource,
  pipelineFunnel,
  performanceByCommercial,
  durationBySize,
  conversionFunnel,
  closeTimes,
} from "@/lib/analytics";
import { SalesDashboard } from "./SalesDashboard";
import { ConversionCard } from "./ConversionCard";
import { ThisMonthCard } from "./ThisMonthCard";
import { CloseTimeCard } from "./CloseTimeCard";
import { ExpectedIncomeCard } from "./ExpectedIncomeCard";
import { MonthPicker } from "./MonthPicker";
import { MonthlyReportView } from "./MonthlyReportView";
import { ReportExport } from "./ReportExport";

function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, (m || 1) - 1, 1).toLocaleDateString("en-AE", {
    month: "long",
    year: "numeric",
  });
}

function money(n: number) {
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function num(n: number) {
  return new Intl.NumberFormat("en-AE", {
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

export default async function DashboardPage(props: PageProps<"/dashboard">) {
  const profile = await getCurrentProfile();
  const sp = await props.searchParams;
  const month = typeof sp?.month === "string" ? sp.month : "";
  const scope = profile && !profile.isManager ? profile.name : undefined;

  // Options for the month picker (capture months present in scope).
  const reportMonths = await getReportMonths(scope);

  // A month is selected → show that month's activity report (both roles).
  // Each metric counts by its own date; the live funnel/pipeline stay in "All time".
  if (month) {
    const report = await getMonthlyReport(month, scope);
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-(--text-primary) tracking-tight">
              Servian Contracting — {monthLabel(month)}
            </h1>
            <p className="mt-1 text-sm text-(--text-secondary)">
              Monthly activity report
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <ReportExport report={report} />
            <span className="print:hidden">
              <MonthPicker months={reportMonths} value={month} />
            </span>
          </div>
        </div>
        <MonthlyReportView report={report} />
      </div>
    );
  }

  // Commercials get their own personal dashboard (only their data).
  if (profile && !profile.isManager) {
    const [myClients, myQuoteStats, myMovement, myCollections] = await Promise.all([
      getClients(profile.name),
      getQuoteStats(profile.name),
      getMonthlyMovement(profile.name),
      getCollections(profile.name),
    ]);
    const { expectedPayments: myExpected } = myCollections;
    const myOverdue = collectionsSummary(myCollections.receivables);
    return (
      <SalesDashboard
        clients={myClients}
        name={profile.name}
        quoteStats={myQuoteStats}
        movement={myMovement}
        expected={myExpected.map((e) => ({ date: e.date, amount: e.amount }))}
        overdueAmount={myOverdue.overdueAmount}
        overdueCount={myOverdue.overdueCount}
        monthPicker={<MonthPicker months={reportMonths} value="" />}
      />
    );
  }

  // Independent reads → fetch in parallel so the page paints sooner.
  const [clients, quoteStats, movement, collections] = await Promise.all([
    getClients(),
    getQuoteStats(),
    getMonthlyMovement(),
    getCollections(),
  ]);
  const { expectedPayments } = collections;
  const conversion = conversionFunnel(clients);

  const kpis = computeKpis(clients);
  const months = leadsByMonth(clients, 6);
  const sources = leadsBySource(clients);
  const funnel = pipelineFunnel(clients);
  const commercials = performanceByCommercial(clients);
  const durations = durationBySize(clients);
  const close = closeTimes(clients);
  const overdue = collectionsSummary(collections.receivables);

  const maxMonth = Math.max(1, ...months.map((m) => m.count));
  const maxFunnel = Math.max(1, ...funnel.map((f) => f.count));
  const maxCommercial = Math.max(1, ...commercials.map((c) => c.value));
  const totalSources = Math.max(
    1,
    sources.referral + sources.instagram + sources.other
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-(--text-primary) tracking-tight">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-(--text-secondary)">
            Business overview across all clients and projects
          </p>
        </div>
        <MonthPicker months={reportMonths} value="" />
      </div>

      {overdue.overdueAmount > 0.5 && (
        <Link
          href="/collections"
          className="mb-6 flex items-center gap-3 rounded-xl border border-red-300 dark:border-red-800/60 bg-red-50 dark:bg-red-900/20 px-4 py-3 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500 shrink-0"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" /><path d="M12 9v4M12 17h.01" /></svg>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">
              AED {num(overdue.overdueAmount)} overdue to collect
            </p>
            <p className="text-xs text-red-600/80 dark:text-red-400/80">
              {overdue.overdueCount} receivable{overdue.overdueCount === 1 ? "" : "s"} past due — open Collections to chase them.
            </p>
          </div>
          <span className="ml-auto text-red-500">→</span>
        </Link>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Kpi label="Total Clients" value={String(kpis.totalClients)} />
        <Kpi label="Leads This Month" value={String(kpis.leadsThisMonth)} />
        <Kpi label="Active Projects" value={String(kpis.activeProjects)} />
        <Kpi label="Approved Projects" value={String(kpis.approvedProjects)} />
        <Kpi label="Pipeline · AED" value={num(kpis.pipelineValue)} />
        <Kpi label="Won · AED" value={num(kpis.wonValue)} />
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
          <div className="flex items-end justify-between gap-2 sm:gap-3 h-44">
            {months.map((m) => (
              <div
                key={m.key}
                className="flex-1 h-full flex flex-col items-center justify-end gap-1"
              >
                <span className="text-xs font-semibold text-(--text-secondary)">
                  {m.count}
                </span>
                <div
                  className="w-full bg-(--accent) rounded-t-md transition-all"
                  style={{
                    height: `${Math.max(4, (m.count / maxMonth) * 130)}px`,
                  }}
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

      {/* Conversion + monthly movement */}
      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        <ConversionCard conversion={conversion} quoteStats={quoteStats} />
        <ThisMonthCard movement={movement} />
      </div>

      <div className="mt-6">
        <ExpectedIncomeCard
          expected={expectedPayments.map((e) => ({ date: e.date, amount: e.amount }))}
        />
      </div>

      {/* Time to close + avg duration */}
      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        <CloseTimeCard close={close} />

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

      {/* Performance by commercial */}
      <div className="mt-6">
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
      </div>
    </div>
  );
}
