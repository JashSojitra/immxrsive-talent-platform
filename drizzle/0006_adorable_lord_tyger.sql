ALTER TABLE "student_profiles" ADD COLUMN "presentation_preset" text DEFAULT 'spatial' NOT NULL;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "hero_media" text DEFAULT 'default' NOT NULL;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "section_order" jsonb DEFAULT '["about","skills","background","links"]'::jsonb NOT NULL;