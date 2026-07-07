"use client";

import { useRef, useState } from "react";

// A single optional attachment (e.g. a payment receipt or a conversation
// screenshot). Compact: shows "＋ Attach <label>" when empty, or a link to the
// file + a remove button when present. Upload/remove are wired by the parent.
export function AttachmentControl({
  attachment,
  onUpload,
  onRemove,
  label,
}: {
  attachment: { name?: string; url?: string } | null;
  onUpload: (file: File) => Promise<void>;
  onRemove: () => Promise<void>;
  label: string; // e.g. "receipt", "screenshot"
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      await onUpload(file);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await onRemove();
    } finally {
      setBusy(false);
    }
  }

  const hasFile = !!(attachment && (attachment.url || attachment.name));

  return (
    <span className="inline-flex items-center gap-1.5">
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        onChange={onPick}
        className="hidden"
      />
      {hasFile ? (
        <>
          <a
            href={attachment?.url ?? undefined}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium text-emerald-700 bg-emerald-100 hover:bg-emerald-200 dark:text-emerald-300 dark:bg-emerald-900/40 dark:hover:bg-emerald-900/60 transition-colors max-w-[140px]"
            title={attachment?.name}
          >
            <ClipIcon />
            <span className="truncate">{attachment?.name ?? "View"}</span>
          </a>
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            title={`Remove ${label}`}
            className="text-(--text-muted) hover:text-red-500 transition-colors disabled:opacity-50"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium text-(--text-muted) border border-(--border) hover:text-(--accent) hover:border-(--accent)/40 transition-colors disabled:opacity-50"
        >
          <ClipIcon />
          {busy ? "Uploading…" : `Attach ${label}`}
        </button>
      )}
    </span>
  );
}

function ClipIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  );
}
