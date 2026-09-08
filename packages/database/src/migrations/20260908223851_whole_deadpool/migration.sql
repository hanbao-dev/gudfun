CREATE TABLE "group" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_member" (
	"group_id" text,
	"user_id" text,
	CONSTRAINT "group_member_pkey" PRIMARY KEY("group_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "segment" (
	"id" text PRIMARY KEY,
	"show_id" text NOT NULL,
	"title" text NOT NULL,
	"type" text NOT NULL,
	"position" integer NOT NULL,
	"is_current" boolean DEFAULT false NOT NULL,
	CONSTRAINT "segment_position_nonnegative" CHECK ("position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "show" (
	"id" text PRIMARY KEY,
	"title" text NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"features" jsonb DEFAULT '[]' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "show_group" (
	"show_id" text,
	"group_id" text,
	CONSTRAINT "show_group_pkey" PRIMARY KEY("show_id","group_id")
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "is_admin" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX "group_member_user_idx" ON "group_member" ("user_id");--> statement-breakpoint
CREATE INDEX "segment_show_position_idx" ON "segment" ("show_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "segment_one_current_idx" ON "segment" ("show_id") WHERE "is_current" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "show_one_active_idx" ON "show" ("is_active") WHERE "is_active" = true;--> statement-breakpoint
CREATE INDEX "show_group_group_idx" ON "show_group" ("group_id");--> statement-breakpoint
ALTER TABLE "group_member" ADD CONSTRAINT "group_member_group_id_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "group"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "group_member" ADD CONSTRAINT "group_member_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "segment" ADD CONSTRAINT "segment_show_id_show_id_fkey" FOREIGN KEY ("show_id") REFERENCES "show"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "show_group" ADD CONSTRAINT "show_group_show_id_show_id_fkey" FOREIGN KEY ("show_id") REFERENCES "show"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "show_group" ADD CONSTRAINT "show_group_group_id_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "group"("id") ON DELETE CASCADE;