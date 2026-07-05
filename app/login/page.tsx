"use client";

import { useActionState } from "react";
import { signIn } from "./actions";

const INPUT =
  "w-full bg-(--surface) border border-(--border) rounded-lg px-3 py-2.5 text-sm text-(--text-primary) placeholder:text-(--text-muted) focus:outline-none focus:border-(--accent)/50 focus:ring-1 focus:ring-(--accent)/20 transition-colors";

export default function LoginPage() {
  const [error, formAction, pending] = useActionState(signIn, null);

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-9 h-9 rounded bg-(--accent) flex items-center justify-center">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-white dark:text-black"
            >
              <path d="M3 21V9l9-6 9 6v12" />
              <path d="M9 21V12h6v9" />
            </svg>
          </div>
          <div>
            <span className="font-semibold text-(--text-primary) tracking-tight">
              Servian Contracting
            </span>
            <span className="ml-2 text-xs font-medium text-(--text-muted) uppercase tracking-widest">
              CRM
            </span>
          </div>
        </div>

        <div className="bg-(--card) border border-(--border) rounded-2xl p-7">
          <h1 className="text-lg font-bold text-(--text-primary) mb-1">
            Sign in
          </h1>
          <p className="text-sm text-(--text-muted) mb-6">
            Use the account provided by your manager.
          </p>

          <form action={formAction} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-(--text-secondary) mb-1.5">
                Email
              </label>
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                className={INPUT}
                placeholder="you@servian.ae"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-(--text-secondary) mb-1.5">
                Password
              </label>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                required
                className={INPUT}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="w-full px-5 py-2.5 rounded-lg bg-(--accent) text-white dark:text-black text-sm font-semibold hover:bg-amber-400 transition-colors disabled:opacity-50"
            >
              {pending ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
