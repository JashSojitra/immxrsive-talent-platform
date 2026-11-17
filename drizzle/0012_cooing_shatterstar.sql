CREATE TABLE "admin_credit_links" (
	"project_id" text NOT NULL,
	"profile_id" uuid NOT NULL,
	CONSTRAINT "admin_credit_links_project_id_profile_id_pk" PRIMARY KEY("project_id","profile_id")
);
--> statement-breakpoint
ALTER TABLE "admin_credit_links" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "admin_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" text,
	"actor_user_id" text NOT NULL,
	"action" text NOT NULL,
	"note" text NOT NULL,
	"snapshot" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_event_note_check" CHECK (length("admin_events"."note") <= 2000)
);
--> statement-breakpoint
ALTER TABLE "admin_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "admin_project_details" (
	"project_id" text PRIMARY KEY NOT NULL,
	"created_by" text NOT NULL,
	"lifecycle" text DEFAULT 'draft' NOT NULL,
	"content" jsonb NOT NULL,
	"repository_key" text,
	CONSTRAINT "admin_lifecycle_check" CHECK ("admin_project_details"."lifecycle" IN ('draft','published','unpublished','archived'))
);
--> statement-breakpoint
ALTER TABLE "admin_project_details" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "projects" DROP CONSTRAINT "projects_origin_owner_check";--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "management_mode" text DEFAULT 'STUDENT_MANAGED' NOT NULL;--> statement-breakpoint
ALTER TABLE "admin_credit_links" ADD CONSTRAINT "admin_credit_links_project_id_admin_project_details_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."admin_project_details"("project_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_credit_links" ADD CONSTRAINT "admin_credit_links_profile_id_student_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."student_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_events" ADD CONSTRAINT "admin_events_project_id_admin_project_details_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."admin_project_details"("project_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_events" ADD CONSTRAINT "admin_events_actor_user_id_auth_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."auth_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_project_details" ADD CONSTRAINT "admin_project_details_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_project_details" ADD CONSTRAINT "admin_project_details_created_by_auth_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."auth_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_event_history_idx" ON "admin_events" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "admin_repository_unique" ON "admin_project_details" USING btree ("repository_key");--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_management_mode_check" CHECK (("projects"."management_mode" = 'ADMIN_MANAGED' AND "projects"."origin" = 'admin') OR ("projects"."management_mode" = 'STUDENT_MANAGED' AND "projects"."origin" IN ('legacy_fixture','student')));--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_origin_owner_check" CHECK (("projects"."origin" = 'legacy_fixture' AND "projects"."maintainer_user_id" IS NULL) OR ("projects"."origin" = 'student' AND "projects"."maintainer_user_id" IS NOT NULL) OR ("projects"."origin" = 'admin' AND "projects"."maintainer_user_id" IS NULL));
--> statement-breakpoint
REVOKE ALL PRIVILEGES ON TABLE public.admin_credit_links, public.admin_events, public.admin_project_details FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
CREATE FUNCTION public.project_management_immutable() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.management_mode IS DISTINCT FROM OLD.management_mode OR NEW.origin IS DISTINCT FROM OLD.origin THEN
    RAISE EXCEPTION 'Project identity and management mode are immutable';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER project_management_immutable BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.project_management_immutable();
--> statement-breakpoint
CREATE FUNCTION public.admin_provenance_guard() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND (NEW.project_id IS DISTINCT FROM OLD.project_id OR NEW.created_by IS DISTINCT FROM OLD.created_by) THEN RAISE EXCEPTION 'Admin project provenance is immutable'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id = NEW.project_id AND management_mode = 'ADMIN_MANAGED' AND origin = 'admin' AND maintainer_user_id IS NULL) THEN RAISE EXCEPTION 'An independent admin project is required'; END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER admin_provenance_guard BEFORE INSERT OR UPDATE ON public.admin_project_details FOR EACH ROW EXECUTE FUNCTION public.admin_provenance_guard();
--> statement-breakpoint
CREATE FUNCTION public.admin_publication_consistency() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE identity text; p public.projects%ROWTYPE; d public.admin_project_details%ROWTYPE;
BEGIN
  IF TG_TABLE_NAME = 'projects' THEN identity := NEW.id; ELSE identity := NEW.project_id; END IF;
  SELECT * INTO p FROM public.projects WHERE id = identity;
  IF p.management_mode = 'ADMIN_MANAGED' THEN
    SELECT * INTO d FROM public.admin_project_details WHERE project_id = identity;
    IF NOT FOUND OR (p.publication_status = 'published') IS DISTINCT FROM (d.lifecycle = 'published') THEN RAISE EXCEPTION 'Admin publication and lifecycle must agree'; END IF;
  END IF;
  RETURN NULL;
END $$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER admin_project_consistency AFTER INSERT OR UPDATE ON public.projects DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.admin_publication_consistency();
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER admin_details_consistency AFTER INSERT OR UPDATE ON public.admin_project_details DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.admin_publication_consistency();
--> statement-breakpoint
CREATE FUNCTION public.admin_no_student_membership() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.projects WHERE id = NEW.project_id AND management_mode = 'ADMIN_MANAGED') THEN RAISE EXCEPTION 'Admin credits cannot create student memberships'; END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER admin_no_student_membership BEFORE INSERT OR UPDATE ON public.project_memberships FOR EACH ROW EXECUTE FUNCTION public.admin_no_student_membership();
--> statement-breakpoint
CREATE TRIGGER admin_audit_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON public.admin_events FOR EACH STATEMENT EXECUTE FUNCTION public.studio_audit_immutable();
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.project_management_immutable(), public.admin_provenance_guard(), public.admin_publication_consistency(), public.admin_no_student_membership() FROM PUBLIC, anon, authenticated;
