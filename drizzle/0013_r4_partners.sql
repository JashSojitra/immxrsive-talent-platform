CREATE TABLE "partner_collaboration_participants" (
	"collaboration_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	CONSTRAINT "partner_collaboration_participants_collaboration_id_profile_id_pk" PRIMARY KEY("collaboration_id","profile_id")
);

--> statement-breakpoint
ALTER TABLE "partner_collaboration_participants" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "partner_collaboration_projects" (
	"collaboration_id" uuid NOT NULL,
	"project_id" text NOT NULL,
	CONSTRAINT "partner_collaboration_projects_collaboration_id_project_id_pk" PRIMARY KEY("collaboration_id","project_id")
);

--> statement-breakpoint
ALTER TABLE "partner_collaboration_projects" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "partner_collaborations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"content" jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "partner_collaborations_content_check" CHECK ("partner_collaborations"."content"->>'visibility' IN ('public','limited','private') AND "partner_collaborations"."content"->>'status' IN ('current','past')),
	CONSTRAINT "partner_collaborations_version_check" CHECK ("partner_collaborations"."version" > 0)
);

--> statement-breakpoint
ALTER TABLE "partner_collaborations" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "partner_companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content" jsonb NOT NULL,
	"normalized_domain" text,
	"sources" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "partner_companies_status_check" CHECK ("partner_companies"."status" IN ('draft','published')),
	CONSTRAINT "partner_companies_version_check" CHECK ("partner_companies"."version" > 0)
);

--> statement-breakpoint
ALTER TABLE "partner_companies" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "partner_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" text NOT NULL,
	"action" text NOT NULL,
	"subject_id" text NOT NULL,
	"snapshot" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

--> statement-breakpoint
ALTER TABLE "partner_events" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "partner_inquiries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"source_name" text NOT NULL,
	"content" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

--> statement-breakpoint
ALTER TABLE "partner_inquiries" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "partner_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"project_id" text NOT NULL,
	"actor_user_id" text NOT NULL,
	"company_id" uuid,
	"suggested_company" text NOT NULL,
	"note" text NOT NULL,
	"evidence" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"decision_note" text DEFAULT '' NOT NULL,
	"reviewed_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "partner_requests_kind_check" CHECK ("partner_requests"."kind" IN ('verification','association')),
	CONSTRAINT "partner_requests_status_check" CHECK ("partner_requests"."status" IN ('pending','approved','rejected')),
	CONSTRAINT "partner_requests_no_self_review" CHECK ("partner_requests"."reviewed_by" IS NULL OR "partner_requests"."reviewed_by" <> "partner_requests"."actor_user_id")
);

--> statement-breakpoint
ALTER TABLE "partner_requests" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "project_official_verifications" (
	"project_id" text PRIMARY KEY NOT NULL,
	"request_id" uuid NOT NULL
);

--> statement-breakpoint
ALTER TABLE "project_official_verifications" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "project_verified_partners" (
	"project_id" text NOT NULL,
	"company_id" uuid NOT NULL,
	"request_id" uuid NOT NULL,
	CONSTRAINT "project_verified_partners_project_id_company_id_pk" PRIMARY KEY("project_id","company_id")
);

