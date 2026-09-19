CREATE TABLE "outbox" (
	"id" text PRIMARY KEY NOT NULL,
	"topic" text NOT NULL,
	"key" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
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
CREATE UNIQUE INDEX "outbox_topic_key_uq" ON "outbox" USING btree ("topic","key");--> statement-breakpoint
CREATE INDEX "outbox_pending_idx" ON "outbox" USING btree ("status","available_at");