ALTER TABLE "beliefs" ALTER COLUMN "confidence" SET DATA TYPE real;--> statement-breakpoint
ALTER TABLE "beliefs" ALTER COLUMN "salience" SET DATA TYPE real;--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "salience" SET DATA TYPE real;--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "emotional_weight" SET DATA TYPE real;--> statement-breakpoint
ALTER TABLE "inner_thoughts" ALTER COLUMN "salience" SET DATA TYPE real;--> statement-breakpoint
ALTER TABLE "inner_thoughts" ALTER COLUMN "urgency" SET DATA TYPE real;--> statement-breakpoint
ALTER TABLE "inner_thoughts" ALTER COLUMN "emotional_valence" SET DATA TYPE real;--> statement-breakpoint
ALTER TABLE "inner_thoughts" ALTER COLUMN "emotional_intensity" SET DATA TYPE real;--> statement-breakpoint
ALTER TABLE "memories" ALTER COLUMN "importance" SET DATA TYPE real;--> statement-breakpoint
ALTER TABLE "memories" ALTER COLUMN "emotional_valence" SET DATA TYPE real;--> statement-breakpoint
ALTER TABLE "memories" ALTER COLUMN "emotional_intensity" SET DATA TYPE real;--> statement-breakpoint
ALTER TABLE "memories" ALTER COLUMN "confidence" SET DATA TYPE real;--> statement-breakpoint
ALTER TABLE "memories" ALTER COLUMN "accessibility" SET DATA TYPE real;--> statement-breakpoint
ALTER TABLE "memories" ALTER COLUMN "decay_rate" SET DATA TYPE real;--> statement-breakpoint
ALTER TABLE "observations" ALTER COLUMN "detail" SET DATA TYPE real;--> statement-breakpoint
ALTER TABLE "observations" ALTER COLUMN "confidence" SET DATA TYPE real;--> statement-breakpoint
ALTER TABLE "retrieval_chunks" ALTER COLUMN "importance" SET DATA TYPE real;--> statement-breakpoint
ALTER TABLE "retrieval_chunks" ALTER COLUMN "salience" SET DATA TYPE real;