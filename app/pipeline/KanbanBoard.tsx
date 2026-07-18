"use client";

import { useState } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { useRouter } from "next/navigation";
import {
  PIPELINE_STAGES,
  type PipelineStage,
  type PropertyType,
  type Salesperson,
} from "@/lib/data";
import { updatePipelineStage } from "@/app/actions";

// ─── types ───────────────────────────────────────────────────────────────────

export type CardEntry = {
  projectId: string;
  projectName: string;
  budget: number;
  clientId: string;
  clientName: string;
  propertyType: PropertyType;
  assignedTo: Salesperson;
  // Open deal (stage 1–7) with no pending follow-up → nothing scheduled next.
  needsNextStep: boolean;
};

export type BoardColumns = Record<string, CardEntry[]>;

// ─── style maps ──────────────────────────────────────────────────────────────

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

const stageTopBorder: Record<PipelineStage, string> = {
  1: "border-t-zinc-500",
  2: "border-t-sky-600",
  3: "border-t-sky-400",
  4: "border-t-blue-500",
  5: "border-t-amber-500",
  6: "border-t-emerald-500",
  7: "border-t-emerald-600",
  8: "border-t-red-500",
  9: "border-t-zinc-500",
};

const stageHeaderColor: Record<PipelineStage, string> = {
  1: "text-zinc-600 dark:text-zinc-400",
  2: "text-sky-600 dark:text-sky-400",
  3: "text-sky-500 dark:text-sky-300",
  4: "text-blue-600 dark:text-blue-400",
  5: "text-amber-600 dark:text-amber-500",
  6: "text-emerald-600 dark:text-emerald-400",
  7: "text-emerald-700 dark:text-emerald-300",
  8: "text-red-600 dark:text-red-400",
  9: "text-zinc-500 dark:text-zinc-400",
};

const stageBadgeColor: Record<PipelineStage, string> = {
  1: "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  2: "bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-400",
  3: "bg-sky-100 text-sky-600 dark:bg-sky-900/60 dark:text-sky-300",
  4: "bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-400",
  5: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-500",
  6: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
  7: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300",
  8: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
  9: "bg-zinc-200 text-zinc-500 dark:bg-zinc-800/60 dark:text-zinc-500",
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

function salesInitials(name: Salesperson): string {
  if (name === "Unassigned") return "—";
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// ─── component ───────────────────────────────────────────────────────────────

interface KanbanBoardProps {
  initialColumns: BoardColumns;
}

export function KanbanBoard({ initialColumns }: KanbanBoardProps) {
  const [columns, setColumns] = useState<BoardColumns>(initialColumns);
  const router = useRouter();

  const stages = Array.from(
    { length: 9 },
    (_, i) => String(i + 1)
  );

  function onDragEnd(result: DropResult) {
    const { source, destination } = result;

    if (!destination) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    )
      return;

    let movedProjectId: string | null = null;

    setColumns((prev) => {
      const next = { ...prev };
      const srcCards = [...prev[source.droppableId]];
      const [moved] = srcCards.splice(source.index, 1);
      movedProjectId = moved.projectId;

      if (source.droppableId === destination.droppableId) {
        srcCards.splice(destination.index, 0, moved);
        next[source.droppableId] = srcCards;
      } else {
        const dstCards = [...prev[destination.droppableId]];
        dstCards.splice(destination.index, 0, moved);
        next[source.droppableId] = srcCards;
        next[destination.droppableId] = dstCards;
      }

      return next;
    });

    if (movedProjectId && source.droppableId !== destination.droppableId) {
      const stage = Number(destination.droppableId) as PipelineStage;
      updatePipelineStage(movedProjectId, stage);
    }
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="overflow-x-auto px-6 pb-10">
        <div className="flex gap-4" style={{ minWidth: "max-content" }}>
          {stages.map((stageId) => {
            const stage = Number(stageId) as PipelineStage;
            const stageName = PIPELINE_STAGES[stage];
            const cards = columns[stageId];
            const columnValue = cards.reduce((s, c) => s + c.budget, 0);

            return (
              <div
                key={stageId}
                className={`w-[272px] shrink-0 flex flex-col bg-(--card) border-t-2 border border-(--border) rounded-xl ${stageTopBorder[stage]}`}
              >
                {/* Column header */}
                <div className="px-4 pt-4 pb-3 border-b border-(--border)">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded ${stageBadgeColor[stage]}`}
                      >
                        {stage}
                      </span>
                      <h2
                        className={`text-xs font-semibold ${stageHeaderColor[stage]}`}
                      >
                        {stageName}
                      </h2>
                    </div>
                    <span className="text-xs font-medium text-(--text-muted) bg-(--surface) rounded-full px-2 py-0.5">
                      {cards.length}
                    </span>
                  </div>
                  {columnValue > 0 && (
                    <p className="text-[11px] font-mono text-(--text-muted)">
                      {formatCurrency(columnValue)}
                    </p>
                  )}
                </div>

                {/* Droppable card list */}
                <Droppable droppableId={stageId}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex flex-col gap-2.5 p-3 flex-1 min-h-[120px] rounded-b-xl transition-colors duration-150 ${
                        snapshot.isDraggingOver
                          ? "bg-(--accent)/[0.06]"
                          : ""
                      }`}
                    >
                      {cards.length === 0 && !snapshot.isDraggingOver && (
                        <div className="flex-1 flex items-center justify-center min-h-[72px]">
                          <p className="text-xs text-(--text-muted) italic select-none">
                            No projects
                          </p>
                        </div>
                      )}

                      {cards.map((card, index) => (
                        <Draggable
                          key={card.projectId}
                          draggableId={card.projectId}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              onClick={() =>
                                router.push(`/clients/${card.clientId}`)
                              }
                              className={`bg-(--surface) border border-(--border) rounded-lg p-3.5 cursor-pointer active:cursor-grabbing select-none transition-shadow ${
                                snapshot.isDragging
                                  ? "shadow-2xl shadow-black/70 border-(--accent)/50 ring-1 ring-(--accent)/30"
                                  : "hover:border-(--accent)/35 hover:shadow-md hover:shadow-black/30"
                              }`}
                            >
                              {/* Card header: client name */}
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <p className="text-[11px] font-medium text-(--text-muted) leading-tight">
                                  {card.clientName}
                                </p>
                                {card.needsNextStep && (
                                  <span
                                    title="No follow-up scheduled — add a next step"
                                    className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 whitespace-nowrap"
                                  >
                                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
                                    </svg>
                                    No next step
                                  </span>
                                )}
                              </div>

                              {/* Project name */}
                              <p className="text-sm font-semibold text-(--text-primary) leading-snug mb-3">
                                {card.projectName}
                              </p>

                              {/* Budget + property badge */}
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-bold font-mono text-(--accent)">
                                  {formatCurrency(card.budget)}
                                </span>
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${propertyTypeColor[card.propertyType]}`}
                                >
                                  {propertyTypeLabel[card.propertyType]}
                                </span>
                              </div>

                              {/* Assignee */}
                              <div className="mt-2.5 pt-2.5 border-t border-(--border) flex items-center gap-1.5">
                                <div
                                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0 select-none ${salesAvatarColor[card.assignedTo]}`}
                                >
                                  {salesInitials(card.assignedTo)}
                                </div>
                                <span className="text-[10px] text-(--text-muted) truncate">
                                  {card.assignedTo}
                                </span>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}

                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </div>
    </DragDropContext>
  );
}
