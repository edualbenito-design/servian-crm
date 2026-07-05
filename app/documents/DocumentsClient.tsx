"use client";

import { useRef } from "react";
import { useFormStatus } from "react-dom";
import { uploadDocument, deleteDocument } from "@/app/actions";
import type { CompanyDocument } from "@/lib/db";

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(s: string) {
  return new Date(s).toLocaleDateString("en-AE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function UploadButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-4 py-2 rounded-lg bg-(--accent) text-white dark:text-black text-sm font-semibold hover:bg-amber-400 transition-colors disabled:opacity-50"
    >
      {pending ? "Uploading…" : "Upload"}
    </button>
  );
}

function DeleteButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-2.5 py-1 rounded-md text-xs font-medium text-(--text-muted) hover:text-red-500 transition-colors disabled:opacity-50"
    >
      {pending ? "…" : "Delete"}
    </button>
  );
}

export function DocumentsClient({ documents }: { documents: CompanyDocument[] }) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="space-y-6">
      {/* Upload */}
      <form
        ref={formRef}
        action={async (fd) => {
          await uploadDocument(fd);
          formRef.current?.reset();
        }}
        className="bg-(--card) border border-(--border) rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-3"
      >
        <input
          type="file"
          name="file"
          required
          className="flex-1 text-sm text-(--text-secondary) file:mr-3 file:px-3 file:py-1.5 file:rounded-md file:border-0 file:bg-(--surface) file:text-(--text-primary) file:text-sm file:font-medium file:cursor-pointer"
        />
        <UploadButton />
      </form>

      {/* List */}
      <div className="bg-(--card) border border-(--border) rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-(--border)">
          <h2 className="text-sm font-semibold text-(--text-primary)">
            All documents ({documents.length})
          </h2>
        </div>
        {documents.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-(--text-muted)">
            No documents yet. Upload licenses, company papers, etc.
          </div>
        ) : (
          <div className="divide-y divide-(--border)">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="px-5 py-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-(--surface) border border-(--border) flex items-center justify-center text-(--text-muted) shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <path d="M14 2v6h6" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-(--text-primary) truncate">
                      {doc.name}
                    </p>
                    <p className="text-xs text-(--text-muted)">
                      {formatSize(doc.size)} · {doc.uploadedBy} ·{" "}
                      {formatDate(doc.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {doc.url && (
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded-md text-xs font-medium text-(--accent) border border-(--accent)/30 hover:bg-(--accent)/10 transition-colors"
                    >
                      Open
                    </a>
                  )}
                  <form action={deleteDocument.bind(null, doc.id, doc.path)}>
                    <DeleteButton />
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
