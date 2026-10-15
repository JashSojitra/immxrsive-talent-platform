-- NOT ImmXrsive R2 production Data API security hardening
-- REVIEW BEFORE RUNNING.
-- Target Supabase project: acnwbxqzkcdqgbohvpil, database: postgres.
-- Run only after release-2-production-security-audit.sql has been reviewed.
-- This migration changes privileges, RLS metadata, and the Drizzle migration
-- journal only. It does not read, update, delete, truncate, or otherwise alter
-- application records.

BEGIN;

DO $$
DECLARE
  application_tables constant text[] := ARRAY[
    'affiliation_verification_challenges',
    'affiliation_verification_rate_limits',
    'auth_accounts',
    'auth_sessions',
    'auth_users',
    'auth_verifications',
    'availability_options',
    'inquiries',
    'professional_links',
    'project_assets',
    'project_contributors',
    'project_technologies',
    'projects',
    'skills',
    'student_affiliations',
    'student_availability',
    'student_profile_availability',
    'student_profile_education',
    'student_profile_experience',
    'student_profile_links',
    'student_profile_skills',
    'student_profiles',
    'student_skills',
    'students'
  ];
  missing_tables text[];
  wrong_owner_tables text[];
  table_name text;
BEGIN
  IF current_database() <> 'postgres' THEN
    RAISE EXCEPTION 'Wrong database: expected postgres, received %', current_database();
  END IF;

  IF current_user <> 'postgres' THEN
    RAISE EXCEPTION 'Wrong database role: expected postgres, received %', current_user;
  END IF;

  IF NOT (SELECT rolbypassrls FROM pg_roles WHERE rolname = current_user) THEN
    RAISE EXCEPTION 'Server role % does not have BYPASSRLS; application compatibility is not established', current_user;
  END IF;

  SELECT array_agg(expected_name ORDER BY expected_name)
  INTO missing_tables
  FROM unnest(application_tables) AS expected(expected_name)
  WHERE to_regclass(format('public.%I', expected_name)) IS NULL;

  IF missing_tables IS NOT NULL THEN
    RAISE EXCEPTION 'Security hardening aborted; expected application tables are missing: %', missing_tables;
  END IF;

  SELECT array_agg(c.relname ORDER BY c.relname)
  INTO wrong_owner_tables
  FROM pg_class c
  WHERE c.relnamespace = 'public'::regnamespace
    AND c.relname = ANY(application_tables)
    AND pg_get_userbyid(c.relowner) <> current_user;

  IF wrong_owner_tables IS NOT NULL THEN
    RAISE EXCEPTION 'Security hardening aborted; server role does not own: %', wrong_owner_tables;
  END IF;

  FOREACH table_name IN ARRAY application_tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format(
      'REVOKE ALL PRIVILEGES ON TABLE public.%I FROM PUBLIC, anon, authenticated',
      table_name
    );
  END LOOP;
END
$$;

REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;
REVOKE CREATE ON SCHEMA public FROM PUBLIC, anon, authenticated;

-- Future application migrations run as postgres. Remove Supabase's automatic
-- client-role grants for new application tables, sequences, and functions.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL PRIVILEGES ON TABLES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL PRIVILEGES ON SEQUENCES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- Record the exact version-controlled migration so a later Drizzle run neither
-- repeats nor skips an unknown migration. A conflicting timestamp/hash aborts
-- this transaction rather than silently desynchronizing production.
DO $$
DECLARE
  migration_created_at constant bigint := 1791999181622;
  migration_hash constant text := '3d9c718bef8edb14d3bcbd8bff858f6f5d822776548d69ed6c1532a63df9fe92';
  conflicting_hash text;
BEGIN
  IF to_regclass('drizzle.__drizzle_migrations') IS NULL THEN
    RAISE EXCEPTION 'Drizzle migration journal is missing';
  END IF;

  SELECT hash
  INTO conflicting_hash
  FROM drizzle.__drizzle_migrations
  WHERE created_at = migration_created_at
    AND hash <> migration_hash
  LIMIT 1;

  IF conflicting_hash IS NOT NULL THEN
    RAISE EXCEPTION 'Migration 0007 timestamp already exists with a different hash';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM drizzle.__drizzle_migrations
    WHERE hash = migration_hash
      AND created_at <> migration_created_at
  ) THEN
    RAISE EXCEPTION 'Migration 0007 hash already exists with a different timestamp';
  END IF;

  INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
  SELECT migration_hash, migration_created_at
  WHERE NOT EXISTS (
    SELECT 1
    FROM drizzle.__drizzle_migrations
    WHERE hash = migration_hash
      AND created_at = migration_created_at
  );
END
$$;

COMMIT;
