CREATE TYPE "public"."student_affiliation_status" AS ENUM('verified');--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE "affiliation_verification_rate_limits" (
	"key_hash" text PRIMARY KEY NOT NULL,
	"action" text NOT NULL,
	"window_started_at" timestamp with time zone NOT NULL,
	"attempt_count" integer DEFAULT 1 NOT NULL,
	"blocked_until" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_affiliations" (
	"user_id" text PRIMARY KEY NOT NULL,
	"institutional_email" text NOT NULL,
	"status" "student_affiliation_status" DEFAULT 'verified' NOT NULL,
	"verified_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "affiliation_verification_challenges" ADD CONSTRAINT "affiliation_verification_challenges_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_affiliations" ADD CONSTRAINT "student_affiliations_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "affiliation_challenges_user_idx" ON "affiliation_verification_challenges" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "affiliation_challenges_email_idx" ON "affiliation_verification_challenges" USING btree ("institutional_email");--> statement-breakpoint
CREATE INDEX "affiliation_challenges_expires_idx" ON "affiliation_verification_challenges" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "affiliation_rate_limits_action_idx" ON "affiliation_verification_rate_limits" USING btree ("action");--> statement-breakpoint
CREATE UNIQUE INDEX "student_affiliations_email_unique" ON "student_affiliations" USING btree ("institutional_email");