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
  table_name text;
BEGIN
  SELECT array_agg(expected_name ORDER BY expected_name)
  INTO missing_tables
  FROM unnest(application_tables) AS expected(expected_name)
  WHERE to_regclass(format('public.%I', expected_name)) IS NULL;

  IF missing_tables IS NOT NULL THEN
    RAISE EXCEPTION 'Security hardening aborted; expected application tables are missing: %', missing_tables;
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
--> statement-breakpoint
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
REVOKE CREATE ON SCHEMA public FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL PRIVILEGES ON TABLES FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL PRIVILEGES ON SEQUENCES FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES FOR ROLE postgres
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
