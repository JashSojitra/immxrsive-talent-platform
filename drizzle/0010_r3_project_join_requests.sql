CREATE TABLE "project_join_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" text NOT NULL,
	"profile_id" uuid NOT NULL,
	"state" text DEFAULT 'pending' NOT NULL,
	"membership_id" uuid,
	"responded_by_user_id" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"responded_at" timestamp with time zone,
	CONSTRAINT "project_join_requests_state_check" CHECK ("project_join_requests"."state" IN ('pending','approved','declined')),
	CONSTRAINT "project_join_requests_version_positive" CHECK ("project_join_requests"."version" > 0),
	CONSTRAINT "project_join_requests_response_check" CHECK (("project_join_requests"."state" = 'pending' AND "project_join_requests"."responded_at" IS NULL AND "project_join_requests"."responded_by_user_id" IS NULL AND "project_join_requests"."membership_id" IS NULL) OR ("project_join_requests"."state" IN ('approved','declined') AND "project_join_requests"."responded_at" IS NOT NULL AND "project_join_requests"."responded_by_user_id" IS NOT NULL AND (("project_join_requests"."state" = 'approved' AND "project_join_requests"."membership_id" IS NOT NULL) OR ("project_join_requests"."state" = 'declined' AND "project_join_requests"."membership_id" IS NULL))))
);
--> statement-breakpoint
ALTER TABLE "project_join_requests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "project_join_requests" ADD CONSTRAINT "project_join_requests_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_join_requests" ADD CONSTRAINT "project_join_requests_profile_id_student_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."student_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_join_requests" ADD CONSTRAINT "project_join_requests_membership_id_project_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."project_memberships"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_join_requests" ADD CONSTRAINT "project_join_requests_responded_by_user_id_auth_users_id_fk" FOREIGN KEY ("responded_by_user_id") REFERENCES "public"."auth_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "project_join_requests_project_profile_unique" ON "project_join_requests" USING btree ("project_id","profile_id");--> statement-breakpoint
CREATE INDEX "project_join_requests_profile_idx" ON "project_join_requests" USING btree ("profile_id");
--> statement-breakpoint
DO $$
DECLARE
  application_tables constant text[] := ARRAY['project_join_requests'];
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY application_tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM PUBLIC, anon, authenticated', table_name);
  END LOOP;
END
$$;
