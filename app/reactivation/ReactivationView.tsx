"use client";

import { useState } from "react";
import Link from "next/link";
import type { ClientValue } from "@/lib/db";

// A client with no live project and untouched for this many days is "dormant"
// — a candidate to re-engage.
const DORMANT_DAYS = 90;

function money(n: number) {
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function agoLabel(days: number) {
  if (days >= 99999) return "never";
  if (days <= 0) return "today";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.round(days / 30)}mo ago`;
  return `${(days / 365).toFixed(1)}y ago`;
}

function isDormant(c: ClientValue) {
  return c.activeCount === 0 && c.daysSinceActivity > DORMANT_DAYS;
}

function WhatsApp({ phone, name }: { phone: string; name: string }) {
  if (!phone.trim()) return null;
  const text = encodeURIComponent(
    `Hi ${name.split(" ")[0] || ""}, this is Servian Contracting. It's been a while — is there anything we can help you with on your property?`
  );
  return (
    <a
      href={`https://wa.me/${phone.replace(/[^0-9]/g, "")}?text=${text}`}
      target="_blank"
      rel="noopener noreferrer"
      title="WhatsApp"
      className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
      onClick={(e) => e.stopPropagation()}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.29.173-1.414-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885M20.52 3.449C18.24 1.245 15.24.044 12.045.044 5.463.044.104 5.4.101 11.986c0 2.096.549 4.14 1.595 5.945L0 24l6.335-1.652a11.96 11.96 0 005.71 1.454h.006c6.585 0 11.946-5.357 11.949-11.945a11.9 11.9 0 00-3.481-8.418" />
      </svg>
    </a>
  );
}

type Filter = "all" | "active" | "reactivate";
type Sort = "value" | "dormant";

function Kpi({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "good" | "warn" }) {
  const color =
    tone === "good"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "warn"
        ? "text-amber-600 dark:text-amber-400"
        : "text-(--text-primary)";
  return (
    <div className="bg-(--card) border border-(--border) rounded-xl p-3 sm:p-5">
      <p className="text-[10px] sm:text-xs font-medium text-(--text-muted) uppercase tracking-widest mb-1">
        {label}
      </p>
      <p className={`text-lg sm:text-2xl font-bold truncate ${color}`}>{value}</p>
    </div>
  );
}

