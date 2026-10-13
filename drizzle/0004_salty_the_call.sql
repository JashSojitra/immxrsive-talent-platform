CREATE TABLE "student_profile_education" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"description" text NOT NULL,
	"display_order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_profile_experience" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"description" text NOT NULL,
	"display_order" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "student_profile_education" ADD CONSTRAINT "student_profile_education_profile_id_student_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."student_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_profile_experience" ADD CONSTRAINT "student_profile_experience_profile_id_student_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."student_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "student_profile_education_order_unique" ON "student_profile_education" USING btree ("profile_id","display_order");--> statement-breakpoint
CREATE INDEX "student_profile_education_profile_idx" ON "student_profile_education" USING btree ("profile_id");--> statement-breakpoint
CREATE UNIQUE INDEX "student_profile_experience_order_unique" ON "student_profile_experience" USING btree ("profile_id","display_order");--> statement-breakpoint
CREATE INDEX "student_profile_experience_profile_idx" ON "student_profile_experience" USING btree ("profile_id");