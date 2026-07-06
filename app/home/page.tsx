import Link from "next/link";
import { getClients } from "@/lib/db";
import { getCurrentProfile } from "@/lib/auth";
import { followUpState } from "@/lib/data";

function num(n: number) {
  return new Intl.NumberFormat("en-AE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-(--card) border border-(--border) rounded-xl p-3 sm:p-5">
      <p className="text-[10px] sm:text-xs font-medium text-(--text-muted) uppercase tracking-widest mb-1">
        {label}
      </p>
      <p className="text-lg sm:text-2xl font-bold text-(--text-primary) truncate">
        {value}
      </p>
    </div>
  );
}

function NavCard({
  href,
  title,
  desc,
  icon,
}: {
  href: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group bg-(--card) border border-(--border) rounded-xl p-5 hover:border-(--accent)/50 transition-colors flex items-start gap-4"
    >
      <div className="w-11 h-11 rounded-lg bg-(--surface) border border-(--border) flex items-center justify-center text-(--accent) shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="font-semibold text-(--text-primary) group-hover:text-(--accent) transition-colors">
          {title}
        </p>
        <p className="text-sm text-(--text-secondary) mt-0.5">{desc}</p>
      </div>
    </Link>
  );
}

export default async function HomePage() {
  const profile = await getCurrentProfile();
  const clients = await getClients(
    profile?.isManager ? undefined : profile?.name
  );

  const projects = clients.flatMap((c) => c.projects);
  const activeProjects = projects.filter((p) => p.status === "active").length;
  const pipelineValue = projects
    .filter((p) => p.status !== "completed")
    .reduce((s, p) => s + p.budget, 0);
  const followUpsDue = clients.filter((c) => {
    const s = followUpState(c.nextFollowUp);
    return s === "overdue" || s === "today";
  }).length;

  const isManager = profile?.isManager ?? false;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-(--text-primary) tracking-tight">
          Welcome{profile?.name ? `, ${profile.name}` : ""}
        </h1>
        <p className="mt-1 text-sm text-(--text-secondary)">
          Servian Contracting CRM — {isManager ? "manager overview" : "your workspace"}
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Stat label="Clients" value={String(clients.length)} />
        <Stat label="Active Projects" value={String(activeProjects)} />
        <Stat label="Pipeline · AED" value={num(pipelineValue)} />
        <Stat label="Follow-ups Due" value={String(followUpsDue)} />
      </div>

      {/* Navigation */}
      <p className="text-xs font-semibold text-(--text-muted) uppercase tracking-widest mb-3">
        Sections
      </p>
      <div className="grid sm:grid-cols-2 gap-4">
        <NavCard
          href="/"
          title="Clients"
          desc="All clients, search, add new leads, follow-ups"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          }
        />
        <NavCard
          href="/pipeline"
          title="Pipeline"
          desc="Drag projects across the 8 sales stages"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="6" height="18" rx="1" />
              <rect x="9.5" y="3" width="6" height="12" rx="1" />
              <rect x="16" y="3" width="5" height="7" rx="1" />
            </svg>
          }
        />
        {isManager && (
          <>
            <NavCard
              href="/dashboard"
              title="Dashboard"
              desc="Business analytics, leads, funnel, performance"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 3v18h18" />
                  <path d="m19 9-5 5-4-4-3 3" />
                </svg>
              }
            />
            <NavCard
              href="/team"
              title="Team"
              desc="Commercial performance and their projects"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              }
            />
            <NavCard
              href="/documents"
              title="Documents"
              desc="Company licenses, papers and daily files"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <path d="M14 2v6h6" />
                </svg>
              }
            />
          </>
        )}
      </div>
    </div>
  );
}
