CREATE TABLE "run_relationship_state" (
	"run_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"relationship_id" text NOT NULL,
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
	CONSTRAINT "run_relationship_state_run_id_branch_id_relationship_id_pk" PRIMARY KEY("run_id","branch_id","relationship_id")
);
