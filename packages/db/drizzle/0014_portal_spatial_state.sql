-- Stateful authored portal edges support spatial occlusion and closed-boundary perception.
CREATE TABLE IF NOT EXISTS run_portal_state (
  run_id text NOT NULL,
  branch_id text NOT NULL,
  portal_id text NOT NULL,
  state text NOT NULL,
  transmission jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by text,
  updated_by text,
  version integer NOT NULL DEFAULT 1,
  schema_version integer NOT NULL DEFAULT 1,
  archived_at timestamptz,
  archived_by text,
  attribution jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (run_id, branch_id, portal_id)
);

CREATE INDEX IF NOT EXISTS run_portal_state_branch_idx
  ON run_portal_state (run_id, branch_id);
