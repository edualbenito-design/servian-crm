"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ColdMonthGroup } from "@/lib/db";
import { LOST_STAGE, GHOSTING_STAGE } from "@/lib/data";
import { updatePipelineStage, addFollowUp } from "@/app/actions";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, (m || 1) - 1, 1);
  return d.toLocaleDateString("en-AE", { month: "long", year: "numeric" });
}

// Default reactivation date: one week out.
function inAWeek(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

interface CleanupViewProps {
  groups: ColdMonthGroup[];
}

export function CleanupView({ groups: initialGroups }: CleanupViewProps) {
  const [groups, setGroups] = useState<ColdMonthGroup[]>(initialGroups);
  const [busy, setBusy] = useState<string | null>(null); // projectId being acted on
  const [reactivating, setReactivating] = useState<string | null>(null); // projectId
  const [date, setDate] = useState(inAWeek());
  const [note, setNote] = useState("");
  const router = useRouter();

  // Drop a resolved deal from the list (and its month group if now empty).
  function removeDeal(projectId: string) {
    setGroups((prev) =>
      prev
        .map((g) => ({ ...g, deals: g.deals.filter((d) => d.projectId !== projectId) }))
        .filter((g) => g.deals.length > 0)
    );
  }

  async function sendToStage(projectId: string, stage: number, label: string) {
    if (!confirm(`Move this deal to ${label}?`)) return;
    setBusy(projectId);
    try {
      await updatePipelineStage(projectId, stage as 8 | 9);
      removeDeal(projectId);
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not update the deal.");
    } finally {
      setBusy(null);
    }
  }

  async function reactivate(clientId: string, projectId: string) {
    if (!date) return;
    setBusy(projectId);
    try {
      await addFollowUp(clientId, projectId, date, note);
      setReactivating(null);
      setNote("");
      setDate(inAWeek());
      removeDeal(projectId);
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not schedule the follow-up.");
    } finally {
      setBusy(null);
    }
  }

  const total = groups.reduce((n, g) => n + g.deals.length, 0);

  if (total === 0) {
    return (
      <div className="max-w-3xl mx-auto w-full px-6 py-16 text-center">
        <p className="text-4xl mb-3">✨</p>
        <p className="text-lg font-semibold text-(--text-primary)">
          Nothing to clean up
        </p>
        <p className="mt-1 text-sm text-(--text-secondary)">
          Every open deal is either being worked or already resolved. Nice.
        </p>
        <Link
          href="/pipeline"
          className="inline-block mt-6 text-sm font-medium text-(--accent) hover:underline"
        >
          ← Back to Pipeline
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto w-full px-6 pb-16 flex flex-col gap-8">
      {groups.map((group) => (
        <section key={group.month}>
          <h2 className="text-sm font-semibold text-(--text-secondary) mb-3 flex items-center gap-2">
            {monthLabel(group.month)}
            <span className="text-xs font-normal text-(--text-muted)">
              · {group.deals.length} cold deal{group.deals.length > 1 ? "s" : ""}
            </span>
          </h2>

          <div className="flex flex-col gap-3">
            {group.deals.map((deal) => {
              const isBusy = busy === deal.projectId;
              const isReactivating = reactivating === deal.projectId;
              return (
                <div
                  key={deal.projectId}
                  className="bg-(--card) border border-(--border) rounded-xl p-4"
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <Link
                        href={`/clients/${deal.clientId}`}
                        className="text-sm font-semibold text-(--text-primary) hover:text-(--accent) hover:underline"
                      >
                        {deal.projectName}
                      </Link>
                      <p className="text-xs text-(--text-muted) mt-0.5">
                        {deal.clientName} · {deal.assignedTo} ·{" "}
                        {formatCurrency(deal.budget)}
                      </p>
                    </div>
                    <span
                      title={`No activity for ${deal.idleDays} days`}
                      className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 whitespace-nowrap"
                    >
                      Cold · {deal.idleDays}d
                    </span>
                  </div>

                  {isReactivating ? (
                    <div className="mt-3 pt-3 border-t border-(--border) flex flex-col gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <input
                          type="date"
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                          className="text-sm rounded-lg border border-(--border) bg-(--surface) px-2.5 py-1.5 text-(--text-primary)"
                        />
                        <input
                          type="text"
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          placeholder="What's the next step?"
                          className="flex-1 min-w-[160px] text-sm rounded-lg border border-(--border) bg-(--surface) px-2.5 py-1.5 text-(--text-primary)"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => reactivate(deal.clientId, deal.projectId)}
                          disabled={isBusy || !date}
                          className="text-sm font-medium px-3 py-1.5 rounded-lg bg-(--accent) text-white dark:text-black disabled:opacity-50"
                        >
                          Schedule follow-up
                        </button>
                        <button
                          onClick={() => setReactivating(null)}
                          disabled={isBusy}
                          className="text-sm text-(--text-muted) hover:text-(--text-primary)"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 pt-3 border-t border-(--border) flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => {
                          setReactivating(deal.projectId);
                          setDate(inAWeek());
                          setNote("");
                        }}
                        disabled={isBusy}
                        className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-(--border) text-(--text-primary) hover:border-(--accent)/50 disabled:opacity-50"
                      >
                        ↻ Reactivate
                      </button>
                      <button
                        onClick={() => sendToStage(deal.projectId, GHOSTING_STAGE, "Ghosting")}
                        disabled={isBusy}
                        className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-(--border) text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50"
                      >
                        → Ghosting
                      </button>
                      <button
                        onClick={() => sendToStage(deal.projectId, LOST_STAGE, "Lost")}
                        disabled={isBusy}
                        className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-(--border) text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                      >
                        → Lost
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
