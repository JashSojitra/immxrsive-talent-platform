-- NOT ImmXrsive Release 2 production migration for Supabase SQL Editor
-- Generated from drizzle/0001-0006 and drizzle/meta/_journal.json.
-- Run only in project acnwbxqzkcdqgbohvpil after the read-only precheck matches exactly.

BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '120s';

DO $preflight$
DECLARE
  journal_rows bigint;
  baseline_id integer;
  baseline_hash text;
  baseline_created_at bigint;
BEGIN
  IF current_database() <> 'postgres' THEN
    RAISE EXCEPTION 'Wrong database: expected postgres, got %', current_database();
  END IF;

  IF to_regclass('drizzle.__drizzle_migrations') IS NULL THEN
    RAISE EXCEPTION 'Missing drizzle.__drizzle_migrations';
  END IF;

  SELECT count(*) INTO journal_rows FROM drizzle.__drizzle_migrations;
  IF journal_rows <> 1 THEN
    RAISE EXCEPTION 'Expected exactly one production journal row, found %', journal_rows;
  END IF;

  SELECT id, hash, created_at
  INTO baseline_id, baseline_hash, baseline_created_at
  FROM drizzle.__drizzle_migrations
  ORDER BY id
  LIMIT 1;

  IF baseline_id <> 1
     OR baseline_hash <> '8bbc92d4b3872fcd3cd6af660e994ff92ac5af24e525266337375a48ec11bc47'
     OR baseline_created_at <> 1790706443089::bigint THEN
    RAISE EXCEPTION 'Migration 0000 journal mismatch';
  END IF;

  IF (SELECT count(*) FROM public.students) <> 18
     OR (SELECT count(*) FROM public.projects) <> 9
     OR (SELECT count(*) FROM public.skills) <> 24
     OR (SELECT count(*) FROM public.inquiries) <> 3 THEN
    RAISE EXCEPTION 'Release 1 row-count baseline mismatch';
  END IF;

  IF to_regclass('public.auth_users') IS NOT NULL
     OR to_regclass('public.student_profiles') IS NOT NULL THEN
    RAISE EXCEPTION 'Release 2 schema objects already exist while the journal is at 0000';
  END IF;
END
$preflight$;

-- 0001_tearful_agent_brand.sql
CREATE TABLE "auth_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "auth_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "auth_sessions_token_unique" UNIQUE("token")
);

CREATE TABLE "auth_users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_users_email_unique" UNIQUE("email")
);

CREATE TABLE "auth_verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "auth_accounts" ADD CONSTRAINT "auth_accounts_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;
CREATE UNIQUE INDEX "auth_accounts_provider_account_unique" ON "auth_accounts" USING btree ("provider_id","account_id");
CREATE INDEX "auth_accounts_user_id_idx" ON "auth_accounts" USING btree ("user_id");
CREATE INDEX "auth_sessions_user_id_idx" ON "auth_sessions" USING btree ("user_id");
CREATE INDEX "auth_verifications_identifier_idx" ON "auth_verifications" USING btree ("identifier");

INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
VALUES ('b790d71ce457de1482655dfc122999898f394ffb24548ab0f130866b8a1e5ac6', 1791588001936::bigint);

-- 0002_rainy_wallflower.sql
CREATE TYPE "public"."student_affiliation_status" AS ENUM('verified');
CREATE TABLE "affiliation_verification_challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"institutional_email" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"superseded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "affiliation_verification_challenges_token_hash_unique" UNIQUE("token_hash")
);

