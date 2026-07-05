import { getClients } from "@/lib/db";
import { getCurrentProfile } from "@/lib/auth";
import { KanbanBoard, type BoardColumns } from "./KanbanBoard";
import type { Client } from "@/lib/data";

function buildInitialColumns(data: Client[]): BoardColumns {
  const columns: BoardColumns = {};
  for (let s = 1; s <= 8; s++) columns[String(s)] = [];

  for (const client of data) {
    for (const project of client.projects) {
      columns[String(project.pipelineStage)].push({
        projectId: project.id,
        projectName: project.name,
        budget: project.budget,
        clientId: client.id,
        clientName: client.name,
        propertyType: client.propertyType,
        assignedTo: client.assignedTo,
      });
    }
  }

  return columns;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default async function PipelinePage() {
  const profile = await getCurrentProfile();
  const clients = await getClients(
    profile?.isManager ? undefined : profile?.name
  );
  const initialColumns = buildInitialColumns(clients);

  const totalProjects = clients.reduce((n, c) => n + c.projects.length, 0);
  const totalPipelineValue = clients.reduce(
    (sum, c) => sum + c.projects.reduce((s, p) => s + p.budget, 0),
    0
  );

  return (
    <div className="flex flex-col">
      {/* Page header */}
      <div className="max-w-7xl mx-auto w-full px-6 pt-10 pb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-(--text-primary) tracking-tight">
              Pipeline
            </h1>
            <p className="mt-1 text-sm text-(--text-secondary)">
              {totalProjects} projects &middot;{" "}
              {formatCurrency(totalPipelineValue)} total pipeline value
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-(--text-muted)">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-500" />
              Prospecting
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Quoting
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Confirmed
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-zinc-500" />
              Completed
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Kanban board */}
      <KanbanBoard initialColumns={initialColumns} />
    </div>
  );
}
