CREATE TYPE "public"."article_category" AS ENUM('student_success', 'event', 'news');--> statement-breakpoint
CREATE TYPE "public"."article_status" AS ENUM('draft', 'in_review', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."media_kind" AS ENUM('avatar', 'article_cover', 'article_inline');--> statement-breakpoint
CREATE TABLE "articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"category" "article_category" NOT NULL,
	"status" "article_status" DEFAULT 'draft' NOT NULL,
	"title" text NOT NULL,
	"excerpt" text DEFAULT '' NOT NULL,
	"body_markdown" text DEFAULT '' NOT NULL,
	"cover_media_id" uuid,
	"cover_alt" text DEFAULT '' NOT NULL,
	"student_profile_id" uuid,
	"event_name" text DEFAULT '' NOT NULL,
	"event_date" date,
	"event_location" text DEFAULT '' NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"author_display_name" text NOT NULL,
	"student_approved_at" timestamp with time zone,
	"approval_requested_at" timestamp with time zone,
	"student_note" text DEFAULT '' NOT NULL,
	"published_at" timestamp with time zone,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "articles_slug_unique" UNIQUE("slug"),
	CONSTRAINT "articles_success_profile_check" CHECK ("articles"."category" <> 'student_success' OR "articles"."student_profile_id" IS NOT NULL),
	CONSTRAINT "articles_excerpt_check" CHECK (length("articles"."excerpt") <= 200),
	CONSTRAINT "articles_cover_alt_check" CHECK ("articles"."cover_media_id" IS NULL OR length(trim("articles"."cover_alt")) > 0),
	CONSTRAINT "articles_success_approval_check" CHECK ("articles"."status" <> 'published' OR "articles"."category" <> 'student_success' OR "articles"."student_approved_at" IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "articles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" text NOT NULL,
	"kind" "media_kind" NOT NULL,
	"mime" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"byte_size" integer NOT NULL,
	"sha256" text NOT NULL,
	"bytes" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "media_assets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "avatar_media_id" uuid;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_cover_media_id_media_assets_id_fk" FOREIGN KEY ("cover_media_id") REFERENCES "public"."media_assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_student_profile_id_student_profiles_id_fk" FOREIGN KEY ("student_profile_id") REFERENCES "public"."student_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_created_by_auth_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."auth_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_updated_by_auth_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."auth_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_owner_user_id_auth_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."auth_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "articles_public_idx" ON "articles" USING btree ("status","category","published_at");--> statement-breakpoint
CREATE INDEX "media_assets_owner_idx" ON "media_assets" USING btree ("owner_user_id");--> statement-breakpoint
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_avatar_media_id_media_assets_id_fk" FOREIGN KEY ("avatar_media_id") REFERENCES "public"."media_assets"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
REVOKE ALL PRIVILEGES ON TABLE public.articles, public.media_assets FROM PUBLIC;
--> statement-breakpoint
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN REVOKE ALL PRIVILEGES ON TABLE public.articles, public.media_assets FROM anon; END IF;
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN REVOKE ALL PRIVILEGES ON TABLE public.articles, public.media_assets FROM authenticated; END IF;
END $$;
