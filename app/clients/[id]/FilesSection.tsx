"use client";

import { useState, useRef, useTransition } from "react";
import {
  FILE_CATEGORIES,
  type ProjectFile,
  type FileCategory,
} from "@/lib/data";
import { uploadProjectFile, deleteProjectFile } from "@/app/actions";

const categoryLabel: Record<FileCategory, string> = {
  render: "Render",
  receipt: "Receipt",
  document: "Document",
  other: "Other",
};

const categoryColor: Record<FileCategory, string> = {
  render:
    "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400",
  receipt:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
  document: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
  other: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-400",
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FilesSection({
  clientId,
  projectId,
  initialFiles,
}: {
  clientId: string;
  projectId: string;
  initialFiles: ProjectFile[];
}) {
  const [files, setFiles] = useState<ProjectFile[]>(initialFiles);
  const [category, setCategory] = useState<FileCategory>("render");
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.set("file", file);
    fd.set("clientId", clientId);
    fd.set("projectId", projectId);
    fd.set("category", category);
    start(async () => {
      const created = await uploadProjectFile(fd);
      setFiles((prev) => [created, ...prev]);
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  async function remove(f: ProjectFile) {
    if (!confirm(`Delete ${f.name}?`)) return;
    setFiles((prev) => prev.filter((x) => x.id !== f.id));
    await deleteProjectFile(clientId, f.id, f.path);
  }

  return (
    <div className="mt-6 border-t border-(--border) pt-4">
      <p className="text-xs font-semibold text-(--text-muted) uppercase tracking-widest mb-3">
        Files ({files.length})
      </p>

      {/* Upload row */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as FileCategory)}
          className="bg-(--surface) border border-(--border) rounded-lg px-3 py-2 text-sm text-(--text-secondary) focus:outline-none focus:border-(--accent)/50 cursor-pointer"
        >
          {FILE_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <input
          ref={inputRef}
          type="file"
          onChange={onPick}
          disabled={pending}
          className="flex-1 text-sm text-(--text-secondary) file:mr-3 file:px-3 file:py-1.5 file:rounded-md file:border-0 file:bg-(--accent) file:text-white dark:file:text-black file:text-sm file:font-semibold file:cursor-pointer disabled:opacity-50"
        />
        {pending && (
          <span className="text-xs text-(--text-muted)">Uploading…</span>
        )}
      </div>

      {files.length === 0 ? (
        <p className="text-sm text-(--text-muted)">No files yet.</p>
      ) : (
        <div className="space-y-1.5">
          {files.map((f) => (
            <div
              key={f.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-(--border) bg-(--surface) px-3 py-2"
            >
              <div className="min-w-0 flex items-center gap-2">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${categoryColor[f.category]}`}
                >
                  {categoryLabel[f.category]}
                </span>
                <div className="min-w-0">
                  <p className="text-sm text-(--text-primary) truncate">
                    {f.name}
                  </p>
                  <p className="text-[11px] text-(--text-muted)">
                    {formatSize(f.size)} · {f.uploadedBy}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {f.url && (
                  <a
                    href={f.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 rounded-md text-xs font-medium text-(--accent) border border-(--accent)/30 hover:bg-(--accent)/10 transition-colors"
                  >
                    Open
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => remove(f)}
                  className="px-2 py-1 rounded-md text-xs font-medium text-(--text-muted) hover:text-red-500 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
