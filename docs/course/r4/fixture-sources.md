# Exact fixture sources — production bytes verified

The four production fixture sources were verified on 2026-11-17 at deployed commit `27fb2a3ca3dd7a44076fafcda6d27c85b7c56672`. Each returned HTTP 200, text/html, no redirect or compression, and the exact SHA-256 below. The reserved `.example.test` links inside fixture HTML are company website test values, not functioning import-source URLs. The parser uses these linked website values for domain warnings and keeps the fetched HTML URL separately as provenance.

| Exact file | Repository static path | Verified public source URL |
|---|---|---|
| company_normal.html | public/fixtures/r4/company_normal.html | https://immxrsive-talent-platform.vercel.app/fixtures/r4/company_normal.html |
| company_sparse.html | public/fixtures/r4/company_sparse.html | https://immxrsive-talent-platform.vercel.app/fixtures/r4/company_sparse.html |
| company_prompt_injection.html | public/fixtures/r4/company_prompt_injection.html | https://immxrsive-talent-platform.vercel.app/fixtures/r4/company_prompt_injection.html |
| company_same_name_other_domain.html | public/fixtures/r4/company_same_name_other_domain.html | https://immxrsive-talent-platform.vercel.app/fixtures/r4/company_same_name_other_domain.html |

After any future hosting change, update each complete public HTTPS URL and repeat the independent response-byte verification. The site can serve `/fixtures/r4/<filename>` after an authorized deployment, but no origin is presumed here. HTTPS fixture hosting must resolve to supported public IPv4 and serve HTML without redirects/compression for this deliberately conservative importer.

`tests/unit/r4-import.test.ts` reads the exact HTML and uses `tests/fixtures/r4/expected_company_imports.json` only as assertions. These are parser tests; the synthetic parser source URL in the test does not establish hosting or test a live URL fetch. The independent sprint verified included bytes against the supplied transport manifest. On 2026-11-18 the original instructor ZIP was located in Downloads: all four HTML files matched byte-for-byte; the seed and expected JSON matched exactly after Windows checkout newline normalization.

## Collaboration setup on disposable PostgreSQL 17

1. Apply migrations and install canonical R1–R3 project fixtures using established test setup.
2. Create the two exact company names through the staff workflow (North Shore Simulations and Superior Immersive Labs). Resolve their actual IDs from the staff response. Do not infer IDs from names alone in a live dataset.
3. Prepare an explicit mapping JSON with `actorUserId`, `companiesByName` (exact company name -> installed company UUID), and `projectsByFixtureId` (`P01`, `P04` -> installed canonical project IDs). Preserve the actual mapping as evidence. Never substitute an unrelated project silently.
4. With TEST_DATABASE_URL pointing to a loopback `immxrsive_test_*` database, run `node --import tsx scripts/seed-r4-collaborations.ts <mapping.json>`. The script rejects production/remote targets, non-PG17, missing/misnamed companies, unresolved projects, non-staff actors and repeated seed IDs. It consumes the supplied collaboration_seed.json, not the expectation file.
5. Complete honest descriptions, outcomes and participating public students through `/admin/partners`. The exact seed contains no such narrative or people; the script does not invent them. COL01 is 2025/past/public/P01, COL02 is 2026/current/public/P04, COL03 is 2026/current/private/no project.

Do not use this disposable-only script as a production data import. Production demonstration records require a separately authorized operator workflow.

## Included-byte hashes for later hosted verification

The production response-byte checks matched these hashes. For subsequent verification, request each complete HTTPS URL with `Accept-Encoding: identity`, require HTTP 200 / `text/html` without redirection, and compare the response bytes to these SHA-256 values. Record the actual origin, verification time and response result privately as appropriate; replace PENDING only after that check.

| File | SHA-256 |
|---|---|
| company_normal.html | `01b62107d07d95e8b66612a79e94b55365e35cd457fb601f80b0920f679cfcea` |
| company_prompt_injection.html | `e8c3a40b2f338e23ee6ba9e706ae00870e4069356c8ad24b2cc8c54de2a404a4` |
| company_same_name_other_domain.html | `38dbf4191a84050feee17296c1f3788c9ae024ea40342680e1315e9397eb17e5` |
| company_sparse.html | `8b760e00b903a40e88f5bae079af79f266569b534132a0e23e5a1cc45e30ea0a` |

Production HTTP evidence is recorded in production-evidence/http-smoke.json. Hosted byte verification is complete. Authenticated normal/sparse imports, explicit publication, duplicate/similar-name behavior and two exact collaborations passed on 2026-11-18. Student request acceptance remains pending.

## Installed production fixtures (2026-11-18)

Published North Shore Simulations: `4912f68c-6ca7-403f-8f9e-6c9e713b02bd` / https://immxrsive-talent-platform.vercel.app/partners/4912f68c-6ca7-403f-8f9e-6c9e713b02bd. Private sparse draft: `8fa3db85-3ec5-4530-9585-1cd269dac3b0`. COL01 `3719463f-6832-426f-a112-9dc4a3b0eeb7` maps to P01; COL02 `af393cdc-3da9-4b90-b394-bf13f01f3fb6` maps to P04. No seed script ran against production; records were created via authenticated staff UI. The supplied seed has no participating students; none were invented.
