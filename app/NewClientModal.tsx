"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  SALESPEOPLE,
  CAPTURERS,
  type PropertyType,
  type LeadSource,
  type Salesperson,
} from "@/lib/data";
import { createClient } from "@/app/actions";

const INPUT =
  "w-full bg-(--surface) border border-(--border) rounded-lg px-3 py-2.5 text-sm text-(--text-primary) placeholder:text-(--text-muted) focus:outline-none focus:border-(--accent)/50 focus:ring-1 focus:ring-(--accent)/20 transition-colors";
const LABEL = "block text-xs font-medium text-(--text-secondary) mb-1.5";

type Form = {
  name: string;
  phone: string;
  email: string;
  location: string;
  propertyType: PropertyType;
  renovationType: string;
  leadSource: LeadSource;
  assignedTo: Salesperson;
  capturedBy: string;
  capturedAt: string;
  notes: string;
};

function emptyForm(): Form {
  return {
    name: "",
    phone: "",
    email: "",
    location: "",
    propertyType: "villa",
    renovationType: "",
    leadSource: "referral",
    assignedTo: "Unassigned",
    capturedBy: "",
    capturedAt: new Date().toISOString().slice(0, 10),
    notes: "",
  };
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
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>
    </div>
  );
}

export function NewClientButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<Form>(emptyForm);
  const [saving, setSaving] = useState(false);
  const closeRef = useRef(() => setOpen(false));

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeRef.current();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  function openModal() {
    setF(emptyForm());
    setOpen(true);
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    try {
      const id = await createClient(f);
      setOpen(false);
      router.push(`/clients/${id}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-(--accent) text-white dark:text-black text-sm font-semibold hover:bg-amber-400 transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
        New Client
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative z-10 bg-(--card) border border-(--border) rounded-2xl shadow-2xl shadow-black/60 w-full max-w-lg flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-(--border) shrink-0">
              <h2 className="text-sm font-semibold text-(--text-primary)">New Client</h2>
              <button type="button" onClick={() => setOpen(false)} className="p-1.5 rounded-md text-(--text-muted) hover:text-(--text-primary) hover:bg-(--accent)/10 transition-colors">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div>
                <label className={LABEL}>Full Name</label>
                <input type="text" value={f.name} onChange={(e) => setF((p) => ({ ...p, name: e.target.value }))} className={INPUT} placeholder="Client name" autoFocus />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL}>Phone</label>
                  <input type="tel" value={f.phone} onChange={(e) => setF((p) => ({ ...p, phone: e.target.value }))} className={INPUT} placeholder="+971 50 000 0000" />
                </div>
                <div>
                  <label className={LABEL}>Email</label>
                  <input type="email" value={f.email} onChange={(e) => setF((p) => ({ ...p, email: e.target.value }))} className={INPUT} placeholder="email@example.com" />
                </div>
              </div>

              <div>
                <label className={LABEL}>Location</label>
                <input type="text" value={f.location} onChange={(e) => setF((p) => ({ ...p, location: e.target.value }))} className={INPUT} placeholder="Area, City" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL}>Property Type</label>
                  <Sel value={f.propertyType} onChange={(v) => setF((p) => ({ ...p, propertyType: v as PropertyType }))}>
                    <option value="villa">Villa</option>
                    <option value="apartment">Apartment</option>
                    <option value="office">Office</option>
                    <option value="other">Other</option>
                  </Sel>
                </div>
                <div>
                  <label className={LABEL}>Renovation Type</label>
                  <input
                    type="text"
                    value={f.renovationType}
                    onChange={(e) => setF((p) => ({ ...p, renovationType: e.target.value }))}
                    className={INPUT}
                    placeholder="e.g. Kitchen, Bathroom, AC"
                  />
                </div>
                <div>
                  <label className={LABEL}>Lead Source</label>
                  <Sel value={f.leadSource} onChange={(v) => setF((p) => ({ ...p, leadSource: v as LeadSource }))}>
                    <option value="referral">Referral</option>
                    <option value="instagram">Instagram</option>
                    <option value="other">Other</option>
                  </Sel>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL}>Managed By (commercial)</label>
                  <Sel value={f.assignedTo} onChange={(v) => setF((p) => ({ ...p, assignedTo: v as Salesperson }))}>
                    {SALESPEOPLE.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </Sel>
                </div>
                <div>
                  <label className={LABEL}>Captured By</label>
                  <Sel value={f.capturedBy} onChange={(v) => setF((p) => ({ ...p, capturedBy: v }))}>
                    <option value="">—</option>
                    {CAPTURERS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </Sel>
                </div>
              </div>

              <div>
                <label className={LABEL}>Captured On</label>
                <input type="date" value={f.capturedAt} onChange={(e) => setF((p) => ({ ...p, capturedAt: e.target.value }))} className={INPUT} />
              </div>

              <div>
                <label className={LABEL}>Notes <span className="text-(--text-muted) font-normal">(optional)</span></label>
                <textarea rows={3} value={f.notes} onChange={(e) => setF((p) => ({ ...p, notes: e.target.value }))} className={`${INPUT} resize-none`} placeholder="What does the client need?" />
              </div>

              <div className="flex items-center justify-end gap-3 mt-2 pt-5 border-t border-(--border)">
                <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 text-sm font-medium text-(--text-secondary) hover:text-(--text-primary) transition-colors">
                  Cancel
                </button>
                <button type="button" onClick={save} disabled={saving || !f.name.trim()} className="px-5 py-2 rounded-lg bg-(--accent) text-white dark:text-black text-sm font-semibold hover:bg-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                  {saving ? "Creating…" : "Create Client"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
