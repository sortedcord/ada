CREATE TABLE IF NOT EXISTS story_card_mutation_proposals (
  id text PRIMARY KEY NOT NULL,
  card_id text NOT NULL,
  expected_version integer NOT NULL,
  mode text NOT NULL,
  path text NOT NULL,
  operations jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_scopes jsonb NOT NULL DEFAULT '[]'::jsonb,
  target_scope text NOT NULL,
  reason text NOT NULL,
  semantic_summary text NOT NULL,
  confidence real NOT NULL,
  contradictions jsonb NOT NULL DEFAULT '[]'::jsonb,
  validation jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'ready',
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
CREATE INDEX IF NOT EXISTS story_card_mutation_proposals_card_idx ON story_card_mutation_proposals (card_id, created_at);
CREATE INDEX IF NOT EXISTS story_card_mutation_proposals_status_idx ON story_card_mutation_proposals (status);
