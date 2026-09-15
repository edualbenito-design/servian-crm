import { notFound } from "next/navigation";
import { getClient } from "@/lib/db";
import { getCurrentProfile } from "@/lib/auth";
import { quoteTotals } from "@/lib/data";
import { StatementPrint } from "./StatementPrint";

export default async function StatementPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const client = await getClient(id);
  if (!client) notFound();

  // Owner commercial or manager only.
  const profile = await getCurrentProfile();
  if (profile && !profile.isManager && client.assignedTo !== profile.name) {
    notFound();
  }

  // One row per project: committed (accepted quotes) vs paid vs balance.
  const rows = client.projects.map((p) => {
    const accepted = p.quotes.filter((q) => q.status === "accepted");
    const committed = accepted.reduce((s, q) => s + quoteTotals(q).total, 0);
    const paid = accepted.reduce(
      (s, q) => s + q.payments.reduce((a, x) => a + (Number(x.amount) || 0), 0),
      0
    );
    return {
      name: p.name,
      status: p.status,
      committed,
      paid,
      balance: Math.max(0, committed - paid),
    };
  });

  const totals = rows.reduce(
    (t, r) => ({
      committed: t.committed + r.committed,
      paid: t.paid + r.paid,
      balance: t.balance + r.balance,
    }),
    { committed: 0, paid: 0, balance: 0 }
  );

  return (
    <StatementPrint
      client={{ name: client.name, phone: client.phone, email: client.email, location: client.location }}
      rows={rows}
      totals={totals}
    />
  );
}
