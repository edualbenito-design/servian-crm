-- Activity timeline for the Servian CRM
CREATE TABLE IF NOT EXISTS activities (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  type        text NOT NULL CHECK (type IN ('note','client_updated','project_created','project_updated','stage_changed')),
  description text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE activities DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS activities_client_id_idx ON activities(client_id);
