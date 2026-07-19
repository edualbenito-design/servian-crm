-- Manager -> commercial alerts on a client (optionally about a specific project),
-- as a small two-way thread. RLS stays disabled; the server enforces access.

create table if not exists alerts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null,
  project_id uuid,
  created_by text,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  sales_read_at timestamptz,
  manager_read_at timestamptz,
  resolved_by text,
  resolved_at timestamptz
);

create table if not exists alert_messages (
  id uuid primary key default gen_random_uuid(),
  alert_id uuid not null references alerts(id) on delete cascade,
  author text,
  author_role text,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_alerts_client on alerts(client_id);
create index if not exists idx_alerts_status on alerts(status);
create index if not exists idx_alert_messages_alert on alert_messages(alert_id);
