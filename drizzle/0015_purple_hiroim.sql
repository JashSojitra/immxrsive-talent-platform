ALTER TYPE "public"."media_kind" ADD VALUE 'project_screenshot';--> statement-breakpoint
CREATE TABLE "admin_credit_emails" (
	"project_id" text NOT NULL,
	"institutional_email" text NOT NULL,
	"credit_index" integer NOT NULL,
	"display_name" text NOT NULL,
	"role" text NOT NULL,
	"statement" text NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_credit_emails_project_id_institutional_email_pk" PRIMARY KEY("project_id","institutional_email"),
	CONSTRAINT "admin_credit_email_normalized" CHECK ("admin_credit_emails"."institutional_email" = lower(trim("admin_credit_emails"."institutional_email"))),
	CONSTRAINT "admin_credit_email_name_required" CHECK (length(trim("admin_credit_emails"."display_name")) BETWEEN 1 AND 160)
);
--> statement-breakpoint
ALTER TABLE "admin_credit_emails" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "project_screenshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" text NOT NULL,
	"media_id" uuid NOT NULL,
	"alt_text" text NOT NULL,
	"caption" text DEFAULT '' NOT NULL,
	"display_order" integer NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_screenshot_alt_required" CHECK (length(trim("project_screenshots"."alt_text")) BETWEEN 1 AND 300),
	CONSTRAINT "project_screenshot_caption_limit" CHECK (length("project_screenshots"."caption") <= 300),
	CONSTRAINT "project_screenshot_order_range" CHECK ("project_screenshots"."display_order" BETWEEN 0 AND 9)
);
--> statement-breakpoint
ALTER TABLE "project_screenshots" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "admin_credit_emails" ADD CONSTRAINT "admin_credit_emails_project_id_admin_project_details_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."admin_project_details"("project_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_credit_emails" ADD CONSTRAINT "admin_credit_emails_created_by_auth_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."auth_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_screenshots" ADD CONSTRAINT "project_screenshots_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_screenshots" ADD CONSTRAINT "project_screenshots_media_id_media_assets_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media_assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_screenshots" ADD CONSTRAINT "project_screenshots_created_by_auth_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."auth_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "admin_credit_email_position_unique" ON "admin_credit_emails" USING btree ("project_id","credit_index");--> statement-breakpoint
CREATE INDEX "project_screenshots_order_idx" ON "project_screenshots" USING btree ("project_id","display_order");
--> statement-breakpoint
REVOKE ALL PRIVILEGES ON TABLE public.admin_credit_emails, public.project_screenshots FROM PUBLIC;
--> statement-breakpoint
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN REVOKE ALL PRIVILEGES ON TABLE public.admin_credit_emails, public.project_screenshots FROM anon; END IF;
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN REVOKE ALL PRIVILEGES ON TABLE public.admin_credit_emails, public.project_screenshots FROM authenticated; END IF;
END $$;
