-- The 0010-0012 migration files shipped without journal entries. Keep this
-- idempotent repair migration so fresh databases receive the current schema,
-- while existing databases can safely apply it regardless of prior state.

ALTER TABLE ai_invocations
  ADD COLUMN IF NOT EXISTS principal_kind text,
  ADD COLUMN IF NOT EXISTS principal_entity_id text,
  ADD COLUMN IF NOT EXISTS context_policy_version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS input_hash text,
  ADD COLUMN IF NOT EXISTS input_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS output_summary jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS ai_invocations_principal_idx
  ON ai_invocations (correlation_id, principal_entity_id, stage);

CREATE TABLE IF NOT EXISTS relationship_views (
  run_id text NOT NULL,
  branch_id text NOT NULL,
  owner_entity_id text NOT NULL,
  subject_entity_id text NOT NULL,
  dimensions jsonb NOT NULL DEFAULT '{}'::jsonb,
  summary text NOT NULL DEFAULT '',
  confidence real NOT NULL DEFAULT 1,
  source_evidence_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  version integer NOT NULL DEFAULT 1,
  schema_version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by text,
  updated_by text,
  archived_at timestamptz,
  archived_by text,
  attribution jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (run_id, branch_id, owner_entity_id, subject_entity_id)
);

CREATE INDEX IF NOT EXISTS relationship_views_owner_idx
  ON relationship_views (run_id, branch_id, owner_entity_id);

CREATE TABLE IF NOT EXISTS communications (
  id text PRIMARY KEY,
  run_id text NOT NULL,
  branch_id text NOT NULL,
  turn_id text NOT NULL,
  sender_entity_id text NOT NULL,
  recipient_entity_ids jsonb NOT NULL,
  medium text NOT NULL,
  body text NOT NULL,
  observable_envelope text NOT NULL,
  delivered boolean NOT NULL DEFAULT false,
  world_time timestamptz NOT NULL,
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

CREATE INDEX IF NOT EXISTS communications_run_turn_idx
  ON communications (run_id, branch_id, turn_id);

CREATE INDEX IF NOT EXISTS turn_stage_results_turn_stage_status_idx
  ON turn_stage_results (turn_id, stage, status);

CREATE TABLE IF NOT EXISTS entity_aliases (
  run_id text NOT NULL,
  branch_id text NOT NULL,
  owner_entity_id text NOT NULL,
  subject_entity_id text NOT NULL,
  alias text NOT NULL,
  identity_known boolean NOT NULL DEFAULT false,
  confidence real NOT NULL DEFAULT 0.5,
  source_evidence_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  first_learned_turn integer NOT NULL,
  last_updated_turn integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by text,
  updated_by text,
  version integer NOT NULL DEFAULT 1,
  schema_version integer NOT NULL DEFAULT 1,
  archived_at timestamptz,
  archived_by text,
  attribution jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (run_id, branch_id, owner_entity_id, subject_entity_id)
);

CREATE INDEX IF NOT EXISTS entity_aliases_owner_idx
  ON entity_aliases (run_id, branch_id, owner_entity_id);

CREATE TABLE IF NOT EXISTS scenario_proposals (
  id text PRIMARY KEY,
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

CREATE INDEX IF NOT EXISTS scenario_proposals_scenario_idx
  ON scenario_proposals (scenario_id, created_at);
CREATE INDEX IF NOT EXISTS scenario_proposals_status_idx
  ON scenario_proposals (status);

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

CREATE INDEX IF NOT EXISTS story_card_mutation_proposals_card_idx
  ON story_card_mutation_proposals (card_id, created_at);
CREATE INDEX IF NOT EXISTS story_card_mutation_proposals_status_idx
  ON story_card_mutation_proposals (status);
