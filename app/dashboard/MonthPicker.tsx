"use client";

import { useRouter, usePathname } from "next/navigation";

function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, (m || 1) - 1, 1).toLocaleDateString("en-AE", {
    month: "long",
    year: "numeric",
  });
}

// Drives the dashboard's global month filter via the URL (?month=YYYY-MM).
// Empty = the all-time general dashboard.
export function MonthPicker({ months, value }: { months: string[]; value: string }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-(--text-muted)">Month</label>
      <select
        value={value}
        onChange={(e) => {
          const m = e.target.value;
          router.push(m ? `${pathname}?month=${m}` : pathname);
        }}
        className="text-sm rounded-lg border border-(--border) bg-(--surface) px-2.5 py-1.5 text-(--text-primary)"
      >
        <option value="">All time</option>
        {months.map((m) => (
          <option key={m} value={m}>
            {monthLabel(m)}
          </option>
        ))}
      </select>
    </div>
  );
}
