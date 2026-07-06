"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  SALESPEOPLE,
  followUpState,
  type Client,
  type PropertyType,
  type LeadSource,
  type Salesperson,
} from "@/lib/data";

// ─── style maps ───────────────────────────────────────────────────────────────

const propertyTypeLabel: Record<PropertyType, string> = {
  villa: "Villa",
  apartment: "Apartment",
  office: "Office",
  other: "Other",
};

const propertyTypeColor: Record<PropertyType, string> = {
  villa:
    "bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-400 dark:border-emerald-800/60",
  apartment:
    "bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/50 dark:text-blue-400 dark:border-blue-800/60",
  office:
    "bg-violet-100 text-violet-700 border border-violet-200 dark:bg-violet-900/50 dark:text-violet-400 dark:border-violet-800/60",
  other:
    "bg-zinc-100 text-zinc-600 border border-zinc-200 dark:bg-zinc-800/60 dark:text-zinc-400 dark:border-zinc-700/60",
};

const leadSourceLabel: Record<LeadSource, string> = {
  referral: "Referral",
  instagram: "Instagram",
  other: "Other",
};

const leadSourceColor: Record<LeadSource, string> = {
  referral:
    "bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/40 dark:text-amber-400 dark:border-amber-800/50",
  instagram:
    "bg-pink-100 text-pink-700 border border-pink-200 dark:bg-pink-900/40 dark:text-pink-400 dark:border-pink-800/50",
  other:
    "bg-zinc-100 text-zinc-600 border border-zinc-200 dark:bg-zinc-800/60 dark:text-zinc-400 dark:border-zinc-700/60",
};

const salesAvatarColor: Record<Salesperson, string> = {
  Joana: "bg-indigo-200 text-indigo-800 dark:bg-indigo-800 dark:text-indigo-200",
  Alfie: "bg-teal-200 text-teal-800 dark:bg-teal-800 dark:text-teal-200",
  Elsayed: "bg-rose-200 text-rose-800 dark:bg-rose-800 dark:text-rose-200",
  Faizan: "bg-amber-200 text-amber-800 dark:bg-amber-800 dark:text-amber-200",
  Eduardo: "bg-sky-200 text-sky-800 dark:bg-sky-800 dark:text-sky-200",
  Sergio: "bg-fuchsia-200 text-fuchsia-800 dark:bg-fuchsia-800 dark:text-fuchsia-200",
  Unassigned: "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400",
};

// ─── helpers ─────────────────────────────────────────────────────────────────

function salesInitials(name: Salesperson): string {
  if (name === "Unassigned") return "—";
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");
}

function activeProjectCount(client: Client) {
  return client.projects.filter((p) => p.status === "active").length;
}