export function ReactivationView({ clients, isManager }: { clients: ClientValue[]; isManager: boolean }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("value");

  const lifetimeRevenue = clients.reduce((s, c) => s + c.totalSpent, 0);
  const activeClients = clients.filter((c) => c.activeCount > 0).length;
  const dormant = clients.filter(isDormant);

  const filtered = clients
    .filter((c) => {
      if (filter === "active") return c.activeCount > 0;
      if (filter === "reactivate") return isDormant(c);
      return true;
    })
    .sort((a, b) =>
      sort === "value" ? b.totalSpent - a.totalSpent : b.daysSinceActivity - a.daysSinceActivity
    );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-(--text-primary) tracking-tight">
          Client value &amp; reactivation
        </h1>
        <p className="mt-1 text-sm text-(--text-secondary)">
          How much each client has spent over time and how long since their last activity —
          spot your best clients and the dormant ones worth re-engaging.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Kpi label="Clients" value={String(clients.length)} />
        <Kpi label="Lifetime revenue · AED" value={money(lifetimeRevenue)} tone="good" />
        <Kpi label="Active clients" value={String(activeClients)} />
        <Kpi
          label={`Dormant >${DORMANT_DAYS}d`}
          value={String(dormant.length)}
          tone={dormant.length > 0 ? "warn" : "default"}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {(["all", "active", "reactivate"] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
              filter === f
                ? "bg-(--accent) text-white dark:text-black"
                : "bg-(--surface) border border-(--border) text-(--text-secondary) hover:text-(--text-primary)"
            }`}
          >
            {f === "all" ? "All" : f === "active" ? "Active" : "To reactivate"}
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-(--border)" />
        <button
          type="button"
          onClick={() => setSort(sort === "value" ? "dormant" : "value")}
          className="px-3 py-1 rounded-full text-xs font-semibold bg-(--surface) border border-(--border) text-(--text-secondary) hover:text-(--text-primary) transition-colors"
        >
          Sort: {sort === "value" ? "Most spent" : "Most dormant"}
        </button>
        <span className="text-xs text-(--text-muted)">
          {filtered.length} of {clients.length}
        </span>
      </div>

      {/* List */}
      <div className="bg-(--card) border border-(--border) rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-(--text-muted)">
            No clients in this view.
          </div>
        ) : (
          <>
            <table className="hidden sm:table w-full text-sm">
              <thead>
                <tr className="border-b border-(--border) text-left text-xs text-(--text-muted) uppercase tracking-wider">
                  <th className="px-5 py-3 font-medium">Client</th>
                  <th className="px-5 py-3 font-medium text-right">Total spent</th>
                  <th className="px-5 py-3 font-medium text-center">Projects</th>
                  <th className="px-5 py-3 font-medium text-right">Last activity</th>
                  <th className="px-5 py-3 font-medium text-right">Reach out</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const dorm = isDormant(c);
                  return (
                    <tr
                      key={c.clientId}
                      className="border-b border-(--border) last:border-0 hover:bg-(--surface)/50 transition-colors"
                    >
                      <td className="px-5 py-3">
                        <Link
                          href={`/clients/${c.clientId}`}
                          className="font-medium text-(--text-primary) hover:text-(--accent)"
                        >
                          {c.clientName}
                        </Link>
                        <div className="text-xs text-(--text-muted)">
                          {c.assignedTo}
                          {dorm && (
                            <span className="ml-2 inline-block px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                              dormant
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-(--text-primary)">
                        {c.totalSpent > 0 ? money(c.totalSpent) : "—"}
                      </td>
                      <td className="px-5 py-3 text-center text-xs text-(--text-secondary) whitespace-nowrap">
                        {c.projectCount === 0 ? (
                          <span className="text-(--text-muted)">lead</span>
                        ) : (
                          <>
                            {c.projectCount} total
                            {c.activeCount > 0 && (
                              <span className="text-emerald-600 dark:text-emerald-400">
                                {" "}
                                · {c.activeCount} active
                              </span>
                            )}
                          </>
                        )}
                      </td>
                      <td
                        className={`px-5 py-3 text-right whitespace-nowrap ${
                          dorm ? "text-amber-600 dark:text-amber-400 font-medium" : "text-(--text-muted)"
                        }`}
                      >
                        {agoLabel(c.daysSinceActivity)}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end">
                          <WhatsApp phone={c.clientPhone} name={c.clientName} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="sm:hidden divide-y divide-(--border)">
              {filtered.map((c) => {
                const dorm = isDormant(c);
                return (
                  <div key={c.clientId} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          href={`/clients/${c.clientId}`}
                          className="font-medium text-(--text-primary)"
                        >
                          {c.clientName}
                        </Link>
                        <div className="text-xs text-(--text-muted)">
                          {c.assignedTo}
                          {dorm && (
                            <span className="ml-2 inline-block px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                              dormant
                            </span>
                          )}
                        </div>
                      </div>
                      <WhatsApp phone={c.clientPhone} name={c.clientName} />
                    </div>
                    <div className="mt-2 flex items-end justify-between">
                      <div>
                        <p className="text-lg font-bold text-(--text-primary)">
                          {c.totalSpent > 0 ? money(c.totalSpent) : "—"}
                        </p>
                        <p className="text-xs text-(--text-muted)">
                          {c.projectCount === 0
                            ? "lead · no projects"
                            : `${c.projectCount} project${c.projectCount > 1 ? "s" : ""}${
                                c.activeCount > 0 ? ` · ${c.activeCount} active` : ""
                              }`}
                        </p>
                      </div>
                      <p
                        className={`text-xs ${
                          dorm ? "text-amber-600 dark:text-amber-400 font-medium" : "text-(--text-muted)"
                        }`}
                      >
                        {agoLabel(c.daysSinceActivity)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {!isManager && (
        <p className="mt-4 text-xs text-(--text-muted)">
          Showing your clients only.
        </p>
      )}
    </div>
  );
}
