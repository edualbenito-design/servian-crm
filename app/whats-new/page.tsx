import Link from "next/link";

const FEATURES: { icon: string; title: string; body: string }[] = [
  {
    icon: "🔔",
    title: "Alerts from your manager",
    body: "Your manager can flag a client — or a specific project — for you. You'll get a pop-up when you open the app and a bell at the top with a count. Open the client to read it, reply right in the thread, and mark it Resolved when it's sorted.",
  },
  {
    icon: "⚠️",
    title: "“No next step” & “Stale” on the pipeline",
    body: "Any open deal with no follow-up scheduled shows a badge. After 14 days with nothing planned it turns red (“Stale”). Add a follow-up to keep the deal warm — a deal that's being worked never gets flagged.",
  },
  {
    icon: "🧹",
    title: "Cleanup — clear out cold deals",
    body: "The Cleanup button on the Pipeline lists deals that have gone genuinely cold (about 3 months with no activity). For each one: Reactivate (schedule a follow-up), or move it to Lost or Ghosting. Nothing is forced — active deals stay put.",
  },
  {
    icon: "💰",
    title: "Payment plans & real overdue",
    body: "On an accepted quote you can set the expected payment dates and amounts (Advance / Mid / Final). “Overdue” now only appears once a planned date has actually passed — so a project mid-way doesn't wrongly look late.",
  },
  {
    icon: "📅",
    title: "Expected payments on the calendar",
    body: "The calendar shows what you're due to collect each month, with anything overdue in red. Payments due today or past also show up in your 9am email, so nothing slips.",
  },
  {
    icon: "🗓️",
    title: "Month filters",
    body: "Filter the Pipeline by capture month, and the Dashboard by any month, to see a single month's picture — leads, wins, invoiced, collected and more.",
  },
];

export default function WhatsNewPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <Link href="/home" className="text-xs text-(--text-muted) hover:text-(--text-primary)">
        ← Home
      </Link>
      <div className="mt-3 mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-(--accent)">
          What&rsquo;s new
        </p>
        <h1 className="mt-1 text-2xl font-bold text-(--text-primary) tracking-tight">
          New in your CRM
        </h1>
        <p className="mt-1 text-sm text-(--text-secondary)">
          A quick tour of the latest additions — take a minute so nothing passes you by.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="bg-(--card) border border-(--border) rounded-xl p-5 flex items-start gap-4"
          >
            <span className="text-2xl leading-none shrink-0" aria-hidden>
              {f.icon}
            </span>
            <div>
              <h2 className="text-sm font-semibold text-(--text-primary)">{f.title}</h2>
              <p className="mt-1 text-sm text-(--text-secondary) leading-relaxed">{f.body}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex items-center justify-center">
        <Link
          href="/home"
          className="text-sm font-medium px-4 py-2 rounded-lg bg-(--accent) text-white dark:text-black"
        >
          Got it — back to work
        </Link>
      </div>
    </div>
  );
}
