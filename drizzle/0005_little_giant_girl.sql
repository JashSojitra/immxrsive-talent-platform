ALTER TABLE "student_profiles" ADD COLUMN "program" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "student_status" "student_status";--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "show_availability" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "show_professional_links" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "show_public_location" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "show_education" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "show_experience" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "published_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "student_profiles_publication_idx" ON "student_profiles" USING btree ("publication_status");