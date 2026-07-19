-- Allow "lost" as a project status (Active / On hold / Completed / Lost).
-- Drops any existing check (created early, directly in Supabase) and re-adds it
-- with the four allowed values. Existing rows only use the first three, so this
-- is safe to run.

alter table projects drop constraint if exists projects_status_check;
alter table projects add constraint projects_status_check
  check (status in ('active', 'on-hold', 'completed', 'lost'));
