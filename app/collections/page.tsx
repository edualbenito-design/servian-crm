import Link from "next/link";
import { getCollections } from "@/lib/db";
import { getCurrentProfile } from "@/lib/auth";
import {
  collectionsSummary,
  ageingBuckets,
  outstandingByCommercial,
  OVERDUE_DAYS,
} from "@/lib/collections";

function money(n: number) {
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function Kpi({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "danger" | "good";
}) {
  const valueColor =
    tone === "danger"
      ? "text-red-600 dark:text-red-400"
      : tone === "good"
        ? "text-emerald-600 dark:text-emerald-400"
        : "text-(--text-primary)";
  return (
    <div className="bg-(--card) border border-(--border) rounded-xl p-3 sm:p-5">
      <p className="text-[10px] sm:text-xs font-medium text-(--text-muted) uppercase tracking-widest mb-1">
        {label}
      </p>
      <p className={`text-lg sm:text-2xl font-bold truncate ${valueColor}`}>
        {value}
      </p>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-(--card) border border-(--border) rounded-xl p-5">
      <h2 className="text-sm font-semibold text-(--text-primary) mb-4">{title}</h2>
      {children}
    </div>
  );
}

// Age badge: green (fresh) → amber → red (overdue).
function AgeBadge({ days }: { days: number }) {
  const cls =
    days > 60
      ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
      : days > OVERDUE_DAYS
        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
        : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${cls}`}>
      {days}d
    </span>
  );
}

function WhatsApp({ phone }: { phone: string }) {
  if (!phone.trim()) return null;
  return (
    <a
      href={`https://wa.me/${phone.replace(/[^0-9]/g, "")}`}
      target="_blank"
      rel="noopener noreferrer"
      title="WhatsApp"
      className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.29.173-1.414-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885M20.52 3.449C18.24 1.245 15.24.044 12.045.044 5.463.044.104 5.4.101 11.986c0 2.096.549 4.14 1.595 5.945L0 24l6.335-1.652a11.96 11.96 0 005.71 1.454h.006c6.585 0 11.946-5.357 11.949-11.945a11.9 11.9 0 00-3.481-8.418" />
      </svg>
    </a>
  );
}

