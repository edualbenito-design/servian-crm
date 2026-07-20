import { NextResponse } from "next/server";
import { getClients, getAlertsForUser, getCollections, type AlertInbox } from "@/lib/db";
import type { ExpectedDue } from "@/lib/email";
import {
  recipientProfiles,
  dueFollowUps,
  weekAgenda,
  sendFollowUpEmail,
  sendWeeklyEmail,
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

  // Monday (in Dubai) → weekly summary to every salesperson.
  // Other days → daily briefing, only to people who actually have due items.
  // 05:00 UTC = 09:00 Dubai, still the same weekday, so getUTCDay() is safe.
  const forceWeekly = new URL(request.url).searchParams.get("weekly") === "1";
  const isMonday = new Date().getUTCDay() === 1 || forceWeekly;

  const clients = await getClients();
  const recipients = await recipientProfiles();
  const results: {
    name: string;
    email?: string;
    count: number;
    sent: boolean;
    error?: string;
  }[] = [];

  function groupByPerson(list: Client[]): Map<string, Client[]> {
    const m = new Map<string, Client[]>();
    for (const c of list) {
      const arr = m.get(c.assignedTo) ?? [];
      arr.push(c);
      m.set(c.assignedTo, arr);
    }
    return m;
  }

  if (isMonday) {
    // Weekly: every salesperson gets one, even with an empty week.
    const byPerson = groupByPerson(weekAgenda(clients));
    for (const r of recipients) {
      if (r.role !== "sales") continue;
      const list = byPerson.get(r.name) ?? [];
      try {
        const res = await sendWeeklyEmail(r.email, r.name, list);
        results.push({ name: r.name, email: r.email, count: list.length, sent: !res.error, error: res.error?.message });
      } catch (e) {
        results.push({ name: r.name, email: r.email, count: list.length, sent: false, error: e instanceof Error ? e.message : "send failed" });
      }
    }
    return NextResponse.json({ ok: true, mode: "weekly", results });
  }

  // Daily: people with overdue/today follow-ups OR open manager alerts.
  const emailByName = new Map(recipients.map((r) => [r.name, r.email]));
  const byPerson = groupByPerson(dueFollowUps(clients));

  // Open alerts + expected payments due (today or past) per commercial.
  const todayStr = new Date().toISOString().slice(0, 10);
  const alertsByName = new Map<string, AlertInbox[]>();
  const expectedByName = new Map<string, ExpectedDue[]>();
  for (const r of recipients) {
    if (r.role !== "sales") continue;
    const a = await getAlertsForUser(r.name, false);
    if (a.length) alertsByName.set(r.name, a);
    const { expectedPayments } = await getCollections(r.name);
    const due = expectedPayments
      .filter((e) => e.date <= todayStr)
      .map((e) => ({
        clientId: e.clientId,
        clientName: e.clientName,
        projectName: e.projectName,
        date: e.date,
        amount: e.amount,
      }));
    if (due.length) expectedByName.set(r.name, due);
  }

  const names = new Set<string>([
    ...byPerson.keys(),
    ...alertsByName.keys(),
    ...expectedByName.keys(),
  ]);
  for (const name of names) {
    const list = byPerson.get(name) ?? [];
    const alerts = alertsByName.get(name) ?? [];
    const expected = expectedByName.get(name) ?? [];
    const email = emailByName.get(name);
    if (!email) {
      results.push({ name, count: list.length, sent: false, error: "no email" });
      continue;
    }
    try {
      const res = await sendFollowUpEmail(email, name, list, alerts, expected);
      results.push({ name, email, count: list.length + alerts.length + expected.length, sent: !res.error, error: res.error?.message });
    } catch (e) {
      results.push({ name, email, count: list.length, sent: false, error: e instanceof Error ? e.message : "send failed" });
    }
  }

  return NextResponse.json({ ok: true, mode: "daily", results });
}
