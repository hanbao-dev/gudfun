DROP INDEX "show_one_active_idx";--> statement-breakpoint
ALTER TABLE "segment" ADD COLUMN "configuration" jsonb DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "show" ADD COLUMN "status" text DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE "show" ADD COLUMN "scheduled_start" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "show" ADD COLUMN "actual_start" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "show" ADD COLUMN "actual_end" timestamp with time zone;--> statement-breakpoint
-- Preserve live state without fabricating unavailable historical timestamps.
UPDATE "show" SET "status" = 'live' WHERE "is_active" = true;--> statement-breakpoint
ALTER TABLE "show" DROP COLUMN "is_active";--> statement-breakpoint
CREATE UNIQUE INDEX "show_one_live_idx" ON "show" ("status") WHERE "status" = 'live';--> statement-breakpoint
CREATE INDEX "show_status_schedule_idx" ON "show" ("status","scheduled_start");--> statement-breakpoint
ALTER TABLE "show" ADD CONSTRAINT "show_lifecycle" CHECK ((
      ("status" = 'draft' AND "scheduled_start" IS NULL AND "actual_start" IS NULL AND "actual_end" IS NULL) OR
      ("status" = 'scheduled' AND "scheduled_start" IS NOT NULL AND "actual_start" IS NULL AND "actual_end" IS NULL) OR
      ("status" = 'live' AND "actual_end" IS NULL) OR
      ("status" = 'ended' AND "actual_end" IS NOT NULL)
    ) AND ("actual_start" IS NULL OR "actual_end" IS NULL OR "actual_end" >= "actual_start"));