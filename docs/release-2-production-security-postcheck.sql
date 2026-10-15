-- NOT ImmXrsive R2 production Data API security postcheck (READ ONLY)
-- Target Supabase project: acnwbxqzkcdqgbohvpil, database: postgres.
-- PASS requires one summary row with protected_tables = 24,
-- rls_enabled_tables = 24, and every exposed_* value = 0.

BEGIN TRANSACTION READ ONLY;

DO $$
BEGIN
  IF current_database() <> 'postgres' THEN
    RAISE EXCEPTION 'Wrong database: expected postgres, received %', current_database();
  END IF;
END
$$;

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
), inspected AS (
  SELECT
    expected.table_name,
    c.oid,
    c.relrowsecurity,
    (
      has_table_privilege('anon', c.oid, 'SELECT')
      OR has_table_privilege('anon', c.oid, 'INSERT')
      OR has_table_privilege('anon', c.oid, 'UPDATE')
      OR has_table_privilege('anon', c.oid, 'DELETE')
      OR has_table_privilege('anon', c.oid, 'TRUNCATE')
      OR has_table_privilege('anon', c.oid, 'REFERENCES')
      OR has_table_privilege('anon', c.oid, 'TRIGGER')
    ) AS anon_has_any,
    (
      has_table_privilege('authenticated', c.oid, 'SELECT')
      OR has_table_privilege('authenticated', c.oid, 'INSERT')
      OR has_table_privilege('authenticated', c.oid, 'UPDATE')
      OR has_table_privilege('authenticated', c.oid, 'DELETE')
      OR has_table_privilege('authenticated', c.oid, 'TRUNCATE')
      OR has_table_privilege('authenticated', c.oid, 'REFERENCES')
      OR has_table_privilege('authenticated', c.oid, 'TRIGGER')
    ) AS authenticated_has_any
  FROM expected
  LEFT JOIN pg_class c
    ON c.relnamespace = 'public'::regnamespace
   AND c.relname = expected.table_name
   AND c.relkind IN ('r', 'p')
)
SELECT
  count(*) AS protected_tables,
  count(*) FILTER (WHERE oid IS NULL) AS missing_tables,
  count(*) FILTER (WHERE relrowsecurity) AS rls_enabled_tables,
  count(*) FILTER (WHERE anon_has_any) AS exposed_to_anon,
  count(*) FILTER (WHERE authenticated_has_any) AS exposed_to_authenticated
FROM inspected;

SELECT
  count(*) FILTER (WHERE
    has_sequence_privilege('anon', c.oid, 'USAGE')
    OR has_sequence_privilege('anon', c.oid, 'SELECT')
    OR has_sequence_privilege('anon', c.oid, 'UPDATE')
  ) AS exposed_sequences_to_anon,
  count(*) FILTER (WHERE
    has_sequence_privilege('authenticated', c.oid, 'USAGE')
    OR has_sequence_privilege('authenticated', c.oid, 'SELECT')
    OR has_sequence_privilege('authenticated', c.oid, 'UPDATE')
  ) AS exposed_sequences_to_authenticated
FROM pg_class c
WHERE c.relnamespace = 'public'::regnamespace
  AND c.relkind = 'S';

SELECT
  count(*) FILTER (WHERE has_function_privilege('anon', p.oid, 'EXECUTE')) AS executable_functions_by_anon,
  count(*) FILTER (WHERE has_function_privilege('authenticated', p.oid, 'EXECUTE')) AS executable_functions_by_authenticated
FROM pg_proc p
WHERE p.pronamespace = 'public'::regnamespace;

SELECT
  has_schema_privilege('anon', 'public', 'CREATE') AS anon_can_create,
  has_schema_privilege('authenticated', 'public', 'CREATE') AS authenticated_can_create,
  has_schema_privilege(current_user, 'public', 'USAGE') AS server_can_use_schema,
  (SELECT rolbypassrls FROM pg_roles WHERE rolname = current_user) AS server_bypasses_rls;

SELECT
  pg_get_userbyid(defaclrole) AS object_creator,
  COALESCE(n.nspname, '*') AS schema_name,
  defaclobjtype AS object_type,
  defaclacl::text AS access_control_list
FROM pg_default_acl d
LEFT JOIN pg_namespace n ON n.oid = d.defaclnamespace
WHERE pg_get_userbyid(defaclrole) = 'postgres'
  AND (n.nspname = 'public' OR n.nspname IS NULL)
ORDER BY schema_name, object_type;

WITH client_roles AS (
  SELECT oid FROM pg_roles WHERE rolname IN ('anon', 'authenticated')
), exposed_defaults AS (
  SELECT 1
  FROM pg_default_acl d
  CROSS JOIN LATERAL aclexplode(d.defaclacl) acl
  LEFT JOIN pg_namespace n ON n.oid = d.defaclnamespace
  WHERE pg_get_userbyid(d.defaclrole) = 'postgres'
    AND (n.nspname = 'public' OR (n.nspname IS NULL AND d.defaclobjtype = 'f'))
    AND (acl.grantee = 0 OR acl.grantee IN (SELECT oid FROM client_roles))
)
SELECT count(*) AS future_postgres_object_client_grants
FROM exposed_defaults;

SELECT
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
