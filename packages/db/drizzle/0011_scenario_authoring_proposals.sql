CREATE TABLE IF NOT EXISTS scenario_proposals (
  id text PRIMARY KEY NOT NULL,
  scenario_id text NOT NULL,
  revision_id text NOT NULL,
  base_version integer NOT NULL,
  tool_name text NOT NULL,
  summary text NOT NULL,
  operations jsonb NOT NULL,
  validation jsonb NOT NULL DEFAULT '{}'::jsonb,
  model text,
  prompt_version integer,
  status text NOT NULL DEFAULT 'ready',
  applied_version integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by text,
  updated_by text,
  version integer NOT NULL DEFAULT 1,
  schema_version integer NOT NULL DEFAULT 1,
  archived_at timestamptz,
  archived_by text,
  attribution jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS scenario_proposals_scenario_idx ON scenario_proposals (scenario_id, created_at);
CREATE INDEX IF NOT EXISTS scenario_proposals_status_idx ON scenario_proposals (status);
