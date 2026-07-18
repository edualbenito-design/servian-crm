import type { CloseTimes } from "@/lib/analytics";

// From capture to a final outcome (Won / Lost), using the sealed closed_at.
export function CloseTimeCard({ close }: { close: CloseTimes }) {
  return (
    <div className="bg-(--card) border border-(--border) rounded-xl p-5">
      <h2 className="text-sm font-semibold text-(--text-primary) mb-1">
        Time to close
      </h2>
      <p className="text-xs text-(--text-muted) mb-4">
        From capture to a final outcome
      </p>

      {close.samples === 0 ? (
        <p className="text-sm text-(--text-muted) py-4">
          No closed deals yet.
        </p>
      ) : (
        <>
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-3xl font-bold text-(--text-primary) tabular-nums">
              {close.avgDays}
            </span>
            <span className="text-sm text-(--text-secondary)">
              days on average
            </span>
            <span className="text-xs text-(--text-muted) ml-auto">
              {close.samples} deal{close.samples > 1 ? "s" : ""}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-(--surface) border border-(--border) p-3">
              <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-1">
                Won
              </p>
              <p className="text-lg font-semibold text-(--text-primary) tabular-nums">
                {close.wonAvgDays !== null ? (
                  <>
                    {close.wonAvgDays}
                    <span className="text-xs font-normal text-(--text-muted)">
                      {" "}
                      days · {close.wonSamples}
                    </span>
                  </>
                ) : (
                  <span className="text-sm font-normal text-(--text-muted)">
                    No data
                  </span>
                )}
              </p>
            </div>
            <div className="rounded-lg bg-(--surface) border border-(--border) p-3">
              <p className="text-[11px] font-medium text-red-600 dark:text-red-400 uppercase tracking-wide mb-1">
                Lost / Ghosting
              </p>
              <p className="text-lg font-semibold text-(--text-primary) tabular-nums">
                {close.lostAvgDays !== null ? (
                  <>
                    {close.lostAvgDays}
                    <span className="text-xs font-normal text-(--text-muted)">
                      {" "}
                      days · {close.lostSamples}
                    </span>
                  </>
                ) : (
                  <span className="text-sm font-normal text-(--text-muted)">
                    No data
                  </span>
                )}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