export default async function CollectionsPage() {
  const profile = await getCurrentProfile();
  const isManager = profile?.isManager ?? false;
  // Managers see everyone; commercials see only their own clients' money.
  const { receivables, collectedThisMonth } = await getCollections(
    isManager ? undefined : profile?.name
  );

  const summary = collectionsSummary(receivables);
  const buckets = ageingBuckets(receivables);
  const byCommercial = outstandingByCommercial(receivables);
  const maxBucket = Math.max(1, ...buckets.map((b) => b.amount));
  const maxCommercial = Math.max(1, ...byCommercial.map((c) => c.amount));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-(--text-primary) tracking-tight">
          Collections
        </h1>
        <p className="mt-1 text-sm text-(--text-secondary)">
          Money owed on accepted quotes — biggest and oldest balances first.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Kpi label="Outstanding · AED" value={money(summary.totalOutstanding)} />
        <Kpi label="Open receivables" value={String(summary.count)} />
        <Kpi
          label={`Overdue >${OVERDUE_DAYS}d · AED`}
          value={money(summary.overdueAmount)}
          tone={summary.overdueAmount > 0 ? "danger" : "default"}
        />
        <Kpi
          label="Collected this month · AED"
          value={money(collectedThisMonth)}
          tone={collectedThisMonth > 0 ? "good" : "default"}
        />
      </div>

      {receivables.length === 0 ? (
        <div className="bg-(--card) border border-(--border) rounded-xl p-10 text-center">
          <p className="text-sm text-(--text-secondary)">
            Nothing to collect right now — every accepted quote is fully paid. 🎉
          </p>
        </div>
      ) : (
        <>
          <div
            className={`grid gap-6 mb-6 ${isManager ? "lg:grid-cols-2" : "lg:grid-cols-1"}`}
          >
            {/* Ageing buckets */}
            <Card title="Outstanding by age">
              <div className="space-y-3">
                {buckets.map((b) => (
                  <div key={b.label}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-(--text-secondary)">{b.label}</span>
                      <span className="text-(--text-muted)">
                        {b.count} · {money(b.amount)}
                      </span>
                    </div>
                    <div className="h-2.5 rounded-full bg-(--surface) overflow-hidden">
                      <div
                        className="h-full bg-(--accent) rounded-full"
                        style={{ width: `${(b.amount / maxBucket) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Outstanding by commercial — managers only */}
            {isManager && (
              <Card title="Outstanding by commercial">
                <div className="space-y-3">
                  {byCommercial.map((c) => (
                    <div key={c.name}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-(--text-secondary) font-medium">
                          {c.name}
                        </span>
                        <span className="text-(--text-muted)">
                          {c.count} · {money(c.amount)}
                        </span>
                      </div>
                      <div className="h-2.5 rounded-full bg-(--surface) overflow-hidden">
                        <div
                          className="h-full bg-(--accent) rounded-full"
                          style={{ width: `${(c.amount / maxCommercial) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Receivables list */}
          <div className="bg-(--card) border border-(--border) rounded-xl overflow-hidden">
            {/* Desktop table */}
            <table className="hidden sm:table w-full text-sm">
              <thead>
                <tr className="border-b border-(--border) text-left text-xs text-(--text-muted) uppercase tracking-wider">
                  <th className="px-5 py-3 font-medium">Client / Project</th>
                  <th className="px-5 py-3 font-medium">Document</th>
                  <th className="px-5 py-3 font-medium text-right">Balance</th>
                  <th className="px-5 py-3 font-medium text-right">Paid / Total</th>
                  <th className="px-5 py-3 font-medium text-center">Age</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {receivables.map((r) => (
                  <tr
                    key={r.quoteId}
                    className="border-b border-(--border) last:border-0 hover:bg-(--surface)/50 transition-colors"
                  >
                    <td className="px-5 py-3">
                      <Link
                        href={`/clients/${r.clientId}`}
                        className="font-medium text-(--text-primary) hover:text-(--accent)"
                      >
                        {r.clientName}
                      </Link>
                      <div className="text-xs text-(--text-muted)">
                        {r.projectName} · {r.assignedTo}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <Link
                        href={`/quotes/${r.quoteId}${r.invoiceNumber ? "?doc=invoice" : ""}`}
                        className="text-(--text-secondary) hover:text-(--accent) font-mono text-xs"
                      >
                        {r.invoiceNumber || r.number}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-(--text-primary)">
                      {money(r.balance)}
                    </td>
                    <td className="px-5 py-3 text-right text-xs text-(--text-muted) whitespace-nowrap">
                      {money(r.paid)} / {money(r.total)}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <AgeBadge days={r.ageDays} />
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end">
                        <WhatsApp phone={r.clientPhone} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-(--border)">
              {receivables.map((r) => (
                <div key={r.quoteId} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/clients/${r.clientId}`}
                        className="font-medium text-(--text-primary)"
                      >
                        {r.clientName}
                      </Link>
                      <div className="text-xs text-(--text-muted) truncate">
                        {r.projectName} · {r.assignedTo}
                      </div>
                    </div>
                    <AgeBadge days={r.ageDays} />
                  </div>
                  <div className="mt-2 flex items-end justify-between">
                    <div>
                      <p className="text-lg font-bold text-(--text-primary)">
                        {money(r.balance)}
                      </p>
                      <p className="text-xs text-(--text-muted)">
                        {money(r.paid)} paid of {money(r.total)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/quotes/${r.quoteId}${r.invoiceNumber ? "?doc=invoice" : ""}`}
                        className="text-xs font-mono text-(--text-secondary) underline"
                      >
                        {r.invoiceNumber || r.number}
                      </Link>
                      <WhatsApp phone={r.clientPhone} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
