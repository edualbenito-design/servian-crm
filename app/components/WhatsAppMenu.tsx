"use client";

import { useState } from "react";
import { WA_TEMPLATES, waLink } from "@/lib/whatsapp";

// WhatsApp button that opens a small menu of pre-written messages. Picking one
// opens the chat with the text ready to send (editable in WhatsApp).
export function WhatsAppMenu({ phone, name }: { phone: string; name: string }) {
  const [open, setOpen] = useState(false);
  if (!phone.trim()) return null;

  return (
    <div className="relative flex-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.29.173-1.414-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885M20.52 3.449C18.24 1.245 15.24.044 12.045.044 5.463.044.104 5.4.101 11.986c0 2.096.549 4.14 1.595 5.945L0 24l6.335-1.652a11.96 11.96 0 005.71 1.454h.006c6.585 0 11.946-5.357 11.949-11.945a11.9 11.9 0 00-3.481-8.418" />
        </svg>
        WhatsApp
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1 left-0 right-0 min-w-56 bg-(--card) border border-(--border) rounded-lg shadow-lg overflow-hidden">
            <a
              href={waLink(phone)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="block px-3 py-2 text-xs font-medium text-(--text-primary) hover:bg-(--surface) transition-colors"
            >
              Open chat (no message)
            </a>
            <div className="border-t border-(--border)" />
            <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-(--text-muted)">
              Templates
            </p>
            {WA_TEMPLATES.map((t) => (
              <a
                key={t.id}
                href={waLink(phone, t.build({ name }))}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="block px-3 py-2 text-xs text-(--text-secondary) hover:bg-(--surface) hover:text-(--text-primary) transition-colors"
              >
                {t.label}
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
