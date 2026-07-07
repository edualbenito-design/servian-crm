-- Site progress: construction milestones per project.
-- Stored as a jsonb array on the project (like team_members / suppliers), each
-- item { id, label, pct, done, doneAt }. `pct` is the cumulative % of the whole
-- job reached when that stage is done; overall progress = highest done pct.
--
-- Resilient: read with `select *` and defaults to [] if absent, so the app keeps
-- working before this runs. Editing milestones needs it applied.

alter table public.projects
  add column if not exists milestones jsonb not null default '[]'::jsonb;