--> statement-breakpoint
ALTER TABLE "project_verified_partners" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "partner_collaboration_participants" ADD CONSTRAINT "partner_collaboration_participants_collaboration_id_partner_collaborations_id_fk" FOREIGN KEY ("collaboration_id") REFERENCES "public"."partner_collaborations"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "partner_collaboration_participants" ADD CONSTRAINT "partner_collaboration_participants_profile_id_student_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."student_profiles"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "partner_collaboration_projects" ADD CONSTRAINT "partner_collaboration_projects_collaboration_id_partner_collaborations_id_fk" FOREIGN KEY ("collaboration_id") REFERENCES "public"."partner_collaborations"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "partner_collaboration_projects" ADD CONSTRAINT "partner_collaboration_projects_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "partner_collaborations" ADD CONSTRAINT "partner_collaborations_company_id_partner_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."partner_companies"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "partner_events" ADD CONSTRAINT "partner_events_actor_user_id_auth_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."auth_users"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "partner_inquiries" ADD CONSTRAINT "partner_inquiries_company_id_partner_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."partner_companies"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "partner_requests" ADD CONSTRAINT "partner_requests_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "partner_requests" ADD CONSTRAINT "partner_requests_actor_user_id_auth_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."auth_users"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "partner_requests" ADD CONSTRAINT "partner_requests_company_id_partner_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."partner_companies"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "partner_requests" ADD CONSTRAINT "partner_requests_reviewed_by_auth_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."auth_users"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "project_official_verifications" ADD CONSTRAINT "project_official_verifications_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "project_official_verifications" ADD CONSTRAINT "project_official_verifications_request_id_partner_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."partner_requests"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "project_verified_partners" ADD CONSTRAINT "project_verified_partners_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "project_verified_partners" ADD CONSTRAINT "project_verified_partners_company_id_partner_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."partner_companies"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "project_verified_partners" ADD CONSTRAINT "project_verified_partners_request_id_partner_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."partner_requests"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "partner_companies_domain_idx" ON "partner_companies" USING btree ("normalized_domain");
--> statement-breakpoint
CREATE UNIQUE INDEX "partner_requests_one_pending" ON "partner_requests" USING btree ("project_id","kind") WHERE "partner_requests"."status" = 'pending';

--> statement-breakpoint
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['partner_companies','partner_collaborations','partner_collaboration_projects','partner_collaboration_participants','partner_requests','project_official_verifications','project_verified_partners','partner_events','partner_inquiries'] LOOP
 EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
 EXECUTE format('REVOKE ALL ON TABLE %I FROM PUBLIC', t);
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN EXECUTE format('REVOKE ALL ON TABLE %I FROM anon',t); END IF;
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN EXECUTE format('REVOKE ALL ON TABLE %I FROM authenticated',t); END IF;
 END LOOP;
END $$;

--> statement-breakpoint
CREATE TRIGGER partner_audit_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON public.partner_events FOR EACH STATEMENT EXECUTE FUNCTION public.studio_audit_immutable();
--> statement-breakpoint
CREATE FUNCTION public.r4_relationship_guard() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE r public.partner_requests%ROWTYPE;
BEGIN
 SELECT * INTO r FROM public.partner_requests WHERE id = NEW.request_id;
 IF r.status <> 'approved' OR r.project_id <> NEW.project_id OR r.reviewed_by IS NULL OR r.reviewed_by = r.actor_user_id THEN RAISE EXCEPTION 'Approved independent staff review required'; END IF;
 IF TG_TABLE_NAME = 'project_official_verifications' AND r.kind <> 'verification' THEN RAISE EXCEPTION 'Verification request required'; END IF;
 IF TG_TABLE_NAME = 'project_verified_partners' THEN
   IF r.kind <> 'association' THEN RAISE EXCEPTION 'Association request required'; END IF;
   IF r.company_id IS DISTINCT FROM NEW.company_id THEN RAISE EXCEPTION 'Approval must match the associated company'; END IF;
 END IF;
 RETURN NULL;
END $$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER r4_official_guard AFTER INSERT OR UPDATE ON public.project_official_verifications DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.r4_relationship_guard();
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER r4_partner_guard AFTER INSERT OR UPDATE ON public.project_verified_partners DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.r4_relationship_guard();
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.r4_relationship_guard() FROM PUBLIC;
--> statement-breakpoint
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN REVOKE ALL ON FUNCTION public.r4_relationship_guard() FROM anon; END IF;
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN REVOKE ALL ON FUNCTION public.r4_relationship_guard() FROM authenticated; END IF;
END $$;
