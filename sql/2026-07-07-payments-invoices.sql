-- Payments & invoices.
-- Payments are recorded against an accepted quote; invoice fields let an accepted
-- quote be issued as a TAX INVOICE. Run in Supabase → SQL Editor. Safe to re-run.

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid REFERENCES quotes(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  method text,                       -- cash | bank | cheque | card | other
  paid_on date,
  note text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS stays disabled here to match the rest of the schema (access is enforced
-- in the server layer). Kept explicit for clarity.
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS payments_quote_id_idx ON payments(quote_id);
CREATE INDEX IF NOT EXISTS payments_client_id_idx ON payments(client_id);

-- Invoice issuance on an accepted quote.
ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS invoice_number text,
  ADD COLUMN IF NOT EXISTS invoiced_at timestamptz;
