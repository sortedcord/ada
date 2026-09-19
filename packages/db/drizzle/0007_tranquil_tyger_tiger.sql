CREATE TABLE "turn_stream_events" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "turn_stream_events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"turn_id" text NOT NULL,
	"event_key" text NOT NULL,
	"event_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "turn_stream_events_key_uq" ON "turn_stream_events" USING btree ("event_key");--> statement-breakpoint
CREATE INDEX "turn_stream_events_turn_idx" ON "turn_stream_events" USING btree ("turn_id","id");