"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  PIPELINE_STAGES,
  SALESPEOPLE,
  CAPTURERS,
  type Client,
  type Project,
  type Activity,
  type ActivityType,
  type PropertyType,
  type LeadSource,
  type ProjectStatus,
  type PipelineStage,
  type Salesperson,
} from "@/lib/data";
import { updateClient, createProject, updateProject, addNote, addProjectNote, setProjectApproval } from "@/app/actions";

// ─── form types ───────────────────────────────────────────────────────────────

type ClientForm = {
  name: string;
  phone: string;
  email: string;
  location: string;
  propertyType: PropertyType;
  leadSource: LeadSource;
  assignedTo: Salesperson;
  capturedBy: string;
  capturedAt: string;
  notes: string;
};

type ProjectForm = {
  name: string;
  description: string;
  budget: string;
  status: ProjectStatus;
  pipelineStage: string;
  startDate: string;
  endDate: string;
  contractor: string;
  teamMembers: string;
  suppliers: string;
};

type ProjectModal =
  | { mode: "add" }
  | { mode: "edit"; projectId: string }
  | null;

// ─── constants ────────────────────────────────────────────────────────────────

const INPUT =
  "w-full bg-(--surface) border border-(--border) rounded-lg px-3 py-2.5 text-sm text-(--text-primary) placeholder:text-(--text-muted) focus:outline-none focus:border-(--accent)/50 focus:ring-1 focus:ring-(--accent)/20 transition-colors";

const LABEL = "block text-xs font-medium text-(--text-secondary) mb-1.5";

const EMPTY_PROJECT: ProjectForm = {
  name: "",
  description: "",
  budget: "",
  status: "active",
  pipelineStage: "1",
  startDate: new Date().toISOString().slice(0, 10),
  endDate: "",
  contractor: "",
  teamMembers: "",
  suppliers: "",
};

// ─── style maps ───────────────────────────────────────────────────────────────

const statusLabel: Record<ProjectStatus, string> = {
  active: "Active",
  completed: "Completed",
  "on-hold": "On Hold",
};

const statusStyle: Record<ProjectStatus, string> = {
  active:
    "bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-400 dark:border-emerald-800/60",
  completed:
    "bg-zinc-100 text-zinc-600 border border-zinc-200 dark:bg-zinc-800/60 dark:text-zinc-400 dark:border-zinc-700/60",
  "on-hold":
    "bg-yellow-100 text-yellow-700 border border-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-400 dark:border-yellow-800/50",
};

const statusDot: Record<ProjectStatus, string> = {
  active: "bg-emerald-400",
  completed: "bg-zinc-500",
  "on-hold": "bg-yellow-400",
};

const propertyTypeLabel: Record<PropertyType, string> = {
  villa: "Villa",
  apartment: "Apartment",
  office: "Office",
  other: "Other",
};

