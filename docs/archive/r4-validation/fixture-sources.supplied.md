# Exact fixture sources — hosting PENDING

No public fixture source URL has been hosted or verified by this job. The reserved `.example.test` links inside fixture HTML are company website test values, not functioning import-source URLs. The parser uses these linked website values for domain warnings and keeps the fetched HTML URL separately as provenance.

| Exact file | Repository static path | Verified public source URL |
|---|---|---|
| company_normal.html | public/fixtures/r4/company_normal.html | PENDING |
| company_sparse.html | public/fixtures/r4/company_sparse.html | PENDING |
| company_prompt_injection.html | public/fixtures/r4/company_prompt_injection.html | PENDING |
| company_same_name_other_domain.html | public/fixtures/r4/company_same_name_other_domain.html | PENDING |

After authorized hosting, set each complete public HTTPS URL here. Fetch it independently and compare SHA-256 against the supplied exact bytes before calling it verified. The site can serve `/fixtures/r4/<filename>` after an authorized deployment, but no origin is presumed here. HTTPS fixture hosting must resolve to supported public IPv4 and serve HTML without redirects/compression for this deliberately conservative importer.

`tests/unit/r4-import.test.ts` reads the exact HTML and uses `tests/fixtures/r4/expected_company_imports.json` only as assertions. These are parser tests; the synthetic parser source URL in the test does not establish hosting or test a live URL fetch. All copied files match `_r4_sprint_reference/fixtures` byte-for-byte.

## Collaboration setup on disposable PostgreSQL 17

1. Apply migrations and install canonical R1–R3 project fixtures using established test setup.
2. Create the two exact company names through the staff workflow (North Shore Simulations and Superior Immersive Labs). Resolve their actual IDs from the staff response. Do not infer IDs from names alone in a live dataset.
3. Prepare an explicit mapping JSON with `actorUserId`, `companiesByName` (exact company name -> installed company UUID), and `projectsByFixtureId` (`P01`, `P04` -> installed canonical project IDs). Preserve the actual mapping as evidence. Never substitute an unrelated project silently.
4. With TEST_DATABASE_URL pointing to a loopback `immxrsive_test_*` database, run `node --import tsx scripts/seed-r4-collaborations.ts <mapping.json>`. The script rejects production/remote targets, non-PG17, missing/misnamed companies, unresolved projects, non-staff actors and repeated seed IDs. It consumes the supplied collaboration_seed.json, not the expectation file.
5. Complete honest descriptions, outcomes and participating public students through `/admin/partners`. The exact seed contains no such narrative or people; the script does not invent them. COL01 is 2025/past/public/P01, COL02 is 2026/current/public/P04, COL03 is 2026/current/private/no project.

Do not use this disposable-only script as a production data import. Production demonstration records require a separately authorized operator workflow.
