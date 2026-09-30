CREATE TYPE "public"."availability_value" AS ENUM('internship', 'full-time', 'contract');--> statement-breakpoint
CREATE TYPE "public"."inquiry_source_type" AS ENUM('student', 'project');--> statement-breakpoint
CREATE TYPE "public"."profile_status" AS ENUM('published', 'unpublished');--> statement-breakpoint
CREATE TYPE "public"."student_status" AS ENUM('current', 'alumni');--> statement-breakpoint
CREATE TABLE "availability_options" (
	"value" "availability_value" PRIMARY KEY NOT NULL,
	"display_order" integer NOT NULL,
	CONSTRAINT "availability_options_display_order_unique" UNIQUE("display_order")
);
--> statement-breakpoint
CREATE TABLE "inquiries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_type" "inquiry_source_type" NOT NULL,
	"student_id" text,
	"project_id" text,
	"source_id" text NOT NULL,
	"source_name" text NOT NULL,
	"source_url" text NOT NULL,
	"company_name" text NOT NULL,
	"contact_name" text NOT NULL,
	"contact_email" text NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inquiries_source_fk_matches_type" CHECK ((
        ("inquiries"."source_type" = 'student' AND "inquiries"."student_id" IS NOT NULL AND "inquiries"."project_id" IS NULL AND "inquiries"."source_id" = "inquiries"."student_id")
        OR
        ("inquiries"."source_type" = 'project' AND "inquiries"."project_id" IS NOT NULL AND "inquiries"."student_id" IS NULL AND "inquiries"."source_id" = "inquiries"."project_id")
      ))
);
--> statement-breakpoint
CREATE TABLE "professional_links" (
	"id" text PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"link_type" text NOT NULL,
	"label" text NOT NULL,
	"url" text NOT NULL,
	"display_order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_assets" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"asset_type" text NOT NULL,
	"label" text NOT NULL,
	"url" text NOT NULL,
	"display_order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_contributors" (
	"project_id" text NOT NULL,
	"student_id" text NOT NULL,
	"role" text NOT NULL,
	"display_order" integer NOT NULL,
	CONSTRAINT "project_contributors_project_id_student_id_pk" PRIMARY KEY("project_id","student_id")
);
--> statement-breakpoint
CREATE TABLE "project_technologies" (
	"project_id" text NOT NULL,
	"technology_name" text NOT NULL,
	"display_order" integer NOT NULL,
	CONSTRAINT "project_technologies_project_id_technology_name_pk" PRIMARY KEY("project_id","technology_name")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"domain" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skills" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"display_order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_availability" (
	"student_id" text NOT NULL,
	"availability_value" "availability_value" NOT NULL,
	"display_order" integer NOT NULL,
	CONSTRAINT "student_availability_student_id_availability_value_pk" PRIMARY KEY("student_id","availability_value")
);
--> statement-breakpoint
CREATE TABLE "student_skills" (
	"student_id" text NOT NULL,
	"skill_id" text NOT NULL,
	"display_order" integer NOT NULL,
	CONSTRAINT "student_skills_student_id_skill_id_pk" PRIMARY KEY("student_id","skill_id")
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"headline" text NOT NULL,
	"program" text NOT NULL,
	"status" "student_status" NOT NULL,
	"profile_status" "profile_status" NOT NULL
);
--> statement-breakpoint
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_links" ADD CONSTRAINT "professional_links_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_assets" ADD CONSTRAINT "project_assets_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_contributors" ADD CONSTRAINT "project_contributors_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_contributors" ADD CONSTRAINT "project_contributors_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_technologies" ADD CONSTRAINT "project_technologies_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_availability" ADD CONSTRAINT "student_availability_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_availability" ADD CONSTRAINT "student_availability_availability_value_availability_options_value_fk" FOREIGN KEY ("availability_value") REFERENCES "public"."availability_options"("value") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_skills" ADD CONSTRAINT "student_skills_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_skills" ADD CONSTRAINT "student_skills_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inquiries_created_at_idx" ON "inquiries" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "professional_links_type_unique" ON "professional_links" USING btree ("student_id","link_type");--> statement-breakpoint
CREATE UNIQUE INDEX "professional_links_order_unique" ON "professional_links" USING btree ("student_id","display_order");--> statement-breakpoint
CREATE UNIQUE INDEX "project_assets_type_unique" ON "project_assets" USING btree ("project_id","asset_type");--> statement-breakpoint
CREATE UNIQUE INDEX "project_assets_order_unique" ON "project_assets" USING btree ("project_id","display_order");--> statement-breakpoint
CREATE UNIQUE INDEX "project_contributors_order_unique" ON "project_contributors" USING btree ("project_id","display_order");--> statement-breakpoint
CREATE INDEX "project_contributors_student_idx" ON "project_contributors" USING btree ("student_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_technologies_order_unique" ON "project_technologies" USING btree ("project_id","display_order");--> statement-breakpoint
CREATE UNIQUE INDEX "skills_name_unique" ON "skills" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "skills_normalized_name_unique" ON "skills" USING btree ("normalized_name");--> statement-breakpoint
CREATE UNIQUE INDEX "skills_display_order_unique" ON "skills" USING btree ("display_order");--> statement-breakpoint
CREATE UNIQUE INDEX "student_availability_order_unique" ON "student_availability" USING btree ("student_id","display_order");--> statement-breakpoint
CREATE INDEX "student_availability_value_idx" ON "student_availability" USING btree ("availability_value");--> statement-breakpoint
CREATE UNIQUE INDEX "student_skills_order_unique" ON "student_skills" USING btree ("student_id","display_order");--> statement-breakpoint
CREATE INDEX "student_skills_skill_idx" ON "student_skills" USING btree ("skill_id");--> statement-breakpoint
CREATE INDEX "students_profile_status_idx" ON "students" USING btree ("profile_status");--> statement-breakpoint
CREATE INDEX "students_status_idx" ON "students" USING btree ("status");