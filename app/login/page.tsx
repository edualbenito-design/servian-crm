"use client";

import { useActionState } from "react";
import { signIn } from "./actions";
import { LogoMark } from "@/app/components/Logo";

const INPUT =
  "w-full bg-(--surface) border border-(--border) rounded-lg px-3 py-2.5 text-sm text-(--text-primary) placeholder:text-(--text-muted) focus:outline-none focus:border-(--accent)/50 focus:ring-1 focus:ring-(--accent)/20 transition-colors";

export default function LoginPage() {
  const [error, formAction, pending] = useActionState(signIn, null);

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <LogoMark size={56} />
          <div className="text-center">
            <p className="font-semibold tracking-[0.2em] text-(--text-primary)">
              SERVIAN
            </p>
            <p className="text-[10px] tracking-[0.35em] text-(--text-muted)">
              CONTRACTING
            </p>
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