const leadSourceLabel: Record<LeadSource, string> = {
  referral: "Referral",
  instagram: "Instagram",
  other: "Other",
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(s: string) {
  return new Date(s).toLocaleDateString("en-AE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(s: string) {
  return new Date(s).toLocaleString("en-AE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── activity timeline styling ────────────────────────────────────────────────

const activityStyle: Record<ActivityType, { dot: string; label: string }> = {
  note: { dot: "bg-sky-400", label: "Note" },
  client_updated: { dot: "bg-violet-400", label: "Client Updated" },
  project_created: { dot: "bg-emerald-400", label: "Project Created" },
  project_updated: { dot: "bg-amber-400", label: "Project Updated" },
  stage_changed: { dot: "bg-blue-400", label: "Stage Changed" },
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

function toClientForm(c: Client): ClientForm {
  return {
    name: c.name,
    phone: c.phone,
    email: c.email,
    location: c.location,
    propertyType: c.propertyType,
    leadSource: c.leadSource,
    assignedTo: c.assignedTo,
    capturedBy: c.capturedBy ?? "",
    capturedAt: c.capturedAt ?? "",
    notes: c.notes ?? "",
  };
}

function parseLines(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

function parseSuppliers(text: string) {
  return parseLines(text).map((line) => {
    const parts = line.split(/\s*[—|\-–:]\s*/);
    return {
      name: parts[0]?.trim() ?? line,
      material: parts.slice(1).join(" ").trim(),
    };
  });
}

function toProjectForm(p: Project): ProjectForm {
  return {
    name: p.name,
    description: p.description,
    budget: String(p.budget),
    status: p.status,
    pipelineStage: String(p.pipelineStage),
    startDate: p.startDate,
    endDate: p.endDate ?? "",
    contractor: p.contractor ?? "",
    teamMembers: p.teamMembers.join("\n"),
    suppliers: p.suppliers
      .map((s) => (s.material ? `${s.name} — ${s.material}` : s.name))
      .join("\n"),
  };
}

// ─── shared sub-components ────────────────────────────────────────────────────

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  // Keep a stable ref so the keydown listener never goes stale
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeRef.current();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/65 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="relative z-10 bg-(--card) border border-(--border) rounded-2xl shadow-2xl shadow-black/60 w-full max-w-lg flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-(--border) shrink-0">
          <h2 className="text-sm font-semibold text-(--text-primary)">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-(--text-muted) hover:text-(--text-primary) hover:bg-(--accent)/10 transition-colors"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function Field({
  label,
  optional,
  children,
}: {
  label: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className={LABEL}>
        {label}
        {optional && (
          <span className="ml-1 text-(--text-muted) font-normal">
            (optional)
          </span>
        )}
      </label>
      {children}
    </div>
  );
}

function Sel({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${INPUT} pr-8 appearance-none cursor-pointer`}
      >
        {children}
      </select>
      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-(--text-muted)">
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>
    </div>
  );
}

function FormActions({
  onCancel,
  onSave,
  saveLabel,
}: {
  onCancel: () => void;
  onSave: () => void;
  saveLabel: string;
}) {
  return (
    <div className="flex items-center justify-end gap-3 mt-6 pt-5 border-t border-(--border)">
      <button
        type="button"
        onClick={onCancel}
        className="px-4 py-2 text-sm font-medium text-(--text-secondary) hover:text-(--text-primary) transition-colors"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onSave}
        className="px-5 py-2 rounded-lg bg-(--accent) text-white dark:text-black text-sm font-semibold hover:bg-amber-400 transition-colors"
      >
        {saveLabel}
      </button>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-(--surface) border border-(--border) flex items-center justify-center shrink-0 mt-0.5 text-(--text-muted)">
        {icon}
      </div>
      <div>
        <p className="text-xs text-(--text-muted)">{label}</p>
        <p className="text-sm text-(--text-primary) font-medium break-all">
          {value}
        </p>
      </div>
    </div>
  );
}

// ─── icons ────────────────────────────────────────────────────────────────────

const CheckIcon = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const PenIcon = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
  </svg>
);

const PlusIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 5v14M5 12h14" />
  </svg>
);

// ─── reusable history pieces ──────────────────────────────────────────────────

// Renders a vertical timeline of activity entries (newest first).
function Timeline({ activities }: { activities: Activity[] }) {
  if (activities.length === 0) {
    return (
      <p className="text-sm text-(--text-muted) py-2">
        No history yet.
      </p>
    );
  }
  return (
    <ul className="space-y-0">
      {activities.map((a, idx) => {
        const style = activityStyle[a.type];
        const isLast = idx === activities.length - 1;
        return (
          <li key={a.id} className="flex gap-3">
            <div className="flex flex-col items-center shrink-0">
              <div className={`w-2.5 h-2.5 rounded-full mt-1.5 ${style.dot}`} />
              {!isLast && <div className="w-px flex-1 bg-(--border) my-1" />}
            </div>
            <div className="pb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-(--text-muted) uppercase tracking-wider">
                  {style.label}
                </span>
                <span className="text-xs text-(--text-muted)">
                  {formatDateTime(a.createdAt)}
                </span>
              </div>
              <p className="text-sm text-(--text-secondary) mt-1 leading-relaxed">
                {a.description}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// A self-contained note input (own local state so multiple can coexist).
function NoteBox({
  onSubmit,
  placeholder,
}: {
  onSubmit: (text: string) => void;
  placeholder: string;
}) {
  const [text, setText] = useState("");
  function submit() {
    const t = text.trim();
    if (!t) return;
    onSubmit(t);
    setText("");
  }
  return (
    <div className="flex items-start gap-3">
      <textarea
        rows={2}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
        }}
        className={`${INPUT} resize-none`}
        placeholder={placeholder}
      />
      <button
        type="button"
        onClick={submit}
        disabled={!text.trim()}
        className="shrink-0 px-4 py-2.5 rounded-lg bg-(--accent) text-white dark:text-black text-sm font-semibold hover:bg-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Add
      </button>
    </div>
  );
}

// A single project row. Click the header to expand and see everything
// (description, dates, team, suppliers, history). "Edit" is only for changing.
function ProjectCard({
  project,
  isManager,
  onEdit,
  onAddNote,
  onToggleApproval,
}: {
  project: Project;
  isManager: boolean;
  onEdit: () => void;
  onAddNote: (text: string) => void;
  onToggleApproval: (approve: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="hover:bg-(--surface)/30 transition-colors">
      {/* Clickable header (always visible) */}
      <div
        onClick={() => setOpen((v) => !v)}
        className="px-6 py-4 flex items-center justify-between gap-4 cursor-pointer select-none"
      >
        <div className="flex items-center gap-3 min-w-0">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`shrink-0 text-(--text-muted) transition-transform ${open ? "rotate-90" : ""}`}
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
          <div
            className={`w-2 h-2 rounded-full shrink-0 ${statusDot[project.status]}`}
          />
          <h3 className="font-semibold text-(--text-primary) truncate">
            {project.name}
          </h3>
          {project.approved && (
            <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-800/50 shrink-0">
              <CheckIcon />
              Approved
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="hidden sm:inline text-sm font-bold text-(--accent) font-mono">
            {formatCurrency(project.budget)}
          </span>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyle[project.status]}`}
          >
            {statusLabel[project.status]}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-(--text-muted) border border-(--border) hover:border-(--accent)/40 hover:text-(--accent) hover:bg-(--accent)/5 transition-colors"
          >
            <PenIcon />
            Edit
          </button>
        </div>
      </div>

      {/* Expanded detail */}
      {open && (
        <div className="px-6 pb-6 pl-14">
          {/* Manager sign-off */}
          <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-(--border) bg-(--surface) px-4 py-3">
            {project.approved ? (
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 shrink-0">
                  <CheckIcon />
                </span>
                <p className="text-sm text-(--text-secondary) truncate">
                  Approved by{" "}
                  <span className="font-semibold text-(--text-primary)">
                    {project.approvedBy || "manager"}
                  </span>
                  {project.approvedAt && (
                    <span className="text-(--text-muted)">
                      {" "}
                      · {formatDate(project.approvedAt)}
                    </span>
                  )}
                </p>
              </div>
            ) : (
              <p className="text-sm text-(--text-muted)">
                Pending manager approval
              </p>
            )}

            {isManager &&
              (project.approved ? (
                <button
                  type="button"
                  onClick={() => onToggleApproval(false)}
                  className="shrink-0 px-3 py-1.5 rounded-md text-xs font-medium text-(--text-muted) border border-(--border) hover:text-(--text-primary) hover:border-(--accent)/40 transition-colors"
                >
                  Revoke
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onToggleApproval(true)}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
                >
                  <CheckIcon />
                  Approve
                </button>
              ))}
          </div>

          {/* Description */}
          <p className="text-sm text-(--text-secondary) leading-relaxed mb-4">
            {project.description || (
              <span className="italic text-(--text-muted)">No description.</span>
            )}
          </p>

          {/* Meta row */}
          <div className="flex items-center gap-6 flex-wrap">
            <div>
              <p className="text-xs text-(--text-muted)">Budget</p>
              <p className="text-sm font-bold text-(--accent) font-mono">
                {formatCurrency(project.budget)}
              </p>
            </div>
            <div>
              <p className="text-xs text-(--text-muted)">Start Date</p>
              <p className="text-sm text-(--text-secondary)">
                {formatDate(project.startDate)}
              </p>
            </div>
            <div>
              <p className="text-xs text-(--text-muted)">Pipeline Stage</p>
              <p className="text-sm text-(--text-secondary)">
                {project.pipelineStage}. {PIPELINE_STAGES[project.pipelineStage]}
              </p>
            </div>
            {project.endDate && (
              <div>
                <p className="text-xs text-(--text-muted)">Completed</p>
                <p className="text-sm text-(--text-secondary)">
                  {formatDate(project.endDate)}
                </p>
              </div>
            )}
          </div>

          {/* Team & suppliers */}
          <div className="mt-4 grid sm:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-(--text-muted) mb-1">Contractor</p>
              <p className="text-sm text-(--text-secondary)">
                {project.contractor || (
                  <span className="text-(--text-muted)">—</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-xs text-(--text-muted) mb-1">
                Team ({project.teamMembers.length})
              </p>
              {project.teamMembers.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {project.teamMembers.map((m, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-(--surface) border border-(--border) text-(--text-secondary)"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-sm text-(--text-muted)">—</span>
              )}
            </div>
            <div>
              <p className="text-xs text-(--text-muted) mb-1">Suppliers</p>
              {project.suppliers.length > 0 ? (
                <ul className="space-y-0.5">
                  {project.suppliers.map((s, i) => (
                    <li key={i} className="text-sm text-(--text-secondary)">
                      {s.name}
                      {s.material && (
                        <span className="text-(--text-muted)"> — {s.material}</span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-sm text-(--text-muted)">—</span>
              )}
            </div>
          </div>

          {/* History */}
          <div className="mt-6 border-t border-(--border) pt-4">
            <p className="text-xs font-semibold text-(--text-muted) uppercase tracking-widest mb-3">
              History ({project.activities.length})
            </p>
            <div className="space-y-4">
              <NoteBox
                onSubmit={onAddNote}
                placeholder="Add a note to this project… (e.g. Sent revised quote, awaiting reply)"
              />
              <Timeline activities={project.activities} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export function ClientDetail({
  initialClient,
  isManager,
}: {
  initialClient: Client;
  isManager: boolean;
}) {
  const [client, setClient] = useState<Client>(initialClient);

  // client edit modal
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [cf, setCf] = useState<ClientForm>(() => toClientForm(initialClient));

  // project modal (add | edit)
  const [projectModal, setProjectModal] = useState<ProjectModal>(null);
  const [pf, setPf] = useState<ProjectForm>(EMPTY_PROJECT);

  // client-level history (general notes + client changes)
  const [activities, setActivities] = useState<Activity[]>(
    initialClient.activities ?? []
  );

  // Build an optimistic activity entry.
  function makeActivity(
    type: ActivityType,
    description: string,
    projectId: string | null = null
  ): Activity {
    return {
      id: `optimistic_${Date.now()}_${Math.random()}`,
      type,
      description,
      createdAt: new Date().toISOString(),
      projectId,
    };
  }

  // Prepend to the client-level history.
  function pushClientActivity(type: ActivityType, description: string) {
    setActivities((prev) => [makeActivity(type, description), ...prev]);
  }

  // Prepend to a specific project's history.
  function pushProjectActivity(
    projectId: string,
    type: ActivityType,
    description: string
  ) {
    setClient((prev) => ({
      ...prev,
      projects: prev.projects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              activities: [
                makeActivity(type, description, projectId),
                ...p.activities,
              ],
            }
          : p
      ),
    }));
  }

  async function submitProjectNote(projectId: string, text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    pushProjectActivity(projectId, "note", trimmed);
    await addProjectNote(client.id, projectId, trimmed);
  }

  async function toggleApproval(projectId: string, approve: boolean) {
    // Optimistic update
    const nowIso = new Date().toISOString();
    setClient((prev) => ({
      ...prev,
      projects: prev.projects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              approved: approve,
              approvedBy: approve ? "…" : undefined,
              approvedAt: approve ? nowIso : undefined,
            }
          : p
      ),
    }));
    const res = await setProjectApproval(client.id, projectId, approve);
    // Sync the real approver name/date returned by the server
    setClient((prev) => ({
      ...prev,
      projects: prev.projects.map((p) =>
        p.id === projectId
          ? { ...p, approvedBy: res.approvedBy, approvedAt: res.approvedAt }
          : p
      ),
    }));
  }

  // ── computed ────────────────────────────────────────────────────────────────
  const initials = client.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");
  const totalBudget = client.projects.reduce((s, p) => s + p.budget, 0);
  const activeCount = client.projects.filter((p) => p.status === "active").length;
  const completedCount = client.projects.filter((p) => p.status === "completed").length;

  // ── client modal ────────────────────────────────────────────────────────────

  function openClientModal() {
    setCf(toClientForm(client));
    setClientModalOpen(true);
  }

  async function saveClient() {
    setClient((prev) => ({
      ...prev,
      name: cf.name.trim() || prev.name,
      phone: cf.phone.trim() || prev.phone,
      email: cf.email.trim() || prev.email,
      location: cf.location.trim() || prev.location,
      propertyType: cf.propertyType,
      leadSource: cf.leadSource,
      assignedTo: cf.assignedTo,
      capturedBy: (cf.capturedBy || undefined) as Client["capturedBy"],
      capturedAt: cf.capturedAt || undefined,
      notes: cf.notes.trim() || undefined,
    }));
    setClientModalOpen(false);
    pushClientActivity("client_updated", "Client details updated");
    await updateClient(client.id, cf);
  }

  // ── project modal ───────────────────────────────────────────────────────────

  function openAddProject() {
    setPf(EMPTY_PROJECT);
    setProjectModal({ mode: "add" });
  }

  function openEditProject(project: Project) {
    setPf(toProjectForm(project));
    setProjectModal({ mode: "edit", projectId: project.id });
  }

  async function saveProject() {
    if (!projectModal) return;

    if (projectModal.mode === "add") {
      const optimistic: Project = {
        id: `optimistic_${Date.now()}`,
        name: pf.name.trim() || "Untitled Project",
        description: pf.description.trim(),
        budget: Math.max(0, Number(pf.budget) || 0),
        status: pf.status,
        pipelineStage: (Number(pf.pipelineStage) || 1) as PipelineStage,
        startDate: pf.startDate || new Date().toISOString().slice(0, 10),
        endDate: pf.endDate || undefined,
        activities: [makeActivity("project_created", "Project created")],
        contractor: pf.contractor.trim() || undefined,
        teamMembers: parseLines(pf.teamMembers),
        suppliers: parseSuppliers(pf.suppliers),
        approved: false,
      };
      setClient((prev) => ({ ...prev, projects: [...prev.projects, optimistic] }));
      setProjectModal(null);

      const saved = await createProject(client.id, pf);
      setClient((prev) => ({
        ...prev,
        projects: prev.projects.map((p) =>
          p.id === optimistic.id ? { ...saved, activities: p.activities } : p
        ),
      }));
    } else {
      const projectId = projectModal.projectId;
      setClient((prev) => ({
        ...prev,
        projects: prev.projects.map((p) =>
          p.id === projectId
            ? {
                ...p,
                name: pf.name.trim() || "Untitled Project",
                description: pf.description.trim(),
                budget: Math.max(0, Number(pf.budget) || 0),
                status: pf.status,
                pipelineStage: (Number(pf.pipelineStage) || 1) as PipelineStage,
                startDate: pf.startDate || new Date().toISOString().slice(0, 10),
                endDate: pf.endDate || undefined,
                contractor: pf.contractor.trim() || undefined,
                teamMembers: parseLines(pf.teamMembers),
                suppliers: parseSuppliers(pf.suppliers),
                activities: [
                  makeActivity("project_updated", "Project details updated", projectId),
                  ...p.activities,
                ],
              }
            : p
        ),
      }));
      setProjectModal(null);
      await updateProject(projectId, client.id, pf);
    }
  }

  // ── render ──────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Back */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-(--text-muted) hover:text-(--text-secondary) transition-colors mb-8"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back to Clients
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center text-xl font-bold text-white select-none">
            {initials}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-(--text-primary) tracking-tight">
              {client.name}
            </h1>
            <p className="mt-0.5 text-sm text-(--text-secondary)">
              {client.location}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openClientModal}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-(--border) text-sm font-medium text-(--text-secondary) hover:border-(--accent)/40 hover:text-(--text-primary) hover:bg-(--accent)/10 transition-colors"
          >
            <PenIcon />
            Edit Client
          </button>
          <button
            type="button"
            onClick={openAddProject}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-(--accent) text-white dark:text-black text-sm font-semibold hover:bg-amber-400 transition-colors"
          >
            <PlusIcon />
            Add Project
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="grid grid-cols-3 gap-6">
        {/* ── Left column ─────────────────────────────────────────────────── */}
        <div className="col-span-1 space-y-4">
          {/* Contact */}
          <div className="bg-(--card) border border-(--border) rounded-xl p-5 space-y-4">
            <h2 className="text-xs font-semibold text-(--text-muted) uppercase tracking-widest">
              Contact
            </h2>
            <div className="space-y-3">
              <InfoRow
                icon={
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.18h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.18 6.18l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                }
                label="Phone"
                value={client.phone}
              />
              <InfoRow
                icon={
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                }
                label="Email"
                value={client.email}
              />
              <InfoRow
                icon={
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                }
                label="Location"
                value={client.location}
              />
            </div>
          </div>

          {/* Details */}
          <div className="bg-(--card) border border-(--border) rounded-xl p-5 space-y-4">
            <h2 className="text-xs font-semibold text-(--text-muted) uppercase tracking-widest">
              Details
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-(--text-muted)">
                  Property Type
                </span>
                <span className="text-xs font-medium text-(--text-secondary) bg-(--surface) border border-(--border) px-2 py-0.5 rounded-full">
                  {propertyTypeLabel[client.propertyType]}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-(--text-muted)">Lead Source</span>
                <span className="text-xs font-medium text-(--text-secondary) bg-(--surface) border border-(--border) px-2 py-0.5 rounded-full">
                  {leadSourceLabel[client.leadSource]}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-(--text-muted)">Assigned To</span>
                <div className="flex items-center gap-1.5">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold select-none ${salesAvatarColor[client.assignedTo]}`}
                  >
                    {salesInitials(client.assignedTo)}
                  </div>
                  <span
                    className={`text-xs font-medium ${
                      client.assignedTo === "Unassigned"
                        ? "text-(--text-muted)"
                        : "text-(--text-secondary)"
                    }`}
                  >
                    {client.assignedTo}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-(--text-muted)">Captured By</span>
                <span className="text-xs font-medium text-(--text-secondary)">
                  {client.capturedBy || "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-(--text-muted)">Captured On</span>
                <span className="text-xs font-medium text-(--text-secondary)">
                  {client.capturedAt ? formatDate(client.capturedAt) : "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {client.notes && (
            <div className="bg-(--card) border border-(--border) rounded-xl p-5">
              <h2 className="text-xs font-semibold text-(--text-muted) uppercase tracking-widest mb-3">
                Notes
              </h2>
              <p className="text-sm text-(--text-secondary) leading-relaxed">
                {client.notes}
              </p>
            </div>
          )}

          {/* Summary */}
          <div className="bg-(--card) border border-(--border) rounded-xl p-5 space-y-4">
            <h2 className="text-xs font-semibold text-(--text-muted) uppercase tracking-widest">
              Summary
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-(--text-muted)">
                  Total Projects
                </span>
                <span className="text-sm font-bold text-(--text-primary)">
                  {client.projects.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-(--text-muted)">Active</span>
                <span className="text-sm font-bold text-emerald-400">
                  {activeCount}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-(--text-muted)">Completed</span>
                <span className="text-sm font-bold text-(--text-secondary)">
                  {completedCount}
                </span>
              </div>
              <div className="pt-2 border-t border-(--border)">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-(--text-muted)">
                    Total Portfolio
                  </span>
                  <span className="text-sm font-bold text-(--accent) font-mono">
                    {formatCurrency(totalBudget)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right column: projects ───────────────────────────────────────── */}
        <div className="col-span-2">
          <div className="bg-(--card) border border-(--border) rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-(--border) flex items-center justify-between">
              <h2 className="text-sm font-semibold text-(--text-primary)">
                Projects
              </h2>
              <span className="text-xs text-(--text-muted)">
                {client.projects.length} total
              </span>
            </div>

            {client.projects.length === 0 ? (
              <div className="px-6 py-12 flex flex-col items-center gap-3">
                <p className="text-sm text-(--text-muted)">No projects yet.</p>
                <button
                  type="button"
                  onClick={openAddProject}
                  className="text-sm text-(--accent) hover:underline underline-offset-2"
                >
                  Add the first project →
                </button>
              </div>
            ) : (
              <div className="divide-y divide-(--border)">
                {client.projects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    isManager={isManager}
                    onEdit={() => openEditProject(project)}
                    onAddNote={(text) => submitProjectNote(project.id, text)}
                    onToggleApproval={(approve) =>
                      toggleApproval(project.id, approve)
                    }
                  />
                ))}
              </div>
            )}
          </div>

          {/* Client-level history */}
          <div className="bg-(--card) border border-(--border) rounded-xl overflow-hidden mt-6">
            <div className="px-6 py-4 border-b border-(--border)">
              <h2 className="text-sm font-semibold text-(--text-primary)">
                Client History
              </h2>
              <p className="text-xs text-(--text-muted) mt-0.5">
                General notes and client changes — project-specific history lives
                inside each project above
              </p>
            </div>

            <div className="px-6 py-4 border-b border-(--border)">
              <NoteBox
                onSubmit={(text) => {
                  pushClientActivity("note", text);
                  addNote(client.id, text);
                }}
                placeholder="Add a general note… (e.g. Prefers WhatsApp, available weekends)"
              />
            </div>

            <div className="px-6 py-5">
              <Timeline activities={activities} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Edit Client Modal ──────────────────────────────────────────────── */}
      {clientModalOpen && (
        <Modal title="Edit Client" onClose={() => setClientModalOpen(false)}>
          <div className="space-y-4">
            <Field label="Full Name">
              <input
                type="text"
                value={cf.name}
                onChange={(e) => setCf((p) => ({ ...p, name: e.target.value }))}
                className={INPUT}
                placeholder="Client name"
                autoFocus
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Phone">
                <input
                  type="tel"
                  value={cf.phone}
                  onChange={(e) =>
                    setCf((p) => ({ ...p, phone: e.target.value }))
                  }
                  className={INPUT}
                  placeholder="+971 50 000 0000"
                />
              </Field>
              <Field label="Email">
                <input
                  type="email"
                  value={cf.email}
                  onChange={(e) =>
                    setCf((p) => ({ ...p, email: e.target.value }))
                  }
                  className={INPUT}
                  placeholder="email@example.com"
                />
              </Field>
            </div>

            <Field label="Location">
              <input
                type="text"
                value={cf.location}
                onChange={(e) =>
                  setCf((p) => ({ ...p, location: e.target.value }))
                }
                className={INPUT}
                placeholder="Area, City"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Property Type">
                <Sel
                  value={cf.propertyType}
                  onChange={(v) =>
                    setCf((p) => ({ ...p, propertyType: v as PropertyType }))
                  }
                >
                  <option value="villa">Villa</option>
                  <option value="apartment">Apartment</option>
                  <option value="office">Office</option>
                  <option value="other">Other</option>
                </Sel>
              </Field>
              <Field label="Lead Source">
                <Sel
                  value={cf.leadSource}
                  onChange={(v) =>
                    setCf((p) => ({ ...p, leadSource: v as LeadSource }))
                  }
                >
                  <option value="referral">Referral</option>
                  <option value="instagram">Instagram</option>
                  <option value="other">Other</option>
                </Sel>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Managed By (commercial)">
                <Sel
                  value={cf.assignedTo}
                  onChange={(v) =>
                    setCf((p) => ({ ...p, assignedTo: v as Salesperson }))
                  }
                >
                  {SALESPEOPLE.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Sel>
              </Field>
              <Field label="Captured By" optional>
                <Sel
                  value={cf.capturedBy}
                  onChange={(v) => setCf((p) => ({ ...p, capturedBy: v }))}
                >
                  <option value="">—</option>
                  {CAPTURERS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Sel>
              </Field>
            </div>

            <Field label="Captured On" optional>
              <input
                type="date"
                value={cf.capturedAt}
                onChange={(e) =>
                  setCf((p) => ({ ...p, capturedAt: e.target.value }))
                }
                className={INPUT}
              />
            </Field>

            <Field label="Notes" optional>
              <textarea
                rows={3}
                value={cf.notes}
                onChange={(e) =>
                  setCf((p) => ({ ...p, notes: e.target.value }))
                }
                className={`${INPUT} resize-none`}
                placeholder="Internal notes about this client…"
              />
            </Field>
          </div>

          <FormActions
            onCancel={() => setClientModalOpen(false)}
            onSave={saveClient}
            saveLabel="Save Changes"
          />
        </Modal>
      )}

      {/* ── Project Modal (Add / Edit) ─────────────────────────────────────── */}
      {projectModal !== null && (
        <Modal
          title={projectModal.mode === "add" ? "Add Project" : "Edit Project"}
          onClose={() => setProjectModal(null)}
        >
          <div className="space-y-4">
            <Field label="Project Name">
              <input
                type="text"
                value={pf.name}
                onChange={(e) => setPf((p) => ({ ...p, name: e.target.value }))}
                className={INPUT}
                placeholder="e.g. Villa Full Renovation"
                autoFocus
              />
            </Field>

            <Field label="Description" optional>
              <textarea
                rows={3}
                value={pf.description}
                onChange={(e) =>
                  setPf((p) => ({ ...p, description: e.target.value }))
                }
                className={`${INPUT} resize-none`}
                placeholder="Project scope and key deliverables…"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Budget (AED)">
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={pf.budget}
                  onChange={(e) =>
                    setPf((p) => ({ ...p, budget: e.target.value }))
                  }
                  className={INPUT}
                  placeholder="250000"
                />
              </Field>
              <Field label="Status">
                <Sel
                  value={pf.status}
                  onChange={(v) =>
                    setPf((p) => ({ ...p, status: v as ProjectStatus }))
                  }
                >
                  <option value="active">Active</option>
                  <option value="on-hold">On Hold</option>
                  <option value="completed">Completed</option>
                </Sel>
              </Field>
            </div>

            <Field label="Pipeline Stage">
              <Sel
                value={pf.pipelineStage}
                onChange={(v) => setPf((p) => ({ ...p, pipelineStage: v }))}
              >
                {([1, 2, 3, 4, 5, 6, 7, 8] as PipelineStage[]).map((s) => (
                  <option key={s} value={String(s)}>
                    {s} — {PIPELINE_STAGES[s]}
                  </option>
                ))}
              </Sel>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Start Date">
                <input
                  type="date"
                  value={pf.startDate}
                  onChange={(e) =>
                    setPf((p) => ({ ...p, startDate: e.target.value }))
                  }
                  className={INPUT}
                />
              </Field>
              <Field label="End Date" optional>
                <input
                  type="date"
                  value={pf.endDate}
                  onChange={(e) =>
                    setPf((p) => ({ ...p, endDate: e.target.value }))
                  }
                  className={INPUT}
                />
              </Field>
            </div>

            {/* Delivery: contractor, team, suppliers */}
            <div className="pt-2 mt-2 border-t border-(--border)">
              <p className="text-xs font-semibold text-(--text-muted) uppercase tracking-widest mb-3">
                Team & Suppliers
              </p>
              <div className="space-y-4">
                <Field label="Contractor / External Company" optional>
                  <input
                    type="text"
                    value={pf.contractor}
                    onChange={(e) =>
                      setPf((p) => ({ ...p, contractor: e.target.value }))
                    }
                    className={INPUT}
                    placeholder="e.g. Al Reef Interiors LLC"
                  />
                </Field>
                <Field label="Team Members" optional>
                  <textarea
                    rows={3}
                    value={pf.teamMembers}
                    onChange={(e) =>
                      setPf((p) => ({ ...p, teamMembers: e.target.value }))
                    }
                    className={`${INPUT} resize-none`}
                    placeholder={"One worker per line, e.g.\nMohammed (foreman)\nRaj\nSami"}
                  />
                </Field>
                <Field label="Material Suppliers" optional>
                  <textarea
                    rows={3}
                    value={pf.suppliers}
                    onChange={(e) =>
                      setPf((p) => ({ ...p, suppliers: e.target.value }))
                    }
                    className={`${INPUT} resize-none`}
                    placeholder={"One per line: Supplier — material, e.g.\nAl Noor Steel — rebar\nGulf Tiles — flooring"}
                  />
                </Field>
              </div>
            </div>
          </div>

          <FormActions
            onCancel={() => setProjectModal(null)}
            onSave={saveProject}
            saveLabel={
              projectModal.mode === "add" ? "Add Project" : "Save Changes"
            }
          />
        </Modal>
      )}
    </div>
  );
}
