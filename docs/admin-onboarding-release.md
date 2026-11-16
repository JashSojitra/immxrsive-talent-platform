# Administrator onboarding migration and release guide

Final coordinator integration and Windows/browser results supersede the pending-check status of this worker report; see [final validation and release handoff](admin-onboarding-final-validation.md). Historical execution results below remain attributed to their original run.

Read [implementation/evidence](admin-onboarding-implementation.md), [independent security review](admin-onboarding-security-review.md), [architecture/access matrix](admin-onboarding-architecture.md), [operations/bootstrap](admin-onboarding-operations.md) and [intake/demo](admin-onboarding-intake-demo.md). This document authorizes no production operation.

## Migration compatibility

Apply `0012_cooing_shatterstar.sql` after the existing 0000–0011 chain. Generated `meta/0012_snapshot.json` and one appended journal entry accompany it. All old SQL/snapshot bytes and all 12 old journal entries are preserved. The generated snapshot models tables/checks/indexes/RLS; custom triggers/functions are explicitly in migration SQL and must be retained in future generated migrations.

Changes: immutable `projects.management_mode` defaults existing and ordinary student records to STUDENT_MANAGED; `origin=admin` requires ADMIN_MANAGED with NULL student maintainer. Add independent staff-created presentation/provenance, explicit public-profile associations and append-only events. Existing canonical project IDs/FKs/public URLs remain. No student records are reassigned, no historical publication is changed and no student approval model is loosened. Admin-specific tables have RLS enabled and all PUBLIC/anon/authenticated table grants revoked. Trigger-function execute grants are revoked explicitly.

The migration replaces the old project origin/owner check with a superset and adds a mode/origin check. An immutability trigger prevents later origin/mode/ID conversion; admin detail provenance cannot change. Deferred constraint triggers require the final committed canonical publication state and admin lifecycle to agree and require admin detail to exist. Student-membership inserts/updates cannot target admin projects. The existing Studio submission guard continues to require a student owner, so admin records cannot enter that approval system.

Review locks and deployment duration on a representative disposable PostgreSQL 17 copy. `ALTER TABLE` requires brief strong locks; choose a maintenance window appropriate to table size. Migration does not execute remote builds, perform public HTTP calls, grant real users roles or create fake student identities. Do not edit SQL/journal history to resolve drift. Investigate existing deployment hashes/ledger first and apply only the reviewed matching migration.

## Required verification before release

Use the owning `lab-dispatch` (`ld`) workflow for Docker suites and production builds; do not bypass its host selection or run heavy jobs in this limited worker snapshot. Windows-only checks belong to the local coordinator. Do not load production/staging credentials. Supply synthetic auth/email/GitHub services and disposable loopback PostgreSQL 17 only.

The established `scripts/validate-r31.ps1` can be run with `-ExpectedBranch feat/admin-student-project-onboarding` on the coordinator's supported Windows test route; its full run includes all discovered unit/frontend/integration/browser suites, while its historical `-FocusedOnly` list does not include the new admin tests. Preserve that historical script and evidence. Full regression execution requires the caller's original private PDFs, not fabricated replacements.

For a separately prepared disposable PostgreSQL 17 cluster, create NOLOGIN roles `anon` and `authenticated` as the existing migrations expect. The historical 0007 migration also alters default privileges for `postgres`: that role must exist (normally the cluster owner), and the migration connection must be authorized to alter its defaults. Use a unique database named `immxrsive_test_<suffix>` on loopback and a separately identified disposable development database. Export `TEST_DATABASE_URL` and `DEVELOPMENT_DATABASE_URL` (and runtime `DATABASE_URL` where the runner requires it); never point both at the same logical database. Integration setup creates/drops a separate database per test file, so the disposable runner needs CREATEDB. Browser global setup imports only the public synthetic JSON fixtures. Do not enable the fixture preload in production.

Exact targeted commands, after the safe disposable environment is ready:

