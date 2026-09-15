import crypto from "crypto";
import { appBaseUrl } from "./ical";

// Public, shareable quote/invoice links so a salesperson can send a client the
// document over WhatsApp. The link carries the quote id + a token derived from a
// server secret, so it's unguessable and read-only (no login needed to view it).

function secret(): string {
  return (
    process.env.ICAL_SECRET ||
    process.env.CRON_SECRET ||
    process.env.SUPABASE_SECRET_KEY ||
    "servian-quote-fallback"
  );
}

export function quoteToken(id: string): string {
  return crypto
    .createHmac("sha256", secret())
    .update(`quote:${id}`)
    .digest("hex")
    .slice(0, 32);
}

export function verifyQuoteToken(id: string, token: string): boolean {
  const expected = quoteToken(id);
  if (!token || token.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

// Absolute, public link to view a quote (or its tax invoice) without logging in.
export function publicQuoteUrl(id: string, variant: "quote" | "invoice" = "quote"): string {
  const doc = variant === "invoice" ? "&doc=invoice" : "";
  return `${appBaseUrl()}/quotes/${id}?t=${quoteToken(id)}${doc}`;
}
