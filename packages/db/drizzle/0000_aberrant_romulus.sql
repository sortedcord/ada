CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pgcrypto;--> statement-breakpoint
CREATE TABLE "actions" (
	"id" text PRIMARY KEY NOT NULL,
	"turn_id" text NOT NULL,
	"actor_entity_id" text NOT NULL,
	"action_type" text NOT NULL,
	"targets" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"intent" text NOT NULL,
	"assumptions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"visibility" text NOT NULL,
	"source" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"version" integer DEFAULT 1 NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"archived_at" timestamp with time zone,
	"archived_by" text,
	"attribution" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_invocations" (
	"id" text PRIMARY KEY NOT NULL,
	"role" text NOT NULL,
	"stage" text NOT NULL,
	"provider" text NOT NULL,
	"model_id" text NOT NULL,
	"prompt_version_id" text NOT NULL,
	"authorized_document_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"usage" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"latency_ms" integer,
	"validation" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"correlation_id" text NOT NULL,
	"raw_retention" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"version" integer DEFAULT 1 NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"archived_at" timestamp with time zone,
	"archived_by" text,
	"attribution" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"secret_reference" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"version" integer DEFAULT 1 NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"archived_at" timestamp with time zone,
	"archived_by" text,
	"attribution" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "architect_state" (
	"run_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"state" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"version" integer DEFAULT 1 NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"archived_at" timestamp with time zone,
	"archived_by" text,
	"attribution" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "architect_state_run_id_branch_id_pk" PRIMARY KEY("run_id","branch_id")
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"actor" text NOT NULL,
	"action" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text NOT NULL,
	"before_ref" jsonb,
	"after_ref" jsonb,
	"bounded_diff" jsonb,
	"request_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"version" integer DEFAULT 1 NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"archived_at" timestamp with time zone,
	"archived_by" text,
	"attribution" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "belief_evidence" (
	"belief_id" text NOT NULL,
	"evidence_type" text NOT NULL,
	"evidence_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"version" integer DEFAULT 1 NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"archived_at" timestamp with time zone,
	"archived_by" text,
	"attribution" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "belief_evidence_belief_id_evidence_type_evidence_id_pk" PRIMARY KEY("belief_id","evidence_type","evidence_id")
);
--> statement-breakpoint
CREATE TABLE "beliefs" (
	"id" text PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"owner_entity_id" text NOT NULL,
	"proposition" jsonb NOT NULL,
	"rendering" text NOT NULL,
	"confidence" integer NOT NULL,
	"status" text NOT NULL,
	"evidence" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"salience" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"version" integer DEFAULT 1 NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"archived_at" timestamp with time zone,
	"archived_by" text,
	"attribution" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chunk_embeddings" (
	"chunk_id" text NOT NULL,
	"embedding_profile_id" text NOT NULL,
	"model_id" text NOT NULL,
	"dimensions" integer NOT NULL,
	"content_hash" text NOT NULL,
	"embedding" vector NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"version" integer DEFAULT 1 NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"archived_at" timestamp with time zone,
	"archived_by" text,
	"attribution" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "chunk_embeddings_chunk_id_embedding_profile_id_pk" PRIMARY KEY("chunk_id","embedding_profile_id")
);
--> statement-breakpoint
CREATE TABLE "embedding_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"model_id" text NOT NULL,
	"dimensions" integer NOT NULL,
	"distance" text NOT NULL,
	"status" text NOT NULL,
	"generation" integer DEFAULT 1 NOT NULL,
	"active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"version" integer DEFAULT 1 NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"archived_at" timestamp with time zone,
	"archived_by" text,
	"attribution" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entities" (
	"id" text PRIMARY KEY NOT NULL,
	"revision_id" text NOT NULL,
	"name" text NOT NULL,
	"aliases" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"kind" text NOT NULL,
	"public_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"private_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"playable" boolean DEFAULT false NOT NULL,
	"cognitive" boolean DEFAULT false NOT NULL,
	"alive" boolean DEFAULT true NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"starting_location_id" text,
	"mutation_policy" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"version" integer DEFAULT 1 NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"archived_at" timestamp with time zone,
	"archived_by" text,
	"attribution" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entity_relationships" (
	"id" text PRIMARY KEY NOT NULL,
	"revision_id" text NOT NULL,
	"source_entity_id" text NOT NULL,
	"target_entity_id" text NOT NULL,
	"relationship_type" text NOT NULL,
	"public_state" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_private_state" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"canonical_facts" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"dimensions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"history_summary" text,
	"last_changed_turn" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"version" integer DEFAULT 1 NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"archived_at" timestamp with time zone,
	"archived_by" text,
	"attribution" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_facts" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"visibility" text NOT NULL,
	"source" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"version" integer DEFAULT 1 NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"archived_at" timestamp with time zone,
	"archived_by" text,
	"attribution" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_participants" (
	"event_id" text NOT NULL,
	"entity_id" text NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"version" integer DEFAULT 1 NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"archived_at" timestamp with time zone,
	"archived_by" text,
	"attribution" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "event_participants_event_id_entity_id_pk" PRIMARY KEY("event_id","entity_id")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" text PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"turn_id" text NOT NULL,
	"event_type" text NOT NULL,
	"location_id" text NOT NULL,
	"world_time" timestamp with time zone NOT NULL,
	"canonical_description" text NOT NULL,
	"visibility_hints" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"salience" integer NOT NULL,
	"emotional_weight" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"version" integer DEFAULT 1 NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"archived_at" timestamp with time zone,
	"archived_by" text,
	"attribution" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inner_thoughts" (
	"id" text PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"owner_entity_id" text NOT NULL,
	"turn_id" text NOT NULL,
	"triggering_event_id" text,
	"text" text NOT NULL,
	"persistence" text NOT NULL,
	"salience" integer NOT NULL,
	"urgency" integer NOT NULL,
	"emotional_valence" integer NOT NULL,
	"emotional_intensity" integer NOT NULL,
	"expires_at_turn" integer,
	"reinforcement_count" integer DEFAULT 0 NOT NULL,
	"status" text NOT NULL,
	"player_inspectable" boolean NOT NULL,
	"visibility" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"version" integer DEFAULT 1 NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"archived_at" timestamp with time zone,
	"archived_by" text,
	"attribution" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"queue" text NOT NULL,
	"job_key" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"heartbeat_at" timestamp with time zone,
	"stage" text,
	"status" text NOT NULL,
	"safe_error" jsonb,
	"started_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"version" integer DEFAULT 1 NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"archived_at" timestamp with time zone,
	"archived_by" text,
	"attribution" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "location_edges" (
	"id" text PRIMARY KEY NOT NULL,
	"revision_id" text NOT NULL,
	"source_location_id" text NOT NULL,
	"destination_location_id" text NOT NULL,
	"directed" boolean NOT NULL,
	"travel_text" text,
	"travel_time" integer,
	"travel_cost" integer,
	"access_requirements" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"discoverability" integer NOT NULL,
	"blocked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"version" integer DEFAULT 1 NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"archived_at" timestamp with time zone,
	"archived_by" text,
	"attribution" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" text PRIMARY KEY NOT NULL,
	"revision_id" text NOT NULL,
	"name" text NOT NULL,
	"aliases" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"location_type" text NOT NULL,
	"parent_location_id" text,
	"public_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"private_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"coordinates" jsonb,
	"environment" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"access" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"sensory_properties" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"hazards" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"mutation_policy" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"version" integer DEFAULT 1 NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"archived_at" timestamp with time zone,
	"archived_by" text,
	"attribution" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memories" (
	"id" text PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"owner_entity_id" text NOT NULL,
	"memory_type" text NOT NULL,
	"content" text NOT NULL,
	"importance" integer NOT NULL,
	"emotional_valence" integer NOT NULL,
	"emotional_intensity" integer NOT NULL,
	"confidence" integer NOT NULL,
	"accessibility" integer NOT NULL,
	"decay_rate" integer NOT NULL,
	"lifecycle_status" text NOT NULL,
	"source_links" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"reinforced_turn" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"version" integer DEFAULT 1 NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"archived_at" timestamp with time zone,
	"archived_by" text,
	"attribution" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memory_links" (
	"memory_id" text NOT NULL,
	"source_type" text NOT NULL,
	"source_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"version" integer DEFAULT 1 NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"archived_at" timestamp with time zone,
	"archived_by" text,
	"attribution" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "memory_links_memory_id_source_type_source_id_pk" PRIMARY KEY("memory_id","source_type","source_id")
);
--> statement-breakpoint
CREATE TABLE "narrative_segments" (
	"id" text PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"turn_id" text NOT NULL,
	"segment_type" text NOT NULL,
	"event_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"speaker_entity_id" text,
	"segment_order" integer NOT NULL,
	"visibility" text NOT NULL,
	"text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"version" integer DEFAULT 1 NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"archived_at" timestamp with time zone,
	"archived_by" text,
	"attribution" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "observations" (
	"id" text PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"observer_entity_id" text NOT NULL,
	"source_event_id" text NOT NULL,
	"modality" text NOT NULL,
	"perceived_content" text NOT NULL,
	"detail" integer NOT NULL,
	"confidence" integer NOT NULL,
	"distortion" text,
	"occluded" boolean NOT NULL,
	"observed_turn" integer NOT NULL,
	"visibility" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"version" integer DEFAULT 1 NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"archived_at" timestamp with time zone,
	"archived_by" text,
	"attribution" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plot_arcs" (
	"id" text PRIMARY KEY NOT NULL,
	"revision_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"priority" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"version" integer DEFAULT 1 NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"archived_at" timestamp with time zone,
	"archived_by" text,
	"attribution" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plot_point_links" (
	"point_id" text NOT NULL,
	"depends_on_point_id" text NOT NULL,
	"relation_type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"version" integer DEFAULT 1 NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"archived_at" timestamp with time zone,
	"archived_by" text,
	"attribution" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "plot_point_links_point_id_depends_on_point_id_pk" PRIMARY KEY("point_id","depends_on_point_id")
);
--> statement-breakpoint
CREATE TABLE "plot_points" (
	"id" text PRIMARY KEY NOT NULL,
	"arc_id" text NOT NULL,
	"revision_id" text NOT NULL,
	"title" text NOT NULL,
	"internal_description" text,
	"source" text NOT NULL,
	"priority" integer NOT NULL,
	"status" text NOT NULL,
	"conditions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"outcomes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"involved_entity_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"involved_location_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"visibility" text NOT NULL,
	"timing" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"version" integer DEFAULT 1 NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"archived_at" timestamp with time zone,
	"archived_by" text,
	"attribution" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prompt_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"prompt_version" integer NOT NULL,
	"prompt_hash" text NOT NULL,
	"output_schema" jsonb NOT NULL,
	"privacy_class" text NOT NULL,
	"active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"version" integer DEFAULT 1 NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"archived_at" timestamp with time zone,
	"archived_by" text,
	"attribution" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_model_cache" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"model_id" text NOT NULL,
	"descriptor" jsonb NOT NULL,
	"retrieved_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"last_known_good" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"version" integer DEFAULT 1 NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"archived_at" timestamp with time zone,
	"archived_by" text,
	"attribution" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "retrieval_audit" (
	"id" text PRIMARY KEY NOT NULL,
	"principal" jsonb NOT NULL,
	"query_metadata" jsonb NOT NULL,
	"selected_chunk_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"rejected_chunk_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"scores" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"budget_decisions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"duration_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"version" integer DEFAULT 1 NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"archived_at" timestamp with time zone,
	"archived_by" text,
	"attribution" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "retrieval_chunks" (
	"id" text PRIMARY KEY NOT NULL,
	"document_id" text NOT NULL,
	"text" text NOT NULL,
	"search_vector" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_links" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"turn_from" integer,
	"turn_to" integer,
	"importance" integer NOT NULL,
	"salience" integer NOT NULL,
	"recency_at" timestamp with time zone,
	"content_hash" text NOT NULL,
	"visibility" text NOT NULL,
	"owner_entity_id" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"version" integer DEFAULT 1 NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"archived_at" timestamp with time zone,
	"archived_by" text,
	"attribution" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "retrieval_documents" (
	"id" text PRIMARY KEY NOT NULL,
	"source_type" text NOT NULL,
	"source_id" text NOT NULL,
	"source_version" integer NOT NULL,
	"run_id" text,
	"scenario_id" text,
	"branch_id" text,
	"visibility" text NOT NULL,
	"owner_entity_id" text,
	"content_hash" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"version" integer DEFAULT 1 NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"archived_at" timestamp with time zone,
	"archived_by" text,
	"attribution" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "run_branches" (
	"id" text PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"parent_branch_id" text,
	"fork_turn" integer NOT NULL,
	"label" text NOT NULL,
	"active" boolean DEFAULT false NOT NULL,
	"canonical" boolean DEFAULT false NOT NULL,
	"creation_reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"version" integer DEFAULT 1 NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"archived_at" timestamp with time zone,
	"archived_by" text,
	"attribution" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "run_entity_state" (
	"run_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"entity_id" text NOT NULL,
	"state" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"version" integer DEFAULT 1 NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"archived_at" timestamp with time zone,
	"archived_by" text,
	"attribution" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "run_entity_state_run_id_branch_id_entity_id_pk" PRIMARY KEY("run_id","branch_id","entity_id")
);
--> statement-breakpoint
CREATE TABLE "run_location_state" (
	"run_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"location_id" text NOT NULL,
	"state" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"version" integer DEFAULT 1 NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"archived_at" timestamp with time zone,
	"archived_by" text,
	"attribution" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "run_location_state_run_id_branch_id_location_id_pk" PRIMARY KEY("run_id","branch_id","location_id")
);
--> statement-breakpoint
CREATE TABLE "run_snapshots" (
	"id" text PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"turn" integer NOT NULL,
	"projection_versions" jsonb NOT NULL,
	"checksum" text NOT NULL,
	"serialized_state" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"version" integer DEFAULT 1 NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"archived_at" timestamp with time zone,
	"archived_by" text,
	"attribution" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "run_story_card_state" (
	"run_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"card_id" text NOT NULL,
	"state" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"version" integer DEFAULT 1 NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"archived_at" timestamp with time zone,
	"archived_by" text,
	"attribution" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "run_story_card_state_run_id_branch_id_card_id_pk" PRIMARY KEY("run_id","branch_id","card_id")
);
--> statement-breakpoint
CREATE TABLE "runs" (
	"id" text PRIMARY KEY NOT NULL,
	"scenario_revision_id" text NOT NULL,
	"player_entity_id" text NOT NULL,
	"active_branch_id" text,
	"status" text NOT NULL,
	"current_turn" integer DEFAULT 0 NOT NULL,
	"expected_version" integer DEFAULT 1 NOT NULL,
	"world_time" timestamp with time zone NOT NULL,
	"random_seed" integer NOT NULL,
	"narrative_settings" jsonb NOT NULL,
	"role_settings_snapshot" jsonb NOT NULL,
	"retrieval_profile_snapshot" jsonb NOT NULL,
	"last_successful_snapshot_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"version" integer DEFAULT 1 NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"archived_at" timestamp with time zone,
	"archived_by" text,
	"attribution" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scenario_revisions" (
	"id" text PRIMARY KEY NOT NULL,
	"scenario_id" text NOT NULL,
	"revision_number" integer NOT NULL,
	"status" text NOT NULL,
	"aggregate" jsonb NOT NULL,
	"checksum" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"version" integer DEFAULT 1 NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"archived_at" timestamp with time zone,
	"archived_by" text,
	"attribution" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scenarios" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"status" text NOT NULL,
	"current_revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"version" integer DEFAULT 1 NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"archived_at" timestamp with time zone,
	"archived_by" text,
	"attribution" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "story_card_links" (
	"id" text PRIMARY KEY NOT NULL,
	"card_id" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"relation_type" text NOT NULL,
	"weight" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"version" integer DEFAULT 1 NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"archived_at" timestamp with time zone,
	"archived_by" text,
	"attribution" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "story_card_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"card_id" text NOT NULL,
	"body" jsonb NOT NULL,
	"scope" text NOT NULL,
	"source" text NOT NULL,
	"diff" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"version" integer DEFAULT 1 NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"archived_at" timestamp with time zone,
	"archived_by" text,
	"attribution" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "story_cards" (
	"id" text PRIMARY KEY NOT NULL,
	"revision_id" text NOT NULL,
	"title" text NOT NULL,
	"card_type" text NOT NULL,
	"mutation_policy" text NOT NULL,
	"locked" boolean DEFAULT false NOT NULL,
	"current_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"version" integer DEFAULT 1 NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"archived_at" timestamp with time zone,
	"archived_by" text,
	"attribution" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "turn_stage_results" (
	"id" text PRIMARY KEY NOT NULL,
	"turn_id" text NOT NULL,
	"stage" text NOT NULL,
	"input_snapshot" jsonb NOT NULL,
	"provider_result_ref" jsonb,
	"validated_output" jsonb,
	"application_key" text NOT NULL,
	"retries" integer DEFAULT 0 NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"version" integer DEFAULT 1 NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"archived_at" timestamp with time zone,
	"archived_by" text,
	"attribution" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "turns" (
	"id" text PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"turn_number" integer NOT NULL,
	"parent_turn_id" text,
	"raw_player_input" text NOT NULL,
	"parsed_intent" jsonb,
	"status" text NOT NULL,
	"stage" text NOT NULL,
	"failure" jsonb,
	"final_narrative" text,
	"idempotency_key" text NOT NULL,
	"expected_version" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"version" integer DEFAULT 1 NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"archived_at" timestamp with time zone,
	"archived_by" text,
	"attribution" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE INDEX "ai_invocations_correlation_idx" ON "ai_invocations" USING btree ("correlation_id");--> statement-breakpoint
CREATE INDEX "audit_log_resource_idx" ON "audit_log" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "beliefs_owner_active_idx" ON "beliefs" USING btree ("run_id","owner_entity_id","status");--> statement-breakpoint
CREATE INDEX "chunk_embeddings_profile_idx" ON "chunk_embeddings" USING btree ("embedding_profile_id");--> statement-breakpoint
CREATE INDEX "entities_revision_idx" ON "entities" USING btree ("revision_id");--> statement-breakpoint
CREATE UNIQUE INDEX "entity_relationships_directional_uq" ON "entity_relationships" USING btree ("revision_id","source_entity_id","target_entity_id","relationship_type");--> statement-breakpoint
CREATE INDEX "events_run_timeline_idx" ON "events" USING btree ("run_id","branch_id","turn_id");--> statement-breakpoint
CREATE INDEX "inner_thoughts_owner_active_idx" ON "inner_thoughts" USING btree ("run_id","owner_entity_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "job_runs_queue_key_uq" ON "job_runs" USING btree ("queue","job_key");--> statement-breakpoint
CREATE INDEX "location_edges_source_idx" ON "location_edges" USING btree ("source_location_id");--> statement-breakpoint
CREATE INDEX "location_edges_destination_idx" ON "location_edges" USING btree ("destination_location_id");--> statement-breakpoint
CREATE INDEX "locations_revision_idx" ON "locations" USING btree ("revision_id");--> statement-breakpoint
CREATE INDEX "locations_parent_idx" ON "locations" USING btree ("parent_location_id");--> statement-breakpoint
CREATE INDEX "memories_owner_active_idx" ON "memories" USING btree ("run_id","owner_entity_id","lifecycle_status");--> statement-breakpoint
CREATE UNIQUE INDEX "narrative_segments_turn_version_order_uq" ON "narrative_segments" USING btree ("turn_id","version","segment_order");--> statement-breakpoint
CREATE INDEX "observations_owner_idx" ON "observations" USING btree ("run_id","observer_entity_id");--> statement-breakpoint
CREATE INDEX "plot_points_active_idx" ON "plot_points" USING btree ("revision_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "prompt_versions_name_version_uq" ON "prompt_versions" USING btree ("name","prompt_version");--> statement-breakpoint
CREATE UNIQUE INDEX "provider_model_cache_provider_model_uq" ON "provider_model_cache" USING btree ("provider","model_id");--> statement-breakpoint
CREATE INDEX "retrieval_chunks_active_scope_idx" ON "retrieval_chunks" USING btree ("visibility","owner_entity_id","active");--> statement-breakpoint
CREATE INDEX "retrieval_documents_scope_idx" ON "retrieval_documents" USING btree ("run_id","branch_id","visibility");--> statement-breakpoint
CREATE INDEX "run_branches_run_idx" ON "run_branches" USING btree ("run_id");--> statement-breakpoint
CREATE UNIQUE INDEX "run_branches_active_uq" ON "run_branches" USING btree ("run_id","active");--> statement-breakpoint
CREATE UNIQUE INDEX "scenario_revisions_scenario_revision_uq" ON "scenario_revisions" USING btree ("scenario_id","revision_number");--> statement-breakpoint
CREATE UNIQUE INDEX "scenarios_slug_uq" ON "scenarios" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "story_card_links_target_idx" ON "story_card_links" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE UNIQUE INDEX "story_card_versions_card_version_uq" ON "story_card_versions" USING btree ("card_id","version");--> statement-breakpoint
CREATE INDEX "story_cards_current_idx" ON "story_cards" USING btree ("revision_id","current_version");--> statement-breakpoint
CREATE UNIQUE INDEX "turn_stage_results_application_uq" ON "turn_stage_results" USING btree ("turn_id","application_key");--> statement-breakpoint
CREATE UNIQUE INDEX "turns_run_branch_number_uq" ON "turns" USING btree ("run_id","branch_id","turn_number");--> statement-breakpoint
CREATE UNIQUE INDEX "turns_idempotency_uq" ON "turns" USING btree ("run_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "turns_timeline_idx" ON "turns" USING btree ("run_id","branch_id","turn_number");--> statement-breakpoint
ALTER TABLE "scenario_revisions" ADD CONSTRAINT "scenario_revisions_scenario_fk" FOREIGN KEY ("scenario_id") REFERENCES "scenarios"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "entities" ADD CONSTRAINT "entities_revision_fk" FOREIGN KEY ("revision_id") REFERENCES "scenario_revisions"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_revision_fk" FOREIGN KEY ("revision_id") REFERENCES "scenario_revisions"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "location_edges" ADD CONSTRAINT "location_edges_revision_fk" FOREIGN KEY ("revision_id") REFERENCES "scenario_revisions"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "entity_relationships" ADD CONSTRAINT "entity_relationships_revision_fk" FOREIGN KEY ("revision_id") REFERENCES "scenario_revisions"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "story_cards" ADD CONSTRAINT "story_cards_revision_fk" FOREIGN KEY ("revision_id") REFERENCES "scenario_revisions"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "story_card_versions" ADD CONSTRAINT "story_card_versions_card_fk" FOREIGN KEY ("card_id") REFERENCES "story_cards"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "story_card_links" ADD CONSTRAINT "story_card_links_card_fk" FOREIGN KEY ("card_id") REFERENCES "story_cards"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "plot_arcs" ADD CONSTRAINT "plot_arcs_revision_fk" FOREIGN KEY ("revision_id") REFERENCES "scenario_revisions"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "plot_points" ADD CONSTRAINT "plot_points_arc_fk" FOREIGN KEY ("arc_id") REFERENCES "plot_arcs"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "plot_points" ADD CONSTRAINT "plot_points_revision_fk" FOREIGN KEY ("revision_id") REFERENCES "scenario_revisions"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "runs" ADD CONSTRAINT "runs_revision_fk" FOREIGN KEY ("scenario_revision_id") REFERENCES "scenario_revisions"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "run_branches" ADD CONSTRAINT "run_branches_run_fk" FOREIGN KEY ("run_id") REFERENCES "runs"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "turns" ADD CONSTRAINT "turns_run_fk" FOREIGN KEY ("run_id") REFERENCES "runs"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "turns" ADD CONSTRAINT "turns_branch_fk" FOREIGN KEY ("branch_id") REFERENCES "run_branches"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "turn_stage_results" ADD CONSTRAINT "turn_stage_results_turn_fk" FOREIGN KEY ("turn_id") REFERENCES "turns"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "actions" ADD CONSTRAINT "actions_turn_fk" FOREIGN KEY ("turn_id") REFERENCES "turns"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_turn_fk" FOREIGN KEY ("turn_id") REFERENCES "turns"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "event_participants" ADD CONSTRAINT "event_participants_event_fk" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "event_facts" ADD CONSTRAINT "event_facts_event_fk" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "observations" ADD CONSTRAINT "observations_event_fk" FOREIGN KEY ("source_event_id") REFERENCES "events"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "narrative_segments" ADD CONSTRAINT "narrative_segments_turn_fk" FOREIGN KEY ("turn_id") REFERENCES "turns"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "retrieval_chunks" ADD CONSTRAINT "retrieval_chunks_document_fk" FOREIGN KEY ("document_id") REFERENCES "retrieval_documents"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "chunk_embeddings" ADD CONSTRAINT "chunk_embeddings_chunk_fk" FOREIGN KEY ("chunk_id") REFERENCES "retrieval_chunks"("id") ON DELETE RESTRICT;