CREATE TABLE "affiliation_verification_rate_limits" (
	"key_hash" text PRIMARY KEY NOT NULL,
	"action" text NOT NULL,
	"window_started_at" timestamp with time zone NOT NULL,
	"attempt_count" integer DEFAULT 1 NOT NULL,
	"blocked_until" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "student_affiliations" (
	"user_id" text PRIMARY KEY NOT NULL,
	"institutional_email" text NOT NULL,
	"status" "student_affiliation_status" DEFAULT 'verified' NOT NULL,
	"verified_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "affiliation_verification_challenges" ADD CONSTRAINT "affiliation_verification_challenges_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "student_affiliations" ADD CONSTRAINT "student_affiliations_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX "affiliation_challenges_user_idx" ON "affiliation_verification_challenges" USING btree ("user_id");
CREATE INDEX "affiliation_challenges_email_idx" ON "affiliation_verification_challenges" USING btree ("institutional_email");
CREATE INDEX "affiliation_challenges_expires_idx" ON "affiliation_verification_challenges" USING btree ("expires_at");
CREATE INDEX "affiliation_rate_limits_action_idx" ON "affiliation_verification_rate_limits" USING btree ("action");
CREATE UNIQUE INDEX "student_affiliations_email_unique" ON "student_affiliations" USING btree ("institutional_email");

INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
VALUES ('5a910e33d6e20793ed4c893affeaa459b7ca0b09e49a84e882cdaf0d1be000ac', 1791774105009::bigint);

-- 0003_wise_rockslide.sql
CREATE TYPE "public"."student_profile_link_type" AS ENUM('linkedin', 'github', 'portfolio', 'other');
CREATE TABLE "student_profile_availability" (
	"profile_id" uuid NOT NULL,
	"availability_value" "availability_value" NOT NULL,
	"display_order" integer NOT NULL,
	CONSTRAINT "student_profile_availability_profile_id_availability_value_pk" PRIMARY KEY("profile_id","availability_value")
);

CREATE TABLE "student_profile_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"link_type" "student_profile_link_type" NOT NULL,
	"label" text NOT NULL,
	"url" text NOT NULL,
	"display_order" integer NOT NULL
);

CREATE TABLE "student_profile_skills" (
	"profile_id" uuid NOT NULL,
	"skill_id" text NOT NULL,
	"display_order" integer NOT NULL,
	CONSTRAINT "student_profile_skills_profile_id_skill_id_pk" PRIMARY KEY("profile_id","skill_id")
);

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

ALTER TABLE "student_profile_availability" ADD CONSTRAINT "student_profile_availability_profile_id_student_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."student_profiles"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "student_profile_availability" ADD CONSTRAINT "student_profile_availability_availability_value_availability_options_value_fk" FOREIGN KEY ("availability_value") REFERENCES "public"."availability_options"("value") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "student_profile_links" ADD CONSTRAINT "student_profile_links_profile_id_student_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."student_profiles"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "student_profile_skills" ADD CONSTRAINT "student_profile_skills_profile_id_student_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."student_profiles"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "student_profile_skills" ADD CONSTRAINT "student_profile_skills_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_owner_user_id_auth_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;
CREATE UNIQUE INDEX "student_profile_availability_order_unique" ON "student_profile_availability" USING btree ("profile_id","display_order");
CREATE UNIQUE INDEX "student_profile_links_order_unique" ON "student_profile_links" USING btree ("profile_id","display_order");
CREATE INDEX "student_profile_links_profile_idx" ON "student_profile_links" USING btree ("profile_id");
CREATE UNIQUE INDEX "student_profile_skills_order_unique" ON "student_profile_skills" USING btree ("profile_id","display_order");
CREATE INDEX "student_profiles_owner_idx" ON "student_profiles" USING btree ("owner_user_id");

INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
VALUES ('6883f65cef7465ee5426d67f438f20907cec243327bec78a62fb8f76af6a0dd3', 1791831456656::bigint);

-- 0004_salty_the_call.sql
CREATE TABLE "student_profile_education" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"description" text NOT NULL,
	"display_order" integer NOT NULL
);

CREATE TABLE "student_profile_experience" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"description" text NOT NULL,
	"display_order" integer NOT NULL
);

ALTER TABLE "student_profile_education" ADD CONSTRAINT "student_profile_education_profile_id_student_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."student_profiles"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "student_profile_experience" ADD CONSTRAINT "student_profile_experience_profile_id_student_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."student_profiles"("id") ON DELETE cascade ON UPDATE no action;
CREATE UNIQUE INDEX "student_profile_education_order_unique" ON "student_profile_education" USING btree ("profile_id","display_order");
CREATE INDEX "student_profile_education_profile_idx" ON "student_profile_education" USING btree ("profile_id");
CREATE UNIQUE INDEX "student_profile_experience_order_unique" ON "student_profile_experience" USING btree ("profile_id","display_order");
CREATE INDEX "student_profile_experience_profile_idx" ON "student_profile_experience" USING btree ("profile_id");

INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
VALUES ('e291a5a15cef439a4f51c86f6cdfb4f98b1811f68b7e9a9dbd916cd629549e1b', 1791839286226::bigint);

-- 0005_little_giant_girl.sql
ALTER TABLE "student_profiles" ADD COLUMN "program" text DEFAULT '' NOT NULL;
ALTER TABLE "student_profiles" ADD COLUMN "student_status" "student_status";
ALTER TABLE "student_profiles" ADD COLUMN "show_availability" boolean DEFAULT false NOT NULL;
ALTER TABLE "student_profiles" ADD COLUMN "show_professional_links" boolean DEFAULT false NOT NULL;
ALTER TABLE "student_profiles" ADD COLUMN "show_public_location" boolean DEFAULT false NOT NULL;
ALTER TABLE "student_profiles" ADD COLUMN "show_education" boolean DEFAULT false NOT NULL;
ALTER TABLE "student_profiles" ADD COLUMN "show_experience" boolean DEFAULT false NOT NULL;
ALTER TABLE "student_profiles" ADD COLUMN "published_at" timestamp with time zone;
CREATE INDEX "student_profiles_publication_idx" ON "student_profiles" USING btree ("publication_status");

INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
VALUES ('3c9735a25f174f1c7055c3059a88ea8b79baccdf0073ef43f02d54c52a9f05d2', 1791855325918::bigint);

-- 0006_adorable_lord_tyger.sql
ALTER TABLE "student_profiles" ADD COLUMN "presentation_preset" text DEFAULT 'spatial' NOT NULL;
ALTER TABLE "student_profiles" ADD COLUMN "hero_media" text DEFAULT 'default' NOT NULL;
ALTER TABLE "student_profiles" ADD COLUMN "section_order" jsonb DEFAULT '["about","skills","background","links"]'::jsonb NOT NULL;

INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
VALUES ('0babe26b8388427908f680578fee6f379e8006a31ac0c65a7e87eb25f7b5df26', 1791859600188::bigint);

DO $postflight$
BEGIN
  IF (SELECT count(*) FROM drizzle.__drizzle_migrations) <> 7 THEN
    RAISE EXCEPTION 'Expected seven journal rows after migration';
  END IF;

  IF (
    WITH expected(hash, created_at) AS (
      VALUES
      ('8bbc92d4b3872fcd3cd6af660e994ff92ac5af24e525266337375a48ec11bc47', 1790706443089::bigint),
      ('b790d71ce457de1482655dfc122999898f394ffb24548ab0f130866b8a1e5ac6', 1791588001936::bigint),
      ('5a910e33d6e20793ed4c893affeaa459b7ca0b09e49a84e882cdaf0d1be000ac', 1791774105009::bigint),
      ('6883f65cef7465ee5426d67f438f20907cec243327bec78a62fb8f76af6a0dd3', 1791831456656::bigint),
      ('e291a5a15cef439a4f51c86f6cdfb4f98b1811f68b7e9a9dbd916cd629549e1b', 1791839286226::bigint),
      ('3c9735a25f174f1c7055c3059a88ea8b79baccdf0073ef43f02d54c52a9f05d2', 1791855325918::bigint),
      ('0babe26b8388427908f680578fee6f379e8006a31ac0c65a7e87eb25f7b5df26', 1791859600188::bigint)
    )
    SELECT count(*)
    FROM expected
    INNER JOIN drizzle.__drizzle_migrations actual USING (hash, created_at)
  ) <> 7 THEN
    RAISE EXCEPTION 'One or more journal hashes or timestamps do not match';
  END IF;

  IF (SELECT count(*) FROM public.students) <> 18
     OR (SELECT count(*) FROM public.projects) <> 9
     OR (SELECT count(*) FROM public.skills) <> 24
     OR (SELECT count(*) FROM public.inquiries) <> 3 THEN
    RAISE EXCEPTION 'Release 1 data counts changed during migration';
  END IF;

  IF to_regclass('public.auth_users') IS NULL
     OR to_regclass('public.student_profiles') IS NULL
     OR to_regclass('public.student_profile_education') IS NULL
     OR to_regclass('public.student_profile_experience') IS NULL THEN
    RAISE EXCEPTION 'Required Release 2 tables are missing';
  END IF;
END
$postflight$;

COMMIT;
