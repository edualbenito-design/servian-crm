-- Follow-ups as tasks.
-- A follow-up is a task ("message the client on the 28th to collect the 1st
-- payment"). It belongs to a client and, usually, to a project. It stays
-- pending (and keeps alerting when overdue) until it's marked done or moved.
-- Every lifecycle action (done / move) carries a note (the "why").
--
-- Security: like the rest of the app, access is enforced on the server (service
-- key + getCurrentProfile), so RLS stays disabled here.

create extension if not exists pgcrypto;

create table if not exists public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  due_date date not null,
  note text,
  status text not null default 'pending', -- 'pending' | 'done'
  done_note text,                          -- what was done, added on completion
  done_at timestamptz,
  done_by text,
  created_by text,
  created_at timestamptz not null default now()
);

create index if not exists follow_ups_client_idx on public.follow_ups (client_id);
create index if not exists follow_ups_project_idx on public.follow_ups (project_id);
create index if not exists follow_ups_pending_due_idx
  on public.follow_ups (due_date) where status = 'pending';

-- Backfill the old single-date follow-ups (clients.next_follow_up + follow_up_note)
-- into pending tasks. Idempotent: skips clients that already have any follow-up.
insert into public.follow_ups (client_id, project_id, due_date, note, status)
select c.id, null, c.next_follow_up, c.follow_up_note, 'pending'
from public.clients c
where c.next_follow_up is not null
  and c.deleted_at is null
  and not exists (
    select 1 from public.follow_ups f where f.client_id = c.id
  );
