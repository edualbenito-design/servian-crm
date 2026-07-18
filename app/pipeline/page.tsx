import Link from "next/link";
import { getClients, getColdDeals } from "@/lib/db";
import { getCurrentProfile } from "@/lib/auth";
import { KanbanBoard, type BoardColumns } from "./KanbanBoard";
import type { Client } from "@/lib/data";
import { openIdleDays } from "@/lib/data";

function buildInitialColumns(data: Client[]): BoardColumns {
  const columns: BoardColumns = {};
  for (let s = 1; s <= 9; s++) columns[String(s)] = [];

  const now = new Date();
  for (const client of data) {
    // A deal's "month" = when the client was captured (creation as fallback).
    const capturedMonth = (client.capturedAt ?? client.createdAt ?? "").slice(0, 7);
    for (const project of client.projects) {
      columns[String(project.pipelineStage)].push({
        projectId: project.id,
        projectName: project.name,
        budget: project.budget,
        clientId: client.id,
        clientName: client.name,
        propertyType: client.propertyType,
        assignedTo: client.assignedTo,
        capturedMonth,
        // Days adrift: open funnel, no pending follow-up, no forward move.
        // null = actively worked or already resolved.
        idleDays: openIdleDays(project, now),
      });
    }
  }

  return columns;
}

export default async function PipelinePage() {
  const profile = await getCurrentProfile();
  const scope = profile?.isManager ? undefined : profile?.name;
  const [clients, coldGroups] = await Promise.all([
    getClients(scope),
    getColdDeals(scope),
  ]);
  const initialColumns = buildInitialColumns(clients);
  const coldCount = coldGroups.reduce((n, g) => n + g.deals.length, 0);

  return (
    <div className="flex flex-col">
      {/* Page header */}
      <div className="max-w-7xl mx-auto w-full px-6 pt-10 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-(--text-primary) tracking-tight">
              Pipeline
            </h1>
            <Link
              href="/pipeline/cleanup"
              className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
                coldCount > 0
                  ? "border-red-300 text-red-600 bg-red-50 hover:bg-red-100 dark:border-red-800/60 dark:text-red-300 dark:bg-red-900/20 dark:hover:bg-red-900/40"
                  : "border-(--border) text-(--text-muted) hover:text-(--text-primary)"
              }`}
            >
              Cleanup
              {coldCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold">
                  {coldCount}
                </span>
              )}
            </Link>
          </div>
          <div className="flex items-center gap-3 text-xs text-(--text-muted) flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-500" />
              In funnel
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Won
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              Lost
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-zinc-500" />
              Ghosting
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Kanban board (stats + month filter live inside) */}
      <KanbanBoard initialColumns={initialColumns} />
    </div>
  );
}
