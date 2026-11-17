CREATE TABLE "studio_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" text,
	"actor_user_id" text NOT NULL,
	"action" text NOT NULL,
	"note" text NOT NULL,
	"snapshot" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "studio_event_note_check" CHECK (length("studio_events"."note") <= 2000)
);
--> statement-breakpoint
CREATE TABLE "studio_roles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"role" text NOT NULL,
	CONSTRAINT "studio_role_check" CHECK ("studio_roles"."role" IN ('xr_curator','xr_admin','platform_super_admin'))
);
--> statement-breakpoint
CREATE TABLE "studio_submissions" (
	"project_id" text PRIMARY KEY NOT NULL,
	"submitted_by" text NOT NULL,
	"state" text DEFAULT 'submitted' NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"media_url" text DEFAULT '' NOT NULL,
	"demo_url" text DEFAULT '' NOT NULL,
	"content_version" integer DEFAULT 1 NOT NULL,
	"accepted_version" integer,
	"accepted_by" text,
	"accepted_project_version" integer,
	"published" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "studio_state_check" CHECK ("studio_submissions"."state" IN ('submitted','under_review','changes_requested','approved','rejected','withdrawn')),
	CONSTRAINT "studio_versions_check" CHECK ("studio_submissions"."version" > 0 AND "studio_submissions"."content_version" > 0 AND ("studio_submissions"."accepted_version" IS NULL OR "studio_submissions"."accepted_version" = "studio_submissions"."content_version")),
	CONSTRAINT "studio_acceptance_check" CHECK (("studio_submissions"."accepted_version" IS NULL AND "studio_submissions"."accepted_by" IS NULL AND "studio_submissions"."accepted_project_version" IS NULL) OR ("studio_submissions"."accepted_version" IS NOT NULL AND "studio_submissions"."accepted_by" IS NOT NULL AND "studio_submissions"."accepted_project_version" IS NOT NULL AND "studio_submissions"."accepted_project_version" > 0)),
	CONSTRAINT "studio_publish_check" CHECK (NOT "studio_submissions"."published" OR ("studio_submissions"."state" = 'approved' AND "studio_submissions"."accepted_version" = "studio_submissions"."content_version" AND "studio_submissions"."accepted_by" IS NOT NULL)),
	CONSTRAINT "studio_content_check" CHECK (length("studio_submissions"."title") BETWEEN 1 AND 160 AND length("studio_submissions"."summary") BETWEEN 1 AND 4000 AND length("studio_submissions"."media_url") <= 2048 AND length("studio_submissions"."demo_url") <= 2048)
);
--> statement-breakpoint
ALTER TABLE "studio_events" ADD CONSTRAINT "studio_events_project_id_studio_submissions_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."studio_submissions"("project_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio_events" ADD CONSTRAINT "studio_events_actor_user_id_auth_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."auth_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio_roles" ADD CONSTRAINT "studio_roles_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio_submissions" ADD CONSTRAINT "studio_submissions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio_submissions" ADD CONSTRAINT "studio_submissions_submitted_by_auth_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."auth_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio_submissions" ADD CONSTRAINT "studio_submissions_accepted_by_auth_users_id_fk" FOREIGN KEY ("accepted_by") REFERENCES "public"."auth_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "studio_history_idx" ON "studio_events" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE INDEX "studio_queue_idx" ON "studio_submissions" USING btree ("state","updated_at");--> statement-breakpoint
-- Same deny-by-default boundary as R3: browser database roles have no direct access.
DO $$
DECLARE
  application_tables constant text[] := ARRAY['studio_roles','studio_submissions','studio_events'];
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY application_tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM PUBLIC, anon, authenticated', table_name);
  END LOOP;
END $$;
--> statement-breakpoint
CREATE FUNCTION public.studio_submission_guard() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE p public.projects%ROWTYPE;
BEGIN
  SELECT * INTO p FROM public.projects WHERE id = NEW.project_id FOR UPDATE;
  IF TG_OP = 'INSERT' AND (p.origin <> 'student' OR p.maintainer_user_id IS DISTINCT FROM NEW.submitted_by) THEN
    RAISE EXCEPTION 'Only the current student project owner may submit';
  END IF;
  IF TG_OP = 'UPDATE' AND (NEW.project_id IS DISTINCT FROM OLD.project_id OR NEW.submitted_by IS DISTINCT FROM OLD.submitted_by) THEN
    RAISE EXCEPTION 'Submission provenance is immutable';
  END IF;
  IF NEW.accepted_version IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.accepted_version IS DISTINCT FROM OLD.accepted_version OR NEW.accepted_by IS DISTINCT FROM OLD.accepted_by OR NEW.accepted_project_version IS DISTINCT FROM OLD.accepted_project_version OR NEW.published) THEN
    IF NEW.accepted_by IS DISTINCT FROM p.maintainer_user_id OR NEW.accepted_project_version IS DISTINCT FROM p.version THEN
      RAISE EXCEPTION 'Current owner approval required';
    END IF;
  END IF;
  IF NEW.published AND p.publication_status <> 'published' THEN RAISE EXCEPTION 'Canonical project must be public'; END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER studio_submission_guard BEFORE INSERT OR UPDATE ON public.studio_submissions FOR EACH ROW EXECUTE FUNCTION public.studio_submission_guard();
--> statement-breakpoint
CREATE FUNCTION public.studio_audit_immutable() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN RAISE EXCEPTION 'Studio audit events are append only'; END $$;
--> statement-breakpoint
CREATE TRIGGER studio_audit_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON public.studio_events FOR EACH STATEMENT EXECUTE FUNCTION public.studio_audit_immutable();
--> statement-breakpoint
-- Invoker rights. This is an operational privileged-connection procedure, never a browser RPC.
CREATE FUNCTION public.assign_studio_role(actor text, subject text, desired_role text, reason text) RETURNS void LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF length(trim(reason)) NOT BETWEEN 1 AND 2000 THEN RAISE EXCEPTION 'Reason required'; END IF;
  -- Serialize grants/revocations, including protection of the last super admin.
  LOCK TABLE public.studio_roles IN EXCLUSIVE MODE;
  IF NOT EXISTS (SELECT 1 FROM public.studio_roles WHERE user_id = actor AND role = 'platform_super_admin') THEN RAISE EXCEPTION 'Super admin required'; END IF;
  IF desired_role IS NOT NULL AND desired_role NOT IN ('xr_curator','xr_admin','platform_super_admin') THEN RAISE EXCEPTION 'Invalid role'; END IF;
  IF EXISTS (SELECT 1 FROM public.studio_roles WHERE user_id = subject AND role = 'platform_super_admin') AND desired_role IS DISTINCT FROM 'platform_super_admin' AND (SELECT count(*) FROM public.studio_roles WHERE role = 'platform_super_admin') <= 1 THEN RAISE EXCEPTION 'Preserve a super admin'; END IF;
  INSERT INTO public.studio_events(actor_user_id, action, note, snapshot) VALUES (actor, 'role_assignment', reason, jsonb_build_object('subject', subject, 'previous', (SELECT role FROM public.studio_roles WHERE user_id = subject), 'role', desired_role));
  IF desired_role IS NULL THEN DELETE FROM public.studio_roles WHERE user_id = subject;
  ELSE INSERT INTO public.studio_roles(user_id, role) VALUES (subject, desired_role) ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role; END IF;
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.assign_studio_role(text,text,text,text), public.studio_submission_guard(), public.studio_audit_immutable() FROM PUBLIC, anon, authenticated;
