-- Payment milestone label (First / Second / Final payment, etc.).
-- Run in Supabase → SQL Editor. Safe to re-run. Writes are resilient: the app
-- still records payments without this column, it just won't store the label.

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS milestone text;
