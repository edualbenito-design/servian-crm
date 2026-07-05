import { notFound } from "next/navigation";
import { getQuote, getClient } from "@/lib/db";
import { getCurrentProfile } from "@/lib/auth";
import { quoteTotals } from "@/lib/data";
import { QuotePrint } from "./QuotePrint";

export default async function QuotePage(props: PageProps<"/quotes/[id]">) {
  const { id } = await props.params;
  const quote = await getQuote(id);
  if (!quote) notFound();

  const client = await getClient(quote.clientId);
  if (!client) notFound();

  // Non-managers can only view quotes for their own clients.
  const profile = await getCurrentProfile();
  if (profile && !profile.isManager && client.assignedTo !== profile.name) {
    notFound();
  }

  const project = client.projects.find((p) => p.id === quote.projectId);
  const totals = quoteTotals(quote);

  return (
    <QuotePrint
      quote={quote}
      totals={totals}
      client={{ name: client.name, phone: client.phone, email: client.email, location: client.location }}
      projectName={project?.name ?? ""}
    />
  );
}
