"use client";

import { useEffect, useRef, useState } from "react";
import type { Alert } from "@/lib/data";
import {
  createAlert,
  replyAlert,
  resolveAlert,
  reopenAlert,
  markAlertsRead,
} from "@/app/actions";

function timeAgo(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-AE", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface AlertsPanelProps {
  clientId: string;
  initialAlerts: Alert[];
  projects: { id: string; name: string }[];
  isManager: boolean;
}

export function AlertsPanel({
  clientId,
  initialAlerts,
  projects,
  isManager,
}: AlertsPanelProps) {
  const [alerts, setAlerts] = useState<Alert[]>(initialAlerts);
  const [composing, setComposing] = useState(false);
  const [newBody, setNewBody] = useState("");
  const [newTarget, setNewTarget] = useState(""); // "" = client-level
  const [busy, setBusy] = useState(false);
  const myRole = isManager ? "manager" : "sales";

  // Clear the header bell: mark this client's alerts read for my role on open.
  const marked = useRef(false);
  useEffect(() => {
    if (marked.current) return;
    marked.current = true;
    const hasUnread = initialAlerts.some((a) => {
      const readAt = isManager ? a.managerReadAt : a.salesReadAt;
      return a.status === "open" && (!readAt || a.lastMessageAt > readAt);
    });
    if (hasUnread) markAlertsRead(clientId).catch(() => {});
  }, [clientId, initialAlerts, isManager]);

  const projectName = (id?: string) =>
    id ? projects.find((p) => p.id === id)?.name ?? "Project" : undefined;

  async function submitNew() {
    const text = newBody.trim();
    if (!text || busy) return;
    setBusy(true);
    try {
      const created = await createAlert(clientId, newTarget || null, text);
      setAlerts((prev) => [created, ...prev]);
      setNewBody("");
      setNewTarget("");
      setComposing(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not create the alert.");
    } finally {
      setBusy(false);
    }
  }

  const openCount = alerts.filter((a) => a.status === "open").length;
  // Open threads first (newest activity first), then resolved.
  const ordered = [...alerts].sort((a, b) => {
    if (a.status !== b.status) return a.status === "open" ? -1 : 1;
    return a.lastMessageAt < b.lastMessageAt ? 1 : -1;
  });

  // Sales users with no alerts see nothing; managers always get the panel.
  if (!isManager && alerts.length === 0) return null;

  return (
    <div className="bg-(--card) border border-(--border) rounded-xl p-4 sm:p-5 mb-6">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-sm font-semibold text-(--text-primary) flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
            <path d="M12 9v4M12 17h.01" />
          </svg>
          Alerts
          {openCount > 0 && (
            <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
              {openCount} open
            </span>
          )}
        </h2>
        {isManager && !composing && (
          <button
            onClick={() => setComposing(true)}
            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-(--accent) text-white dark:text-black"
          >
            + Flag for commercial
          </button>
        )}
      </div>

      {/* New alert form (managers) */}
      {isManager && composing && (
        <div className="mb-4 rounded-lg border border-(--border) bg-(--surface) p-3 flex flex-col gap-2">
          {projects.length > 0 && (
            <select
              value={newTarget}
              onChange={(e) => setNewTarget(e.target.value)}
              className="text-sm rounded-lg border border-(--border) bg-(--card) px-2.5 py-1.5 text-(--text-primary)"
            >
              <option value="">Client-level (general)</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  About: {p.name}
                </option>
              ))}
            </select>
          )}
          <textarea
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
            rows={2}
            autoFocus
            placeholder="What does the commercial need to fix or check?"
            className="text-sm rounded-lg border border-(--border) bg-(--card) px-2.5 py-1.5 text-(--text-primary) resize-y"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={submitNew}
              disabled={busy || !newBody.trim()}
              className="text-sm font-medium px-3 py-1.5 rounded-lg bg-(--accent) text-white dark:text-black disabled:opacity-50"
            >
              Send alert
            </button>
            <button
              onClick={() => {
                setComposing(false);
                setNewBody("");
              }}
              className="text-sm text-(--text-muted) hover:text-(--text-primary)"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {alerts.length === 0 ? (
        <p className="text-sm text-(--text-muted) py-2">
          No alerts. Flag anything the commercial should fix or check.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {ordered.map((a) => (
            <AlertThread
              key={a.id}
              alert={a}
              clientId={clientId}
              myRole={myRole}
              targetLabel={projectName(a.projectId)}
              onChange={(next) =>
                setAlerts((prev) => prev.map((x) => (x.id === next.id ? next : x)))
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AlertThread({
  alert: a,
  clientId,
  myRole,
  targetLabel,
  onChange,
}: {
  alert: Alert;
  clientId: string;
  myRole: "manager" | "sales";
  targetLabel?: string;
  onChange: (next: Alert) => void;
}) {
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const resolved = a.status === "resolved";

  async function sendReply() {
    const text = reply.trim();
    if (!text || busy) return;
    setBusy(true);
    try {
      const msg = await replyAlert(clientId, a.id, text);
      onChange({ ...a, messages: [...a.messages, msg], lastMessageAt: msg.createdAt });
      setReply("");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not send the message.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleResolved() {
    setBusy(true);
    try {
      if (resolved) {
        await reopenAlert(clientId, a.id);
        onChange({ ...a, status: "open", resolvedBy: undefined, resolvedAt: undefined });
      } else {
        await resolveAlert(clientId, a.id);
        onChange({ ...a, status: "resolved", resolvedAt: new Date().toISOString() });
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not update the alert.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={`rounded-lg border p-3 ${
        resolved
          ? "border-(--border) bg-(--surface)/40 opacity-75"
          : "border-amber-300/60 dark:border-amber-800/50 bg-amber-50/40 dark:bg-amber-900/10"
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-(--card) border border-(--border) text-(--text-secondary)">
            {targetLabel ? `About: ${targetLabel}` : "Client-level"}
          </span>
          {resolved ? (
            <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              ✓ Resolved
            </span>
          ) : (
            <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
              Open
            </span>
          )}
        </div>
        <button
          onClick={toggleResolved}
          disabled={busy}
          className="text-[11px] font-medium px-2 py-1 rounded-md border border-(--border) text-(--text-secondary) hover:text-(--text-primary) disabled:opacity-50 whitespace-nowrap"
        >
          {resolved ? "Reopen" : "Mark resolved"}
        </button>
      </div>

      {/* Thread */}
      <div className="flex flex-col gap-1.5">
        {a.messages.map((m) => {
          const mine = m.authorRole === myRole;
          return (
            <div
              key={m.id}
              className={`flex flex-col max-w-[85%] ${mine ? "self-end items-end" : "self-start items-start"}`}
            >
              <div
                className={`rounded-lg px-2.5 py-1.5 text-sm ${
                  mine
                    ? "bg-(--accent) text-white dark:text-black"
                    : "bg-(--card) border border-(--border) text-(--text-primary)"
                }`}
              >
                {m.body}
              </div>
              <span className="text-[10px] text-(--text-muted) mt-0.5">
                {m.author || (m.authorRole === "manager" ? "Manager" : "Sales")} ·{" "}
                {timeAgo(m.createdAt)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Reply */}
      {!resolved && (
        <div className="mt-2.5 flex items-center gap-2">
          <input
            type="text"
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") sendReply();
            }}
            placeholder="Reply…"
            className="flex-1 text-sm rounded-lg border border-(--border) bg-(--card) px-2.5 py-1.5 text-(--text-primary)"
          />
          <button
            onClick={sendReply}
            disabled={busy || !reply.trim()}
            className="text-sm font-medium px-3 py-1.5 rounded-lg bg-(--accent) text-white dark:text-black disabled:opacity-50"
          >
            Send
          </button>
        </div>
      )}
    </div>
  );
}
