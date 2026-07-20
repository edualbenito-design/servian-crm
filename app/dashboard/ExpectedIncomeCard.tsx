// Cash-flow forecast from the payment plans: what we still expect to collect,
// grouped by month. Past-due-but-unpaid installments show as "Overdue".
function aed(n: number) {
  return new Intl.NumberFormat("en-AE", { maximumFractionDigits: 0 }).format(n);
}

export function ExpectedIncomeCard({
  expected,
}: {
  expected: { date: string; amount: number }[];
}) {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  // Next 6 months, oldest → newest.
  const months: { key: string; label: string; amount: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("en-AE", { month: "short" }),
      amount: 0,
    });
  }
  const byKey = new Map(months.map((m) => [m.key, m]));

  let overdue = 0;
  let total = 0;
  for (const e of expected) {
    total += e.amount;
    if (e.date < todayStr) {
      overdue += e.amount;
      continue;
    }
    const m = byKey.get(e.date.slice(0, 7));
    if (m) m.amount += e.amount;
  }
  const max = Math.max(1, ...months.map((m) => m.amount));

  return (
    <div className="bg-(--card) border border-(--border) rounded-xl p-5">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-semibold text-(--text-primary)">
          Expected income
        </h2>
        <span className="text-xs text-(--text-muted)">
          AED {aed(total)} outstanding
        </span>
      </div>
      <p className="text-xs text-(--text-muted) mb-4">
        From payment plans — what we still expect to collect
      </p>

      {expected.length === 0 ? (
        <p className="text-sm text-(--text-muted) py-4">
          No payment plans set yet.
        </p>
      ) : (
        <>
          {overdue > 0.5 && (
            <div className="mb-3 flex items-center justify-between rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 px-3 py-2">
              <span className="text-xs font-medium text-red-700 dark:text-red-300">
                Overdue (past expected date)
              </span>
              <span className="text-sm font-bold font-mono text-red-700 dark:text-red-400">
                AED {aed(overdue)}
              </span>
            </div>
          )}
          <div className="flex items-end justify-between gap-2 h-32">
            {months.map((m) => (
              <div key={m.key} className="flex-1 h-full flex flex-col items-center justify-end gap-1">
                <span className="text-[10px] font-mono text-(--text-secondary)">
                  {m.amount > 0 ? aed(m.amount) : ""}
                </span>
                <div
                  className="w-full bg-emerald-500/80 rounded-t-md transition-all"
                  style={{ height: `${Math.max(2, (m.amount / max) * 90)}px` }}
                />
                <span className="text-[10px] text-(--text-muted)">{m.label}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
