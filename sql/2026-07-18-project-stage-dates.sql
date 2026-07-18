-- Track when a project last changed pipeline stage, and when it reached an
-- outcome. Powers: idle/stale detection on the board, the "Cleanup" view of
-- cold deals, and real close-time analytics (roadmap "captured vs closed").
-- Safe to run anytime; the app already deploys resilient to these columns.

alter table projects add column if not exists stage_changed_at timestamptz;
alter table projects add column if not exists closed_at timestamptz;

-- Backfill: best available signal for the last stage move is the row creation.
update projects
   set stage_changed_at = created_at
 where stage_changed_at is null;

-- Seal closed_at for deals already in an outcome stage
-- (6 Won—On site, 7 Completed, 8 Lost, 9 Ghosting). No better timestamp exists
-- historically, so use created_at as a best effort.
update projects
   set closed_at = coalesce(closed_at, created_at)
 where pipeline_stage in (6, 7, 8, 9);
