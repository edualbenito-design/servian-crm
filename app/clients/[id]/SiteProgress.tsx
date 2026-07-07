"use client";

import { useState } from "react";
import {
  DEFAULT_MILESTONES,
  obraProgress,
  type Milestone,
} from "@/lib/data";

const INPUT =
  "w-full bg-(--surface) border border-(--border) rounded-lg px-2.5 py-1.5 text-sm text-(--text-primary) placeholder:text-(--text-muted) focus:outline-none focus:border-(--accent)/50 transition-colors";

function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `m_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

// Site-progress checklist for a project. Read mode: tick stages off. Edit mode:
// rename/reorder-free add/remove stages and set each stage's cumulative %.
export function SiteProgress({
  milestones,
  onChange,
}: {
  milestones: Milestone[];
  onChange: (milestones: Milestone[], logNote?: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Milestone[]>(milestones);
  const [busy, setBusy] = useState(false);

  const progress = obraProgress(milestones);

  async function toggle(m: Milestone) {
    const now = new Date().toISOString();
    const updated = milestones.map((x) =>
      x.id === m.id
        ? { ...x, done: !x.done, doneAt: !x.done ? now : undefined }
        : x
    );
    const logNote = !m.done
      ? `🏗️ ${m.label} done — ${m.pct}% complete`
      : undefined;
    await onChange(updated, logNote);
  }

  function startEdit() {
    setDraft(milestones.length ? milestones : []);
    setEditing(true);
  }

  function loadTemplate() {
    setDraft(
      DEFAULT_MILESTONES.map((t) => ({
        id: newId(),
        label: t.label,
        pct: t.pct,
        done: false,
      }))
    );
  }

  function addRow() {
    setDraft((d) => [...d, { id: newId(), label: "", pct: 0, done: false }]);
  }

  function patchRow(id: string, patch: Partial<Milestone>) {
    setDraft((d) => d.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }

  function removeRow(id: string) {
    setDraft((d) => d.filter((m) => m.id !== id));
  }

  async function saveEdit() {
    setBusy(true);
    try {
      const cleaned = draft
        .map((m) => ({
          ...m,
          label: m.label.trim(),
          pct: Math.max(0, Math.min(100, Math.round(Number(m.pct) || 0))),
        }))
        .filter((m) => m.label);
      await onChange(cleaned);
      setEditing(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 border-t border-(--border) pt-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-(--text-muted) uppercase tracking-widest">
          Site progress
        </p>
        {!editing && (
          <button
            type="button"
            onClick={startEdit}
            className="text-xs font-semibold text-(--accent) hover:underline"
          >
            {milestones.length ? "Edit stages" : "Set up stages"}
          </button>
        )}
      </div>

      {/* Progress bar */}
      {milestones.length > 0 && (
        <div className="mb-3">
          <div className="h-2.5 w-full rounded-full bg-(--surface) border border-(--border) overflow-hidden">
            <div
              className="h-full rounded-full bg-(--accent) transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-1 text-[11px]">
            <span className="text-(--accent) font-semibold">{progress}% done</span>
            <span className="text-(--text-muted)">
              {milestones.filter((m) => m.done).length}/{milestones.length} stages
            </span>
          </div>
        </div>
      )}

      {editing ? (
        <div className="space-y-2">
          {draft.length === 0 && (
            <button
              type="button"
              onClick={loadTemplate}
              className="w-full rounded-lg border border-dashed border-(--border) py-2 text-xs font-medium text-(--accent) hover:bg-(--accent)/5"
            >
              Use default template (kitchen)
            </button>
          )}
          {draft.map((m) => (
            <div key={m.id} className="flex items-center gap-2">
              <input
                value={m.label}
                onChange={(e) => patchRow(m.id, { label: e.target.value })}
                placeholder="Stage (e.g. Tiling & electrical)"
                className={INPUT}
              />
              <div className="flex items-center gap-1 shrink-0">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={m.pct}
                  onChange={(e) => patchRow(m.id, { pct: Number(e.target.value) })}
                  className="w-16 bg-(--surface) border border-(--border) rounded-lg px-2 py-1.5 text-sm text-(--text-primary) focus:outline-none focus:border-(--accent)/50"
                />
                <span className="text-xs text-(--text-muted)">%</span>
              </div>
              <button
                type="button"
                onClick={() => removeRow(m.id)}
                className="shrink-0 text-(--text-muted) hover:text-red-500 transition-colors"
                title="Remove stage"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={addRow}
              className="text-xs font-semibold text-(--accent) hover:underline"
            >
              + Add stage
            </button>
            <div className="flex-1" />
            <button
              type="button"
              disabled={busy}
              onClick={saveEdit}
              className="bg-(--accent) text-white dark:text-black text-sm font-semibold rounded-lg px-4 py-1.5 disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setEditing(false)}
              className="px-3 py-1.5 rounded-lg border border-(--border) text-sm font-medium text-(--text-secondary)"
            >
              Cancel
            </button>
          </div>
          <p className="text-[11px] text-(--text-muted)">
            The % is how much of the whole job is done once that stage is reached.
          </p>
        </div>
      ) : milestones.length === 0 ? (
        <p className="text-sm text-(--text-muted)">
          No stages yet. Set them up to track the build.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {milestones.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => toggle(m)}
                className="w-full flex items-center gap-2.5 rounded-lg border border-(--border) bg-(--surface)/40 px-3 py-2 text-left hover:bg-(--surface) transition-colors"
              >
                <span
                  className={`shrink-0 w-5 h-5 rounded-md border flex items-center justify-center ${
                    m.done
                      ? "bg-(--accent) border-(--accent) text-white dark:text-black"
                      : "border-(--border)"
                  }`}
                >
                  {m.done && (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  )}
                </span>
                <span
                  className={`flex-1 text-sm ${
                    m.done
                      ? "text-(--text-muted) line-through"
                      : "text-(--text-primary)"
                  }`}
                >
                  {m.label}
                </span>
                <span className="shrink-0 text-xs font-mono font-semibold text-(--text-muted)">
                  {m.pct}%
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
