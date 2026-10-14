-- NOT ImmXrsive Release 2 production post-migration verification (READ ONLY)
-- Run only in Supabase project acnwbxqzkcdqgbohvpil after the migration succeeds.

BEGIN TRANSACTION READ ONLY;

WITH expected(tag, hash, created_at) AS (
  VALUES
    ('0000_lonely_guardian', '8bbc92d4b3872fcd3cd6af660e994ff92ac5af24e525266337375a48ec11bc47', 1790706443089::bigint),
    ('0001_tearful_agent_brand', 'b790d71ce457de1482655dfc122999898f394ffb24548ab0f130866b8a1e5ac6', 1791588001936::bigint),
    ('0002_rainy_wallflower', '5a910e33d6e20793ed4c893affeaa459b7ca0b09e49a84e882cdaf0d1be000ac', 1791774105009::bigint),
    ('0003_wise_rockslide', '6883f65cef7465ee5426d67f438f20907cec243327bec78a62fb8f76af6a0dd3', 1791831456656::bigint),
    ('0004_salty_the_call', 'e291a5a15cef439a4f51c86f6cdfb4f98b1811f68b7e9a9dbd916cd629549e1b', 1791839286226::bigint),
    ('0005_little_giant_girl', '3c9735a25f174f1c7055c3059a88ea8b79baccdf0073ef43f02d54c52a9f05d2', 1791855325918::bigint),
    ('0006_adorable_lord_tyger', '0babe26b8388427908f680578fee6f379e8006a31ac0c65a7e87eb25f7b5df26', 1791859600188::bigint)
)
SELECT
  expected.tag,
  actual.id,
  actual.hash,
  actual.created_at,
  (actual.hash = expected.hash AND actual.created_at = expected.created_at) AS matches
FROM expected
LEFT JOIN drizzle.__drizzle_migrations actual
  ON actual.hash = expected.hash AND actual.created_at = expected.created_at
ORDER BY expected.created_at;

SELECT 'students' AS relation, count(*)::bigint AS row_count FROM public.students
UNION ALL SELECT 'projects', count(*)::bigint FROM public.projects
UNION ALL SELECT 'skills', count(*)::bigint FROM public.skills
UNION ALL SELECT 'inquiries', count(*)::bigint FROM public.inquiries
ORDER BY relation;

SELECT
  to_regclass('public.auth_users') AS auth_users,
  to_regclass('public.student_affiliations') AS student_affiliations,
  to_regclass('public.student_profiles') AS student_profiles,
  to_regclass('public.student_profile_education') AS student_profile_education,
  to_regclass('public.student_profile_experience') AS student_profile_experience;

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'student_profiles'
ORDER BY ordinal_position;

COMMIT;
