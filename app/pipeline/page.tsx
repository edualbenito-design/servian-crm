import { getClients } from "@/lib/db";
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
  const clients = await getClients(
    profile?.isManager ? undefined : profile?.name
  );
  const initialColumns = buildInitialColumns(clients);

  return (
    <div className="flex flex-col">
      {/* Page header */}
      <div className="max-w-7xl mx-auto w-full px-6 pt-10 pb-4">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold text-(--text-primary) tracking-tight">
            Pipeline
          </h1>
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
