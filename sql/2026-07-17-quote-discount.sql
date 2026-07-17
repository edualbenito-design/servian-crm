-- Optional discount on a quote: a percentage off the subtotal + a reason,
-- shown on the quote/invoice. VAT is charged on the discounted (net) amount.
-- Run in Supabase → SQL Editor. Safe to re-run. Writes are resilient: the app
-- still saves quotes without these columns, it just won't store the discount.

ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS discount_pct numeric,
  ADD COLUMN IF NOT EXISTS discount_reason text;