function clientBudget(client: Client) {
  return client.projects.reduce((s, p) => s + p.budget, 0);
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// ─── component ────────────────────────────────────────────────────────────────

function monthKey(dateStr?: string): string {
  return dateStr ? dateStr.slice(0, 7) : ""; // YYYY-MM
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString("en-AE", { month: "long", year: "numeric" });
}

export function ClientsTable({ clients }: { clients: Client[] }) {
  const router = useRouter();
  const [filterBy, setFilterBy] = useState<Salesperson | "">("");
  const [monthBy, setMonthBy] = useState<string>("");
  const [search, setSearch] = useState("");
  const [dueOnly, setDueOnly] = useState(false);

  const isDue = (c: Client) => {
    const s = followUpState(c.nextFollowUp);
    return s === "overdue" || s === "today";
  };
  const dueCount = clients.filter(isDue).length;

  // Month a client belongs to: capture date, or creation date as fallback.
  const clientMonth = (c: Client) => monthKey(c.capturedAt ?? c.createdAt);

  // Distinct months present in the data (newest first).
  const months = Array.from(
    new Set(clients.map(clientMonth).filter(Boolean))
  ).sort((a, b) => b.localeCompare(a));

  const q = search.trim().toLowerCase();
  const filtered = clients.filter((c) => {
    if (filterBy && c.assignedTo !== filterBy) return false;
    if (monthBy && clientMonth(c) !== monthBy) return false;
    if (dueOnly && !isDue(c)) return false;
    if (q) {
      const haystack = `${c.name} ${c.phone} ${c.email} ${c.location} ${c.assignedTo} ${c.renovationType ?? ""}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  const totalActiveProjects = filtered.reduce(
    (n, c) => n + activeProjectCount(c),
    0
  );
  const totalPortfolio = filtered.reduce((s, c) => s + clientBudget(c), 0);

  return (
    <>
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6 sm:mb-8">
        <div className="bg-(--card) border border-(--border) rounded-xl p-3 sm:p-5">
          <p className="text-[10px] sm:text-xs font-medium text-(--text-muted) uppercase tracking-widest mb-1">
            {filterBy ? "Filtered" : "Clients"}
          </p>
          <p className="text-xl sm:text-3xl font-bold text-(--text-primary)">
            {filtered.length}
          </p>
        </div>
        <div className="bg-(--card) border border-(--border) rounded-xl p-3 sm:p-5">
          <p className="text-[10px] sm:text-xs font-medium text-(--text-muted) uppercase tracking-widest mb-1">
            Active
          </p>
          <p className="text-xl sm:text-3xl font-bold text-(--text-primary)">
            {totalActiveProjects}
          </p>
        </div>
        <div className="bg-(--card) border border-(--border) rounded-xl p-3 sm:p-5">
          <p className="text-[10px] sm:text-xs font-medium text-(--text-muted) uppercase tracking-widest mb-1">
            Portfolio
          </p>
          <p className="text-sm sm:text-3xl font-bold text-(--text-primary) truncate">
            {formatCurrency(totalPortfolio)}
          </p>
        </div>
      </div>

      {/* Client table */}
      <div className="bg-(--card) border border-(--border) rounded-xl overflow-hidden">
        {/* Table toolbar */}
        <div className="px-4 sm:px-6 py-4 border-b border-(--border) flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3 shrink-0">
            <h2 className="text-sm font-semibold text-(--text-primary)">
              All Clients
            </h2>
            <span className="text-xs text-(--text-muted)">
              {filtered.length}{" "}
              {filtered.length === clients.length
                ? "records"
                : `of ${clients.length}`}
            </span>
          </div>

          {/* Search */}
          <div className="relative flex-1 sm:max-w-xs sm:order-2">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-(--text-muted)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, phone, location…"
              className="w-full bg-(--surface) border border-(--border) rounded-lg pl-9 pr-3 py-1.5 text-sm text-(--text-primary) placeholder:text-(--text-muted) focus:outline-none focus:border-(--accent)/50 focus:ring-1 focus:ring-(--accent)/20 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 sm:order-1">
            {/* Follow-up due filter */}
            {dueCount > 0 && (
              <button
                type="button"
                onClick={() => setDueOnly((v) => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  dueOnly
                    ? "bg-amber-500 text-black"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/60"
                }`}
                title="Clients to follow up (overdue or due today)"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
                Due {dueCount}
              </button>
            )}
            {/* Month filter */}
            {months.length > 0 && (
              <div className="relative">
                <select
                  value={monthBy}
                  onChange={(e) => setMonthBy(e.target.value)}
                  className="appearance-none bg-(--surface) border border-(--border) rounded-lg pl-3 pr-8 py-1.5 text-xs font-medium text-(--text-secondary) focus:outline-none focus:border-(--accent)/50 focus:ring-1 focus:ring-(--accent)/20 transition-colors cursor-pointer"
                >
                  <option value="">All Months</option>
                  {months.map((m) => (
                    <option key={m} value={m}>
                      {monthLabel(m)}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-(--text-muted)">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </div>
              </div>
            )}

            {/* Salesperson filter */}
            <div className="relative">
              <select
                value={filterBy}
                onChange={(e) =>
                  setFilterBy(e.target.value as Salesperson | "")
                }
                className="appearance-none bg-(--surface) border border-(--border) rounded-lg pl-3 pr-8 py-1.5 text-xs font-medium text-(--text-secondary) focus:outline-none focus:border-(--accent)/50 focus:ring-1 focus:ring-(--accent)/20 transition-colors cursor-pointer"
              >
                <option value="">All Salespeople</option>
                {SALESPEOPLE.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-(--text-muted)">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div>
          {filtered.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm text-(--text-muted)">
                No clients found for this filter.
              </p>
              <button
                type="button"
                onClick={() => {
                  setFilterBy("");
                  setMonthBy("");
                }}
                className="mt-2 text-sm text-(--accent) hover:underline underline-offset-2"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <>
            {/* Mobile: card list */}
            <div className="sm:hidden divide-y divide-(--border)">
              {filtered.map((client) => (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => router.push(`/clients/${client.id}`)}
                  className="w-full text-left px-4 py-4 flex flex-col gap-2 active:bg-(--surface)/60 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center text-sm font-bold text-white shrink-0 select-none">
                      {client.name
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-(--text-primary) truncate flex items-center gap-1.5">
                        {client.name}
                        {isDue(client) && (
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              followUpState(client.nextFollowUp) === "overdue"
                                ? "bg-red-500"
                                : "bg-amber-500"
                            }`}
                            title="Follow-up due"
                          />
                        )}
                      </p>
                      <p className="text-xs text-(--text-muted) truncate">
                        {client.phone} · {client.location}
                      </p>
                    </div>
                    <span className="font-mono text-xs font-bold text-(--accent) shrink-0">
                      {formatCurrency(clientBudget(client))}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap pl-12">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${propertyTypeColor[client.propertyType]}`}
                    >
                      {propertyTypeLabel[client.propertyType]}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${leadSourceColor[client.leadSource]}`}
                    >
                      {leadSourceLabel[client.leadSource]}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-(--surface) border border-(--border) text-(--text-secondary)">
                      <span
                        className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold ${salesAvatarColor[client.assignedTo]}`}
                      >
                        {salesInitials(client.assignedTo)}
                      </span>
                      {client.assignedTo}
                    </span>
                    {activeProjectCount(client) > 0 && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                        {activeProjectCount(client)} active
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Desktop: table */}
            <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-(--border) bg-(--surface)">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-(--text-muted) uppercase tracking-wider">
                    Client
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-(--text-muted) uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-(--text-muted) uppercase tracking-wider">
                    Location
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-(--text-muted) uppercase tracking-wider">
                    Property
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-(--text-muted) uppercase tracking-wider">
                    Lead Source
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-(--text-muted) uppercase tracking-wider">
                    Assigned To
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-(--text-muted) uppercase tracking-wider">
                    Projects
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-(--text-muted) uppercase tracking-wider">
                    Portfolio
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((client, i) => (
                  <tr
                    key={client.id}
                    onClick={() => router.push(`/clients/${client.id}`)}
                    className={`border-b border-(--border) last:border-0 hover:bg-(--surface)/60 transition-colors cursor-pointer ${
                      i % 2 === 1 ? "bg-(--surface)/20" : ""
                    }`}
                  >
                    {/* Name + avatar */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center text-sm font-bold text-white shrink-0 select-none">
                          {client.name
                            .split(" ")
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join("")}
                        </div>
                        <span className="font-medium text-(--text-primary) whitespace-nowrap flex items-center gap-1.5">
                          {client.name}
                          {isDue(client) && (
                            <span
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                followUpState(client.nextFollowUp) === "overdue"
                                  ? "bg-red-500"
                                  : "bg-amber-500"
                              }`}
                              title="Follow-up due"
                            />
                          )}
                        </span>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="px-4 py-4">
                      <div className="space-y-0.5">
                        <p className="text-(--text-secondary) whitespace-nowrap">
                          {client.phone}
                        </p>
                        <p className="text-(--text-muted) text-xs whitespace-nowrap">
                          {client.email}
                        </p>
                      </div>
                    </td>

                    {/* Location */}
                    <td className="px-4 py-4">
                      <span className="text-(--text-secondary) whitespace-nowrap">
                        {client.location}
                      </span>
                    </td>

                    {/* Property type */}
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${propertyTypeColor[client.propertyType]}`}
                      >
                        {propertyTypeLabel[client.propertyType]}
                      </span>
                    </td>

                    {/* Lead source */}
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${leadSourceColor[client.leadSource]}`}
                      >
                        {leadSourceLabel[client.leadSource]}
                      </span>
                    </td>

                    {/* Assigned To */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 select-none ${salesAvatarColor[client.assignedTo]}`}
                        >
                          {salesInitials(client.assignedTo)}
                        </div>
                        <span
                          className={
                            client.assignedTo === "Unassigned"
                              ? "text-(--text-muted) text-xs"
                              : "text-(--text-secondary) text-xs"
                          }
                        >
                          {client.assignedTo}
                        </span>
                      </div>
                    </td>

                    {/* Projects */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5">
                        <span className="text-(--text-primary) font-medium">
                          {client.projects.length}
                        </span>
                        {activeProjectCount(client) > 0 && (
                          <span className="flex items-center gap-1 text-xs text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                            {activeProjectCount(client)} active
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Portfolio */}
                    <td className="px-4 py-4">
                      <span className="font-mono text-(--text-secondary) text-xs">
                        {formatCurrency(clientBudget(client))}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="px-4 py-4">
                      <Link
                        href={`/clients/${client.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-(--accent) border border-(--accent)/30 hover:bg-(--accent)/10 transition-colors whitespace-nowrap"
                      >
                        View
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
