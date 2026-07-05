import { notFound, redirect } from "next/navigation";
import { getClients } from "@/lib/db";
import { getCurrentProfile } from "@/lib/auth";
import { SALESPEOPLE, type Salesperson } from "@/lib/data";
import {
  projectsForSalesperson,
  statsFor,
  salespersonSlug,
} from "@/lib/team";
import { TeamMemberView } from "./TeamMemberView";

export default async function TeamMemberPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const profile = await getCurrentProfile();
  if (profile && !profile.isManager) redirect("/");

  const { slug } = await params;

  const person = SALESPEOPLE.find(
    (p) => salespersonSlug(p) === slug
  ) as Salesperson | undefined;

  if (!person) notFound();

  const clients = await getClients();
  const projects = projectsForSalesperson(clients, person);
  const stats = statsFor(projects);

  return <TeamMemberView person={person} projects={projects} stats={stats} />;
}
