-- NOT ImmXrsive R2 production Data API security audit (READ ONLY)
-- Target Supabase project: acnwbxqzkcdqgbohvpil, database: postgres.
-- Run before the hardening migration and save only the metadata results.
-- This script does not read application rows or expose credentials.

BEGIN TRANSACTION READ ONLY;

DO $$
BEGIN
  IF current_database() <> 'postgres' THEN
    RAISE EXCEPTION 'Wrong database: expected postgres, received %', current_database();
  END IF;
END
$$;

SELECT
  current_database() AS database_name,
  current_user AS database_role,
  current_setting('transaction_read_only') AS transaction_read_only,
  (SELECT rolbypassrls FROM pg_roles WHERE rolname = current_user) AS server_role_bypasses_rls,
  current_setting('pgrst.db_schemas', true) AS session_postgrest_exposed_schemas;

WITH expected(table_name) AS (
  VALUES
    ('affiliation_verification_challenges'),
    ('affiliation_verification_rate_limits'),
    ('auth_accounts'),
    ('auth_sessions'),
    ('auth_users'),
    ('auth_verifications'),
    ('availability_options'),
    ('inquiries'),
    ('professional_links'),
    ('project_assets'),
    ('project_contributors'),
    ('project_technologies'),
    ('projects'),
    ('skills'),
    ('student_affiliations'),
    ('student_availability'),
    ('student_profile_availability'),
    ('student_profile_education'),
    ('student_profile_experience'),
    ('student_profile_links'),
    ('student_profile_skills'),
    ('student_profiles'),
    ('student_skills'),
    ('students')
)
SELECT
  expected.table_name,
  c.oid IS NOT NULL AS exists,
  pg_get_userbyid(c.relowner) AS owner,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS force_rls,
  has_table_privilege('anon', c.oid, 'SELECT') AS anon_select,
  has_table_privilege('anon', c.oid, 'INSERT') AS anon_insert,
  has_table_privilege('anon', c.oid, 'UPDATE') AS anon_update,
  has_table_privilege('anon', c.oid, 'DELETE') AS anon_delete,
  has_table_privilege('authenticated', c.oid, 'SELECT') AS authenticated_select,
  has_table_privilege('authenticated', c.oid, 'INSERT') AS authenticated_insert,
  has_table_privilege('authenticated', c.oid, 'UPDATE') AS authenticated_update,
  has_table_privilege('authenticated', c.oid, 'DELETE') AS authenticated_delete
FROM expected
LEFT JOIN pg_class c
  ON c.relnamespace = 'public'::regnamespace
 AND c.relname = expected.table_name
 AND c.relkind IN ('r', 'p')
ORDER BY expected.table_name;

SELECT
  c.relname AS sequence_name,
  pg_get_userbyid(c.relowner) AS owner,
  has_sequence_privilege('anon', c.oid, 'USAGE') AS anon_usage,
  has_sequence_privilege('authenticated', c.oid, 'USAGE') AS authenticated_usage
FROM pg_class c
WHERE c.relnamespace = 'public'::regnamespace
  AND c.relkind = 'S'
ORDER BY c.relname;

SELECT
  role_name,
  has_schema_privilege(role_name, 'public', 'USAGE') AS schema_usage,
  has_schema_privilege(role_name, 'public', 'CREATE') AS schema_create
FROM unnest(ARRAY['anon', 'authenticated', current_user]) AS roles(role_name)
ORDER BY role_name;

SELECT nspacl::text AS public_schema_access_control_list
FROM pg_namespace
WHERE nspname = 'public';

SELECT
  pg_get_userbyid(defaclrole) AS object_creator,
  COALESCE(n.nspname, '*') AS schema_name,
  CASE defaclobjtype
    WHEN 'r' THEN 'tables'
    WHEN 'S' THEN 'sequences'
    WHEN 'f' THEN 'functions'
    WHEN 'T' THEN 'types'
    ELSE defaclobjtype::text
  END AS object_type,
  defaclacl::text AS access_control_list
FROM pg_default_acl d
LEFT JOIN pg_namespace n ON n.oid = d.defaclnamespace
WHERE n.nspname = 'public' OR n.nspname IS NULL
ORDER BY object_creator, schema_name, object_type;

SELECT
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS identity_arguments,
  p.prosecdef AS security_definer,
  has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_execute
FROM pg_proc p
WHERE p.pronamespace = 'public'::regnamespace
ORDER BY p.proname, identity_arguments;

SELECT
  c.relname AS view_name,
  CASE c.relkind WHEN 'v' THEN 'view' WHEN 'm' THEN 'materialized view' END AS view_type,
  has_table_privilege('anon', c.oid, 'SELECT') AS anon_select,
  has_table_privilege('authenticated', c.oid, 'SELECT') AS authenticated_select
FROM pg_class c
WHERE c.relnamespace = 'public'::regnamespace
  AND c.relkind IN ('v', 'm')
ORDER BY c.relname;

SELECT
  COALESCE(r.rolname, 'all roles') AS role_name,
  unnest(s.setconfig) AS relevant_setting
FROM pg_db_role_setting s
LEFT JOIN pg_roles r ON r.oid = s.setrole
WHERE s.setdatabase IN (0, (SELECT oid FROM pg_database WHERE datname = current_database()))
  AND array_to_string(s.setconfig, ',') ~ '(pgrst|search_path)'
ORDER BY role_name, relevant_setting;

SELECT
  count(*) AS migration_journal_rows,
  count(*) FILTER (
    WHERE created_at = 1791999181622
      AND hash = '3d9c718bef8edb14d3bcbd8bff858f6f5d822776548d69ed6c1532a63df9fe92'
  ) AS migration_0007_matching_rows,
  count(*) FILTER (
    WHERE created_at = 1791999181622
      AND hash <> '3d9c718bef8edb14d3bcbd8bff858f6f5d822776548d69ed6c1532a63df9fe92'
  ) AS migration_0007_conflicting_rows
FROM drizzle.__drizzle_migrations;

COMMIT;
