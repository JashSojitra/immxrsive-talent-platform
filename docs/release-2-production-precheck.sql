-- NOT ImmXrsive Release 2 production precheck (READ ONLY)
-- In Supabase, first confirm the selected project is acnwbxqzkcdqgbohvpil.
-- Expected database: postgres. This script makes no changes.

BEGIN TRANSACTION READ ONLY;

SELECT
  current_database() AS database_name,
  current_user AS database_user,
  current_setting('transaction_read_only') AS transaction_read_only;

SELECT id, hash, created_at
FROM drizzle.__drizzle_migrations
ORDER BY id;

WITH expected(id, tag, hash, created_at) AS (
  VALUES
    (0, '0000_lonely_guardian', '8bbc92d4b3872fcd3cd6af660e994ff92ac5af24e525266337375a48ec11bc47', 1790706443089::bigint),
    (1, '0001_tearful_agent_brand', 'b790d71ce457de1482655dfc122999898f394ffb24548ab0f130866b8a1e5ac6', 1791588001936::bigint),
    (2, '0002_rainy_wallflower', '5a910e33d6e20793ed4c893affeaa459b7ca0b09e49a84e882cdaf0d1be000ac', 1791774105009::bigint),
    (3, '0003_wise_rockslide', '6883f65cef7465ee5426d67f438f20907cec243327bec78a62fb8f76af6a0dd3', 1791831456656::bigint),
    (4, '0004_salty_the_call', 'e291a5a15cef439a4f51c86f6cdfb4f98b1811f68b7e9a9dbd916cd629549e1b', 1791839286226::bigint),
    (5, '0005_little_giant_girl', '3c9735a25f174f1c7055c3059a88ea8b79baccdf0073ef43f02d54c52a9f05d2', 1791855325918::bigint),
    (6, '0006_adorable_lord_tyger', '0babe26b8388427908f680578fee6f379e8006a31ac0c65a7e87eb25f7b5df26', 1791859600188::bigint)
), actual AS (
  SELECT id, hash, created_at
  FROM drizzle.__drizzle_migrations
)
SELECT
  (SELECT count(*) FROM actual) AS actual_journal_rows,
  1 AS required_journal_rows,
  (SELECT id = 1 AND hash = '8bbc92d4b3872fcd3cd6af660e994ff92ac5af24e525266337375a48ec11bc47' AND created_at = 1790706443089::bigint
     FROM actual ORDER BY id LIMIT 1) AS migration_0000_matches,
  '8bbc92d4b3872fcd3cd6af660e994ff92ac5af24e525266337375a48ec11bc47' AS expected_0000_hash,
  1790706443089::bigint AS expected_0000_created_at;

SELECT 'students' AS relation, count(*)::bigint AS row_count FROM public.students
UNION ALL SELECT 'projects', count(*)::bigint FROM public.projects
UNION ALL SELECT 'skills', count(*)::bigint FROM public.skills
UNION ALL SELECT 'inquiries', count(*)::bigint FROM public.inquiries
ORDER BY relation;

SELECT
  to_regclass('public.students') AS students_table,
  to_regclass('public.projects') AS projects_table,
  to_regclass('public.skills') AS skills_table,
  to_regclass('public.inquiries') AS inquiries_table,
  to_regclass('public.auth_users') AS auth_users_must_be_null,
  to_regclass('public.student_profiles') AS student_profiles_must_be_null;

COMMIT;
