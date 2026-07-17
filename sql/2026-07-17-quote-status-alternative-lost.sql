-- Quote statuses: allow "alternative" (not chosen because another quote of the
-- same project won — no loss) and "lost" (client didn't go ahead — a real loss).
-- The old CHECK constraint only allowed draft/sent/accepted/rejected, which
-- blocked the new values (error 23514). "rejected" is kept for legacy rows.
-- Run in Supabase → SQL Editor. Safe to re-run.

ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_status_check;

ALTER TABLE quotes
  ADD CONSTRAINT quotes_status_check
  CHECK (status IN ('draft', 'sent', 'accepted', 'alternative', 'lost', 'rejected'));
