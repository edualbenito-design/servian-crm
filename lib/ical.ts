import crypto from "crypto";

// A per-salesperson iCal feed lets each rep subscribe their phone calendar to
// their follow-ups (read-only, one direction CRM → phone). The feed URL carries
// the rep's name + a token derived from a server secret so it isn't guessable.

// Server-only secret used to sign feed tokens. Always present in every env.
function secret(): string {
  return (
    process.env.ICAL_SECRET ||
    process.env.CRON_SECRET ||
    process.env.SUPABASE_SECRET_KEY ||
    "servian-ical-fallback"
  );
}

export function icalToken(name: string): string {
  return crypto
    .createHmac("sha256", secret())
    .update(name.trim().toLowerCase())
    .digest("hex")
    .slice(0, 32);
}

export function verifyIcalToken(name: string, token: string): boolean {
  const expected = icalToken(name);
  if (token.length !== expected.length) return false;
  // Constant-time comparison.
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

// Base URL for building the public feed link (email/calendar clients need an
// absolute URL). Falls back to the known production URL.
export function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "https://servian-crm.vercel.app"
  );
}

export function icalFeedUrl(name: string): string {
  const u = encodeURIComponent(name);
  return `${appBaseUrl()}/api/ical?u=${u}&t=${icalToken(name)}`;
}

// ── ICS building ────────────────────────────────────────────────────────────────

export interface IcalEvent {
  uid: string;
  date: string; // YYYY-MM-DD (all-day)
  summary: string;
  description?: string;
}

function escapeText(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function ymd(date: string): string {
  return date.replace(/-/g, "");
}

function nextDayYmd(date: string): string {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(
    d.getUTCDate()
  ).padStart(2, "0")}`;
}

// Fold lines to 75 octets as the iCal spec recommends (keeps strict clients happy).
function fold(line: string): string {
  if (line.length <= 73) return line;
  const parts: string[] = [];
  let rest = line;
  parts.push(rest.slice(0, 73));
  rest = rest.slice(73);
  while (rest.length > 72) {
    parts.push(" " + rest.slice(0, 72));
    rest = rest.slice(72);
  }
  parts.push(" " + rest);
  return parts.join("\r\n");
}

export function buildICS(calName: string, events: IcalEvent[]): string {
  const stamp =
    new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Servian Contracting//CRM//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(calName)}`,
  ];
  for (const e of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.uid}@servian-crm`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${ymd(e.date)}`,
      `DTEND;VALUE=DATE:${nextDayYmd(e.date)}`,
      fold(`SUMMARY:${escapeText(e.summary)}`),
      ...(e.description ? [fold(`DESCRIPTION:${escapeText(e.description)}`)] : []),
      "END:VEVENT"
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}
