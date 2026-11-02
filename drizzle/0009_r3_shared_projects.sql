CREATE TABLE "project_contributions" (
	"membership_id" uuid PRIMARY KEY NOT NULL,
	"role_id" text NOT NULL,
	"statement" text DEFAULT '' NOT NULL,
	"featured" boolean DEFAULT true NOT NULL,
	"public_visible" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_contributions_version_positive" CHECK ("project_contributions"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "project_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" text NOT NULL,
	"label" text NOT NULL,
	"url" text NOT NULL,
	"display_order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_maintainer_transfers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" text NOT NULL,
	"from_user_id" text NOT NULL,
	"to_membership_id" uuid NOT NULL,
	"project_version" integer NOT NULL,
	"state" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"responded_at" timestamp with time zone,
	CONSTRAINT "project_transfer_state_check" CHECK ("project_maintainer_transfers"."state" IN ('pending', 'accepted', 'declined', 'cancelled')),
	CONSTRAINT "project_transfer_version_positive" CHECK ("project_maintainer_transfers"."project_version" > 0)
);
--> statement-breakpoint
CREATE TABLE "project_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" text NOT NULL,
	"kind" text NOT NULL,
	"url" text NOT NULL,
	"label" text NOT NULL,
	"alt_text" text DEFAULT '' NOT NULL,
	"display_order" integer NOT NULL,
	CONSTRAINT "project_media_kind_check" CHECK ("project_media"."kind" IN ('playable', 'video', 'source', 'fallback_image', 'fallback_video', 'fallback_link'))
);
--> statement-breakpoint
CREATE TABLE "project_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" text NOT NULL,
	"profile_id" uuid NOT NULL,
	"state" text DEFAULT 'pending' NOT NULL,
	"proposed_role_id" text NOT NULL,
	"invited_by_user_id" text NOT NULL,
	"accepted_at" timestamp with time zone,
	"responded_at" timestamp with time zone,
	"removed_at" timestamp with time zone,
	"removed_by_user_id" text,
	"removal_reason" text DEFAULT '' NOT NULL,
	"restored_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_memberships_state_check" CHECK ("project_memberships"."state" IN ('pending', 'accepted', 'declined', 'removed')),
	CONSTRAINT "project_memberships_acceptance_check" CHECK (("project_memberships"."state" IN ('accepted', 'removed') AND "project_memberships"."accepted_at" IS NOT NULL) OR ("project_memberships"."state" IN ('pending', 'declined') AND "project_memberships"."accepted_at" IS NULL)),
	CONSTRAINT "project_memberships_removal_check" CHECK ("project_memberships"."state" <> 'removed' OR ("project_memberships"."removed_at" IS NOT NULL AND "project_memberships"."removed_by_user_id" IS NOT NULL)),
	CONSTRAINT "project_memberships_version_positive" CHECK ("project_memberships"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "project_repositories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" text NOT NULL,
	"url" text NOT NULL,
	"normalized_key" text NOT NULL,
	"display_order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_roles" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"display_order" integer NOT NULL,
	CONSTRAINT "project_roles_name_unique" UNIQUE("name"),
	CONSTRAINT "project_roles_display_order_unique" UNIQUE("display_order")
);
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "origin" text DEFAULT 'legacy_fixture' NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "maintainer_user_id" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "publication_status" "profile_status" DEFAULT 'published' NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "project_status" text DEFAULT 'in_progress' NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "project_date" date;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "published_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "project_contributions" ADD CONSTRAINT "project_contributions_membership_id_project_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."project_memberships"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_contributions" ADD CONSTRAINT "project_contributions_role_id_project_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."project_roles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_links" ADD CONSTRAINT "project_links_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_maintainer_transfers" ADD CONSTRAINT "project_maintainer_transfers_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_maintainer_transfers" ADD CONSTRAINT "project_maintainer_transfers_from_user_id_auth_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."auth_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_maintainer_transfers" ADD CONSTRAINT "project_maintainer_transfers_to_membership_id_project_memberships_id_fk" FOREIGN KEY ("to_membership_id") REFERENCES "public"."project_memberships"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_media" ADD CONSTRAINT "project_media_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_memberships" ADD CONSTRAINT "project_memberships_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_memberships" ADD CONSTRAINT "project_memberships_profile_id_student_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."student_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_memberships" ADD CONSTRAINT "project_memberships_proposed_role_id_project_roles_id_fk" FOREIGN KEY ("proposed_role_id") REFERENCES "public"."project_roles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_memberships" ADD CONSTRAINT "project_memberships_invited_by_user_id_auth_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."auth_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_memberships" ADD CONSTRAINT "project_memberships_removed_by_user_id_auth_users_id_fk" FOREIGN KEY ("removed_by_user_id") REFERENCES "public"."auth_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_repositories" ADD CONSTRAINT "project_repositories_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_links_project_idx" ON "project_links" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_transfer_pending_unique" ON "project_maintainer_transfers" USING btree ("project_id") WHERE "project_maintainer_transfers"."state" = 'pending';--> statement-breakpoint
CREATE INDEX "project_media_project_idx" ON "project_media" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_media_primary_unique" ON "project_media" USING btree ("project_id","kind") WHERE "project_media"."kind" IN ('playable', 'video');--> statement-breakpoint
CREATE UNIQUE INDEX "project_memberships_project_profile_unique" ON "project_memberships" USING btree ("project_id","profile_id");--> statement-breakpoint
CREATE INDEX "project_memberships_profile_idx" ON "project_memberships" USING btree ("profile_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_repositories_project_key_unique" ON "project_repositories" USING btree ("project_id","normalized_key");--> statement-breakpoint
CREATE INDEX "project_repositories_key_idx" ON "project_repositories" USING btree ("normalized_key");--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_maintainer_user_id_auth_users_id_fk" FOREIGN KEY ("maintainer_user_id") REFERENCES "public"."auth_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "projects_maintainer_idx" ON "projects" USING btree ("maintainer_user_id");--> statement-breakpoint
CREATE INDEX "projects_publication_idx" ON "projects" USING btree ("publication_status");--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_origin_owner_check" CHECK (("projects"."origin" = 'legacy_fixture' AND "projects"."maintainer_user_id" IS NULL) OR ("projects"."origin" = 'student' AND "projects"."maintainer_user_id" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_status_check" CHECK ("projects"."project_status" IN ('in_progress', 'completed', 'on_hold'));--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_version_positive" CHECK ("projects"."version" > 0);
--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "publication_status" SET DEFAULT 'unpublished';
--> statement-breakpoint
INSERT INTO "project_roles" ("id", "name", "display_order") VALUES
('software-developer', 'Software Developer', 0),
('xr-developer', 'XR Developer', 1),
('frontend-developer', 'Frontend Developer', 2),
('backend-developer', 'Backend Developer', 3),
('game-developer', 'Game Developer', 4),
('3d-artist', '3D Artist', 5),
('technical-artist', 'Technical Artist', 6),
('ui-ux-designer', 'UI/UX Designer', 7),
('project-manager', 'Project Manager', 8),
('researcher', 'Researcher', 9),
('qa-tester', 'QA/Tester', 10),
('data-ai-developer', 'Data/AI Developer', 11);
--> statement-breakpoint
DO $$
DECLARE
  application_tables constant text[] := ARRAY['project_roles','project_repositories','project_links','project_memberships','project_contributions','project_maintainer_transfers','project_media'];
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY application_tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM PUBLIC, anon, authenticated', table_name);
  END LOOP;
END
$$;
