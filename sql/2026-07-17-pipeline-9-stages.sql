-- Pipeline redesign to 9 stages:
-- 1 New Lead · 2 Contacted · 3 Site Visit · 4 Quoted · 5 Negotiation ·
-- 6 Won (on site) · 7 Completed · 8 Lost · 9 Ghosting.
-- The old CHECK constraint capped pipeline_stage at 8, which blocked stage 9
-- (error 23514). Run in Supabase → SQL Editor. Safe to re-run.

ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_pipeline_stage_check;

-- Remap existing data: the OLD stage 8 meant "Project Completed"; in the new
-- scheme stage 8 is "Lost". Move those to the new "Completed" (7) so nothing is
-- mislabeled as lost. (Old stages 1–4 keep the same meaning; no rows exist at
-- old 5–7 in this database.)
UPDATE projects SET pipeline_stage = 7 WHERE pipeline_stage = 8;

ALTER TABLE projects
  ADD CONSTRAINT projects_pipeline_stage_check
  CHECK (pipeline_stage BETWEEN 1 AND 9);
