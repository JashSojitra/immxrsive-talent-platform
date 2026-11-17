# Morning validation and integration

First review/apply the returned patch to `feat/r4-staff-industry-collaborations` created from the verified admin head. The worker's synthetic Git history is not the source history. Re-verify GitHub/admin branch heads before integration; do not rewrite #9/#10/main or old tags. Obtain independent Codex review of the final patch under the local delegation procedure before committing.

The worker used Node 22.22.0 from `/tmp/node-v22.22.0-linux-x64/bin` and installed lockfile dependencies without changing the lockfile. Default worker Node 18 is unsupported. Use project Node >=22.12 (the installed test dependencies currently support Node 22/24/26 ranges).

Run heavy verification through the caller's `lab-dispatch` / `ld` workflow, not directly on an arbitrarily chosen lab host. No dispatcher skill or configured disposable PG17 target was supplied to this worker. Dispatch these commands using that workflow's documented syntax:

- PostgreSQL 17 disposable service and `npm run test:integration` (includes `tests/integration/r4-partners.test.ts`, existing R1–R3 API, auth, ownership, admin/session and migration regressions).
- `npm run build`.
- `npx playwright test tests/browser/r4-partners.spec.ts` initially, then the cumulative existing browser suite once fixes pass. The configured browser harness requires a production build, TEST_DATABASE_URL and a distinct development/runtime identity; it uses one worker and synthetic Better Auth accounts.
- Full `npm run lint` and cumulative unit/frontend checks if required by the release workflow. The worker already ran typecheck, changed-file lint and selected regression tests; see its exact command record.

Use only loopback disposable `immxrsive_test_*` databases, never production credentials. The integration harness creates isolated per-file databases; its control user must have CREATEDB. Existing migrations assume the test roles documented by the current harness. No R4 SQL has been applied to any live database.

## Manual hosted-fixture and course evidence

1. Host exact HTML bytes through an authorized deployment. Independently verify all four source URLs and hashes and replace PENDING in fixture-sources.md.
2. With a real existing staff session, import each URL. Inspect proposals before applying. Confirm the injection text never grants any status or executes. Save a reviewed draft and explicitly publish one fixture company.
3. Repeat the normal-company import and check its normalized website domain warning with existing record link; import the similar-name/other-domain fixture and confirm no forced merge. Verify manual fallback on a blocked/failing URL.
4. Resolve the exact collaboration seed mappings in a disposable acceptance environment; establish honest public demo records separately through the authorized operator workflow. Record one company with 2025/past and 2026/current work. Check private/limited response HTML, not only CSS visibility.
5. A real verified maintainer requests verification and association. Another staff actor reviews. Capture pending/approved states, ownership denial and the public official marker/partner links. Existing admin-managed projects must still publish without student participation.
6. Capture laptop/tablet staff and 390px public/inquiry evidence. Add actual staff test access instructions privately.

Production approval requires independent DB identity/journal, backup/PITR and roll-forward verification, migration ordering (0011,0012,0013), staff bootstrap and automatic deployment checks. Deploy only through an authorized operator, verify the exact SHA publicly, then create `R4-submission` immutably and submit Moodle evidence. No such step has occurred in this worker.
