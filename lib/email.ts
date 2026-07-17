import { Resend } from "resend";
import { serverClient } from "./supabase/server";
import { followUpState, type Client } from "./data";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://servian-crm.vercel.app";
const FROM = process.env.RESEND_FROM ?? "Servian CRM <onboarding@resend.dev>";
const GOLD = "#b8944d";

export interface Recipient {
  name: string;
  email: string;
  role: string; // "manager" | "sales"
}

// All people with a login (join Supabase Auth users with profiles), incl. role.
export async function recipientProfiles(): Promise<Recipient[]> {
  const db = serverClient();

  const { data: profiles } = await db
    .from("profiles")
    .select("id, full_name, role");
  if (!profiles) return [];

  const { data: usersData } = await db.auth.admin.listUsers({ perPage: 200 });
  const emailById = new Map<string, string>();
  for (const u of usersData?.users ?? []) {
    if (u.email) emailById.set(u.id, u.email);
  }

  const out: Recipient[] = [];
  for (const p of profiles as {
    id: string;
    full_name: string | null;
    role: string | null;
  }[]) {
    const email = emailById.get(p.id);
    if (p.full_name && email) {
      out.push({ name: p.full_name, email, role: p.role ?? "sales" });
    }
  }
  return out;
}

// Follow-ups that need action now: overdue + due today, soonest first.
export function dueFollowUps(clients: Client[]): Client[] {
  return clients
    .filter((c) => {
      const s = followUpState(c.nextFollowUp);
      return s === "overdue" || s === "today";
    })
    .sort((a, b) => (a.nextFollowUp! < b.nextFollowUp! ? -1 : 1));
}

function rowHtml(c: Client): string {
  const overdue = followUpState(c.nextFollowUp) === "overdue";
  const badge = overdue
    ? `<span style="background:#fee2e2;color:#b91c1c;border-radius:9999px;padding:2px 8px;font-size:12px;font-weight:600;">Overdue</span>`
    : `<span style="background:#fef3c7;color:#b45309;border-radius:9999px;padding:2px 8px;font-size:12px;font-weight:600;">Today</span>`;
  const sub = [c.location, c.phone].filter(Boolean).join(" · ");
  return `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #eee;">
        <a href="${APP_URL}/clients/${c.id}" style="color:#111;text-decoration:none;font-weight:600;font-size:15px;">${c.name}</a>
        <div style="color:#777;font-size:13px;margin-top:2px;">${sub}</div>
      </td>
      <td style="padding:12px 0;border-bottom:1px solid #eee;text-align:right;white-space:nowrap;">${badge}</td>
    </tr>`;
}

function shell(name: string, body: string): string {
  return `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111;">
    <p style="font-size:13px;letter-spacing:2px;color:${GOLD};text-transform:uppercase;margin:0 0 4px;">Servian Contracting · CRM</p>
    <h1 style="font-size:20px;margin:0 0 4px;">Good morning, ${name} ☀️</h1>
    ${body}
    <a href="${APP_URL}" style="display:inline-block;margin-top:24px;background:${GOLD};color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:600;font-size:14px;">Open the CRM</a>
    <p style="color:#999;font-size:12px;margin-top:24px;">Automated daily reminder from your Servian CRM.</p>
  </div>`;
}

function followUpEmailHtml(name: string, due: Client[]): string {
  const rows = due.map(rowHtml).join("");
  return shell(
    name,
    `<p style="color:#555;font-size:14px;margin:0 0 20px;">You have <strong>${due.length}</strong> follow-up${due.length === 1 ? "" : "s"} to handle today. Tap a name to open the client.</p>
     <table style="width:100%;border-collapse:collapse;">${rows}</table>`
  );
}

// ── Weekly Monday summary ───────────────────────────────────────────────────────

// A rotating motivational line — changes each week (by ISO week number).
const WEEKLY_QUOTES = [
  "New week, new opportunities — let's make it count! 💪",
  "Every follow-up is a chance to win the job. Go get them! 🚀",
  "Small steps every day close big deals. Keep pushing! 🔨",
  "The best time to reach a client is before they reach a competitor. ⏱️",
  "Consistency beats intensity. Show up for your clients this week. 🌟",
  "A quick call today can save a lost deal tomorrow. 📞",
  "Great work is built one client at a time. Let's build! 🏗️",
  "Stay close to your leads — momentum is everything. ⚡",
];

function weeklyQuote(d = new Date()): string {
  const oneJan = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(
    ((d.getTime() - oneJan.getTime()) / 86400000 + oneJan.getUTCDay() + 1) / 7
  );
  return WEEKLY_QUOTES[week % WEEKLY_QUOTES.length];
}

// Clients whose next follow-up falls within the next 7 days (this week's agenda).
export function weekAgenda(clients: Client[]): Client[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(today);
  end.setDate(end.getDate() + 7);
  return clients
    .filter((c) => {
      if (!c.nextFollowUp) return false;
      const due = new Date(c.nextFollowUp + "T00:00:00");
      return !isNaN(due.getTime()) && due <= end;
    })
    .sort((a, b) => (a.nextFollowUp! < b.nextFollowUp! ? -1 : 1));
}

function weeklyEmailHtml(name: string, week: Client[]): string {
  const quote = `<p style="background:#faf6ec;border-left:3px solid ${GOLD};padding:10px 14px;border-radius:6px;color:#7a5b1c;font-size:14px;font-style:italic;margin:0 0 20px;">${weeklyQuote()}</p>`;
  if (week.length === 0) {
    return shell(
      name,
      `${quote}
       <p style="color:#555;font-size:14px;margin:0 0 8px;">You have <strong>no follow-ups</strong> scheduled this week yet.</p>
       <p style="color:#555;font-size:14px;margin:0 0 20px;">Perfect time to get ahead: update your client records, plan your visits, and reach out to a lead or two. 💪</p>`
    );
  }
  const rows = week.map(rowHtml).join("");
  return shell(
    name,
    `${quote}
     <p style="color:#555;font-size:14px;margin:0 0 20px;">Here's your week: <strong>${week.length}</strong> follow-up${week.length === 1 ? "" : "s"} coming up. Tap a name to open the client.</p>
     <table style="width:100%;border-collapse:collapse;">${rows}</table>`
  );
}

export async function sendWeeklyEmail(to: string, name: string, week: Client[]) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  return resend.emails.send({
    from: FROM,
    to,
    subject: "🗓️ Your week at Servian — plan & priorities",
    html: weeklyEmailHtml(name, week),
  });
}

// Sends one salesperson their due follow-ups. Returns the Resend result.
export async function sendFollowUpEmail(
  to: string,
  name: string,
  due: Client[]
) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  return resend.emails.send({
    from: FROM,
    to,
    subject: `☀️ Your follow-ups today (${due.length})`,
    html: followUpEmailHtml(name, due),
  });
}
