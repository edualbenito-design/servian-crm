"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { searchClients, type ClientSearchResult } from "@/app/actions";

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ClientSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function close() {
    setOpen(false);
    setQuery("");
    setResults([]);
  }

  // ⌘K / Ctrl+K opens; Esc closes.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      } else if (e.key === "Escape") {
        close();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 40);
  }, [open]);

  // Debounced search.
  useEffect(() => {
    if (!open) return;
    const q = query;
    const t = setTimeout(async () => {
      if (q.trim().length < 2) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        setResults(await searchClients(q));
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query, open]);

  function go(id: string) {
    close();
    router.push(`/clients/${id}`);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Search clients (⌘K)"
        className="w-9 h-9 flex items-center justify-center rounded-md text-(--text-secondary) hover:text-(--text-primary) hover:bg-(--accent)/10 transition-colors"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[70] flex items-start justify-center p-4 pt-[12vh] bg-black/50 print:hidden"
          onClick={close}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-(--border) bg-(--card) shadow-2xl shadow-black/50 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 px-4 border-b border-(--border)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-(--text-muted) shrink-0">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search a client by name or phone…"
                className="flex-1 bg-transparent py-3.5 text-sm text-(--text-primary) placeholder:text-(--text-muted) focus:outline-none"
              />
              <kbd className="hidden sm:block text-[10px] text-(--text-muted) border border-(--border) rounded px-1.5 py-0.5">esc</kbd>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {query.trim().length < 2 ? (
                <p className="px-4 py-6 text-sm text-(--text-muted) text-center">
                  Type at least 2 characters.
                </p>
              ) : loading && results.length === 0 ? (
                <p className="px-4 py-6 text-sm text-(--text-muted) text-center">Searching…</p>
              ) : results.length === 0 ? (
                <p className="px-4 py-6 text-sm text-(--text-muted) text-center">No clients found.</p>
              ) : (
                <ul className="divide-y divide-(--border)">
                  {results.map((r) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => go(r.id)}
                        className="w-full text-left px-4 py-3 hover:bg-(--surface) transition-colors"
                      >
                        <p className="text-sm font-medium text-(--text-primary)">{r.name}</p>
                        <p className="text-xs text-(--text-muted)">
                          {[r.phone, r.location, r.assignedTo].filter(Boolean).join(" · ")}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
