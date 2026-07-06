-- Deletion (archive) with manager sign-off.
-- Adds soft-delete + deletion-request columns to clients and projects.
-- Run in Supabase → SQL Editor. Safe to run more than once (IF NOT EXISTS).

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by text,
  ADD COLUMN IF NOT EXISTS deletion_requested_by text,
  ADD COLUMN IF NOT EXISTS deletion_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS deletion_reason text;

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by text,
  ADD COLUMN IF NOT EXISTS deletion_requested_by text,
  ADD COLUMN IF NOT EXISTS deletion_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS deletion_reason text;
