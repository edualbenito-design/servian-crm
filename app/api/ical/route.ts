import { getFollowUpAgenda } from "@/lib/db";
import { verifyIcalToken, buildICS, appBaseUrl, type IcalEvent } from "@/lib/ical";

export const dynamic = "force-dynamic";

// Personal follow-up calendar feed for one salesperson. Read-only, public but
// unguessable (name + token). Subscribe URL: /api/ical?u=<name>&t=<token>.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const name = url.searchParams.get("u")?.trim();
  const token = url.searchParams.get("t")?.trim();

  if (!name || !token || !verifyIcalToken(name, token)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const agenda = await getFollowUpAgenda(name);
  const base = appBaseUrl();

  const events: IcalEvent[] = agenda
    .filter((f) => f.status === "pending" && f.dueDate)
    .map((f) => {
      const summary = f.note ? `${f.name}: ${f.note}` : `Follow-up: ${f.name}`;
      const descLines = [
        f.projectName ? `Project: ${f.projectName}` : "",
        f.location ? `Location: ${f.location}` : "",
        f.phone ? `Phone: ${f.phone}` : "",
        `Open: ${base}/clients/${f.clientId}`,
      ].filter(Boolean);
      return {
        uid: f.followUpId,
        date: f.dueDate,
        summary,
        description: descLines.join("\n"),
      };
    });

  const ics = buildICS(`Servian CRM — ${name}`, events);

  return new Response(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="servian-${name.toLowerCase()}.ics"`,
      "Cache-Control": "no-cache",
    },
  });
}