```text
npm ci --ignore-scripts --no-audit --no-fund
npm run typecheck
npm run lint
npm run fixtures:validate
node node_modules/drizzle-kit/bin.cjs check
node node_modules/vitest/vitest.mjs run tests/integration/admin-onboarding.test.ts tests/integration/admin-migration.test.ts tests/integration/admin-session.test.ts tests/integration/studio.test.ts tests/integration/shared-projects.test.ts tests/integration/manual-project-api.test.ts tests/integration/project-import-api.test.ts tests/integration/project-demo-api.test.ts tests/integration/project-team-api.test.ts tests/integration/project-detail-api.test.ts tests/integration/inquiry-api.test.ts tests/integration/talent-api.test.ts tests/integration/student-profile-api.test.ts
npm run build
node node_modules/@playwright/test/cli.js test tests/browser/admin-onboarding.spec.ts tests/browser/studio.spec.ts tests/browser/manual-project.spec.ts tests/browser/project-import.spec.ts tests/browser/project-demo.spec.ts tests/browser/project-team.spec.ts tests/browser/inquiry.spec.ts tests/browser/talent.spec.ts --workers=1
```

The build runs once through `ld`; browser config uses that build and starts its isolated server/migrations with the existing synthetic GitHub preload. Both configured Playwright projects must run (desktop Chrome and mobile-390). New admin tests represent 4 browser cases across those projects. Browser binaries are absent on this worker; install them only through the approved test environment workflow. Do not claim visual, focus, fullscreen or framing checks passed until these tests and manual checks actually run.

After focused checks, the caller's broader R1/R2/R3 regression gates still apply, including private profile/resume extraction on the original authorized fixture set, student invitations/contributor statements/maintainer transfers/owner consent, directory/search, employer inquiries, Studio moderation and existing demo URLs. No historical test totals are evidence for this new implementation.

## Separately authorized deployment sequence

1. Read the completed independent security review and repairs, inspect the returned patch against its real R3.1 source base, integrate on the intended feature branch and run the missing checks. Keep admin work separate from PR #9 and R3-submission. Create the separate draft feature PR through the local authenticated GitHub workflow.
2. Verify intended deployment/server/database identity, actual migration ledger/hashes, runtime role and grant boundaries. Verify Better Auth public origin (`BETTER_AUTH_URL`) matches the deployed site; same-origin mutation validation must use that configured origin, not an untrusted request Host header.
3. Take a restorable database backup, including canonical/student tables, Better Auth identity/session records, both audit ledgers and the migration journal. Record approved operator/change reference and backup location in the owning operational record. Test restoration into a separate disposable database first. Never test restoration against production.
4. Review/apply the new migration using the separately authorized migration connection. Verify schema/checks, RLS, browser grants, new functions' execute privileges and existing historical hash continuity. Verify actual runtime connection capability without granting browser Data API access.
5. Deploy the reviewed application using the owning service workflow only after deployment authorization. No such authorization was exercised in this implementation job.
6. If needed, separately bootstrap the first real super administrator following the operations guide. Otherwise use existing super-admin login and assign staff through `/admin/settings/access`. Never grant production test users roles.
7. Smoke test with an authorized real operator: staff access limits, synthetic private draft, hosted demo configuration/fallback, manual descriptive credit, saved preview, direct publish, public API/project/showcase search/inquiry, published edit, unpublish, archive/restore and stale revision. Test staff revocation on a permitted synthetic account and preserve the last super admin. Recheck existing owner-controlled student Studio and project consent paths. Confirm no private data appears in discovery or network responses.
8. Inspect activity persistence, errors and cache headers. Validate mobile 390px, reduced motion and keyboard/focus. Record actual outcomes and public retest evidence, never inferred success.

## Rollback

Prefer application rollback with the additive schema and audit intact. Before an app rollback that lacks admin rendering, unpublish/admin-archive new admin presentations using this version's authenticated UI or a separately approved audited operator procedure. Old R3.1 code does not understand the new demo presentation; do not promise a fully functional admin showcase after rolling it back. Existing student project rows still satisfy their historical ownership/publication rules.

Do not drop new tables, erase audit, rewrite old migrations, revert the migration journal or convert admin rows into fake student-owned records. Keep the new checks/triggers/provenance while investigating. Revoke temporary staff grants through normal role controls while preserving a super admin. If database restoration is necessary, it is an independently authorized incident operation from a tested backup, coordinated with application version and subsequent audit/write retention; never silently lose newer student or admin changes.

Independent review and its targeted PostgreSQL 17 integration/concurrency/grant/migration checks have passed; exact scope is in the security review. Deployment readiness remains **blocked** until the broader regression gates, production build, Windows and real browser/mobile checks, actual environment compatibility/backup validation and explicit deployment/migration/bootstrap approvals are complete. The repaired patch is ready for coordinator review and integration, not an assertion of production validation.
