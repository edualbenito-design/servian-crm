import { notFound } from "next/navigation";
import { getQuote, getClient } from "@/lib/db";
import { getCurrentProfile } from "@/lib/auth";
import { quoteTotals, paymentSummary } from "@/lib/data";
import { verifyQuoteToken } from "@/lib/quote-link";
import { QuotePrint } from "./QuotePrint";

export default async function QuotePage(props: PageProps<"/quotes/[id]">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const variant = sp?.doc === "invoice" ? "invoice" : "quote";
  const quote = await getQuote(id);
  if (!quote) notFound();

  const client = await getClient(quote.clientId);
  if (!client) notFound();

  // A valid share token (WhatsApp link) grants public, read-only access with no
  // login. Otherwise, non-managers can only view quotes for their own clients.
  const publicOk = typeof sp?.t === "string" && verifyQuoteToken(id, sp.t);
  if (!publicOk) {
    const profile = await getCurrentProfile();
    if (profile && !profile.isManager && client.assignedTo !== profile.name) {
      notFound();
    }
  }

  const project = client.projects.find((p) => p.id === quote.projectId);
  const totals = quoteTotals(quote);
  const { paid, balance, pctPaid } = paymentSummary(totals.total, quote.payments);

  return (
    <QuotePrint
      quote={quote}
      totals={totals}
      client={{ name: client.name, phone: client.phone, email: client.email, location: client.location }}
      projectName={project?.name ?? ""}
      variant={variant}
      paid={paid}
      balance={balance}
      pctPaid={pctPaid}
    />
  );
}
