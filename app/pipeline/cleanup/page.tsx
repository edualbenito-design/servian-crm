import Link from "next/link";
import { getColdDeals } from "@/lib/db";
import { getCurrentProfile } from "@/lib/auth";
import { COLD_DAYS } from "@/lib/data";
import { CleanupView } from "./CleanupView";

export default async function CleanupPage() {
  const profile = await getCurrentProfile();
  const groups = await getColdDeals(profile?.isManager ? undefined : profile?.name);
  const total = groups.reduce((n, g) => n + g.deals.length, 0);

  return (
    <div className="flex flex-col">
      <div className="max-w-3xl mx-auto w-full px-6 pt-10 pb-6">
        <Link
          href="/pipeline"
          className="text-xs text-(--text-muted) hover:text-(--text-primary)"
        >
          ← Pipeline
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-(--text-primary) tracking-tight">
          Cleanup
        </h1>
        <p className="mt-1 text-sm text-(--text-secondary)">
          Open deals with no activity for {Math.round(COLD_DAYS / 30)}+ months —{" "}
          {total > 0
            ? "reactivate them or mark the outcome so the funnel stays honest."
            : "none right now."}{" "}
          Deals still being worked don&apos;t show here.
        </p>
      </div>

      <CleanupView groups={groups} />
    </div>
  );
}
