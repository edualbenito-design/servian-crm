-- Optional attachments for payments and follow-ups.
-- A single optional file per row (path + original name): the bank-transfer
-- screenshot the client sends for a payment, or a conversation screenshot on a
-- follow-up. The file itself lives in the private "project-files" Storage bucket;
-- these columns just hold its path + display name.
--
-- Resilient: the app reads these with `select *` and fails soft, so it keeps
-- working before this runs. Uploading an attachment only works once it's applied.

alter table public.payments
  add column if not exists receipt_path text,
  add column if not exists receipt_name text;

alter table public.follow_ups
  add column if not exists attachment_path text,
  add column if not exists attachment_name text;
