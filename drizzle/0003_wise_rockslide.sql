CREATE TYPE "public"."student_profile_link_type" AS ENUM('linkedin', 'github', 'portfolio', 'other');--> statement-breakpoint
CREATE TABLE "student_profile_availability" (
	"profile_id" uuid NOT NULL,
	"availability_value" "availability_value" NOT NULL,
	"display_order" integer NOT NULL,
	CONSTRAINT "student_profile_availability_profile_id_availability_value_pk" PRIMARY KEY("profile_id","availability_value")
);
--> statement-breakpoint
CREATE TABLE "student_profile_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"link_type" "student_profile_link_type" NOT NULL,
	"label" text NOT NULL,
	"url" text NOT NULL,
	"display_order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_profile_skills" (
	"profile_id" uuid NOT NULL,
	"skill_id" text NOT NULL,
	"display_order" integer NOT NULL,
	CONSTRAINT "student_profile_skills_profile_id_skill_id_pk" PRIMARY KEY("profile_id","skill_id")
);
--> statement-breakpoint
CREATE TABLE "student_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" text NOT NULL,
	"publication_status" "profile_status" DEFAULT 'unpublished' NOT NULL,
	"headline" text DEFAULT '' NOT NULL,
	"biography" text DEFAULT '' NOT NULL,
	"public_location" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "student_profiles_owner_user_id_unique" UNIQUE("owner_user_id")
);
--> statement-breakpoint
ALTER TABLE "student_profile_availability" ADD CONSTRAINT "student_profile_availability_profile_id_student_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."student_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_profile_availability" ADD CONSTRAINT "student_profile_availability_availability_value_availability_options_value_fk" FOREIGN KEY ("availability_value") REFERENCES "public"."availability_options"("value") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_profile_links" ADD CONSTRAINT "student_profile_links_profile_id_student_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."student_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_profile_skills" ADD CONSTRAINT "student_profile_skills_profile_id_student_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."student_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_profile_skills" ADD CONSTRAINT "student_profile_skills_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_owner_user_id_auth_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "student_profile_availability_order_unique" ON "student_profile_availability" USING btree ("profile_id","display_order");--> statement-breakpoint
CREATE UNIQUE INDEX "student_profile_links_order_unique" ON "student_profile_links" USING btree ("profile_id","display_order");--> statement-breakpoint
CREATE INDEX "student_profile_links_profile_idx" ON "student_profile_links" USING btree ("profile_id");--> statement-breakpoint
CREATE UNIQUE INDEX "student_profile_skills_order_unique" ON "student_profile_skills" USING btree ("profile_id","display_order");--> statement-breakpoint
CREATE INDEX "student_profiles_owner_idx" ON "student_profiles" USING btree ("owner_user_id");