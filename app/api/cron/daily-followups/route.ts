import { NextResponse } from "next/server";
import { getClients } from "@/lib/db";
import {
  recipientsByName,
  dueFollowUps,
  sendFollowUpEmail,
} from "@/lib/email";
import type { Client } from "@/lib/data";

export const dynamic = "force-dynamic";

// Daily 9am (Dubai) follow-up briefing. Triggered by Vercel Cron, which sends
// `Authorization: Bearer ${CRON_SECRET}`. A `?key=` query param is also accepted
// for manual testing from the browser.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    const key = new URL(request.url).searchParams.get("key");
    if (auth !== `Bearer ${secret}` && key !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // All clients (manager view), then group due follow-ups by salesperson.
  const clients = await getClients();
  const due = dueFollowUps(clients);

  const byPerson = new Map<string, Client[]>();
  for (const c of due) {
    const list = byPerson.get(c.assignedTo) ?? [];
    list.push(c);
    byPerson.set(c.assignedTo, list);
  }

  const recipients = await recipientsByName();
  const results: {
    name: string;
    email?: string;
    count: number;
    sent: boolean;
    error?: string;
  }[] = [];

  for (const [name, list] of byPerson) {
    const email = recipients.get(name);
    if (!email) {
      results.push({ name, count: list.length, sent: false, error: "no email" });
      continue;
    }
    try {
      const res = await sendFollowUpEmail(email, name, list);
      results.push({
        name,
        email,
        count: list.length,
        sent: !res.error,
        error: res.error?.message,
      });
    } catch (e) {
      results.push({
        name,
        email,
        count: list.length,
        sent: false,
        error: e instanceof Error ? e.message : "send failed",
      });
    }
  }

  return NextResponse.json({ ok: true, totalDue: due.length, results });
}
