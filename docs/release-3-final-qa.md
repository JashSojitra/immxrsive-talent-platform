# Release 3 Phase 7 final QA and release gate

Date: 2026-11-01 (America/Toronto). Scope: final audit, disposable QA and release documentation only. **CONDITIONAL GO for controlled release preparation after review; NOT READY for assessed submission.** No mandatory application repair was identified in the fresh applicable suites. Release identity and public evidence remain blockers.

## Requirement acceptance

The [complete traceability matrix](release-3-final-traceability.md) contains exact official R3.01–R3.27 wording, implementation/source, routes/UI, fresh test selectors/outcomes, evidence and remaining actions. Authority is the five-page Moodle PDF under `docs/course/r3`, reread through PDF extraction, not provisional C01–C27 IDs.

**26 PASS, 0 PARTIAL, 1 FAIL, 0 UNVERIFIED** in the numbered matrix. PASS is scoped to fresh current-code acceptance in the disposable environment, not production. R3.27 FAIL is concrete: no assessed tag exists. Separately, deployed identity, durable public two-contributor/demo/import evidence and official adapter conformity are **UNVERIFIED / NOT ESTABLISHED** and block submission. Previous reports were reviewed for context; they alone establish no PASS.

Maintainer-only shared editing and maintainer-reversible membership soft removal match the official permitted team choices and are stated in [release notes](release-3-release-notes.md). Actual roles come from private team API/server-rendered data, not a standalone role endpoint proposed in planning. Actual joining starts at the duplicate warning, then maintainer approval and independent invitation acceptance; no legacy ownership claiming exists. Whole-project deletion, multiple roles and full historical audit UI are optional, not missing requirements.

## Fresh results and unique counts

| Check | Actual result |
| --- | --- |
| Entire integration/API directory | **158 passed, 0 failed, 0 skipped**, 13 files |
| Entire unit/frontend suite | **230 passed, 0 failed, 0 skipped**, 31 files: 140 unit + 90 frontend |
| Entire browser suite | **125 passed, 0 failed, 5 skipped**, 130 configured cases, 0 flaky; 219.847 seconds |
| Browser partitions | Desktop 60 passed/5 skipped; mobile-390 65 passed/0 skipped |
| Combined executable cases | **513 passed, 0 failed, 5 skipped** of 518; parameterized instances counted once, API subsets not rerun/double-counted |
| Fresh migrations | All **11** entries 0000–0010 applied |
| Populated R2 upgrade | 0000–0007 baseline: 8 entries; then 0008–0010: 11 entries; historical snapshots unchanged |
| Live security | **32/32** public application tables RLS enabled; `anon`/`authenticated` direct privileges denied; zero public policies |
| Live migration integrity | All **11** SQL SHA256 hashes/journal timestamps matched |
| Migration metadata | `drizzle-kit check` passed |
| Fixture validation | Passed: 18 students, 9 projects, 24 skills, 24 legacy contributors |
| R3 fixture acceptance | All 12 official roles and all 3 duplicate cases passed; supplied static demo/fallback copies byte-identical |
| Typecheck / lint / production build | Passed, exit 0 |
| Provisional adapter | JSON/team contract passed; R1/R2 preserved; 9 actual pages and 18 API paths/methods checked; official R3 schema absent |

The full integration directory includes authentication identity and affiliation verification omitted by the earlier Phase 6 selected runner. The 158 instances include API tests once. Parameterized cases with repeated display names retain distinct case indices in the [sanitized catalog](release-3-qa-results.json).

Five skips are desktop instances of mobile-only inquiry overflow, project overflow, R1 Scenario F, profile overflow and directory overflow assertions. Each mobile-390 counterpart passed. No test was weakened or disabled. Bounded single-worker execution completed without a stall/teardown hang; default parallel-worker reliability was not retested or claimed repaired.

## Database identity, migrations and safety

Only newly created container `immx-phase7-65680adbaeb3` was used:

- ID: `548e8a26662bcf4f1ed594d1a275a8509a39e9c737ae55ac5771ac50ed32caf4`.
- Image: `sha256:979bccfde35445db618c65107d27d08c6c21339d8dc3ad4c830c6633947be0e4`; PostgreSQL 18.6 Debian. Node 24.14.1, Docker CLI 29.9.2 on Windows.
- Binding **127.0.0.1:56710 → 5432**; cluster `immx-phase7-65680adbaeb3`; unique random credentials never printed; tmpfs data.
- User `phase7_65680adbaeb3`; dedicated databases `phase7_65680adbaeb3_fresh`, `_upgrade`, `_guard`. Guard and test targets were distinct within this container.
- Before migration/test stages, exact container ID/label/binding and SQL database/user/server port/cluster were checked. All migration/runtime/development/test DB variables were overridden. Existing `.env.local` cannot replace already set child variables.

No Supabase/development/production database was contacted. Local emulated `postgres`, `anon` and `authenticated` roles validate migration assumptions, not actual hosted Supabase configuration.

Upgrade rehearsal populated actual R2 0007 schema with a legacy student/project, contributor role/order and technology, student/project inquiries, auth user, UUID profile and verified affiliation. After 0008–0010, full JSON snapshots across those eight historical tables matched, excluding only additive project/inquiry columns. Legacy project stayed published, `legacy_fixture`, null maintainer, version 1; no canonical IDs changed or arbitrary ownership was granted.

New project-only and UUID-profile inquiries then persisted. The nullable profile FK was validated with restrictive deletion; exact-source constraint definition was inspected. Fresh inquiry integration rejected missing/dual/mismatched student sources and preserved project-only/legacy behavior. Browser UUID submission persisted its trusted FK; unpublished/unverified profiles rejected inquiry POST. Shared-project tests verified fixture reimports skip colliding user-managed data. No historical migration was rewritten.

Cleanup revalidated this container's exact run label, removed only it and its data, and removed its scratch journal under `tmp`. No existing cluster/container/fixture was cleaned. Image cache and sanitized artifacts remain. Post-run Docker inventory confirms no Phase 7 container remains.

## Commands and evidence

[Complete sanitized commands/output](release-3-phase7-command-log.txt) retain Docker creation, identity queries, migration counts, constraints, security/integrity and cleanup. The driver is [scripts/verify-release-3-final.mjs](../scripts/verify-release-3-final.mjs). Exact execution:

```powershell
node scripts/verify-release-3-final.mjs --run-disposable
# Inside verified disposable runner, explicit isolated environment:
node node_modules/vitest/vitest.mjs run tests/integration --maxWorkers=1 --reporter=verbose --reporter=json --outputFile=tmp/phase7-integration-results.json
node node_modules/next/dist/bin/next build
node node_modules/vitest/vitest.mjs run --exclude tests/integration/** --maxWorkers=1 --reporter=verbose --reporter=json --outputFile=tmp/phase7-unit-results.json
node node_modules/@playwright/test/cli.js test --reporter=list,json
node --import tsx scripts/validate-fixtures.ts
# Static/read-only checks; no DB operation:
npm run typecheck
npm run lint
node node_modules/drizzle-kit/bin.cjs check
node scripts/validate-release-3-adapter.mjs
git diff --check
```

Migrations use `drizzle-orm/postgres-js/migrator` in-process with full folder or scratch journal indices <8, then the full folder. The normal development migration script is never invoked. Integration/build/unit bounds were 180 seconds; browser 480 seconds; none timed out. Passwords are passed through process environment, never CLI literals or logs. Raw JSON is retained under `tmp/phase7-*-results.json`; the durable case catalog excludes environment/cookies/credentials.

## Realistic end-to-end QA

Each long R3 journey passed in both desktop and 390px against the production build and disposable DB. Forms, routes, independent sessions and persistence are real; only GitHub upstream and deliberate media failures are mocked.

| Journey | Fresh evidence |
| --- | --- |
| Verified manual creation/edit/preview/publication | `manual-project.spec.ts`: structured fields, repository changes, draft privacy, canonical ID, stale conflict retains input |
| GitHub review and duplicate View/Join | `project-import.spec.ts`: editable suggestions, actual canonical View route, retained draft, request → approval → invitation → independent acceptance |
| Invitations and own contribution | `project-team.spec.ts`: two independent verified accounts, accept/decline, personal role/statement/feature/hide, two published profiles link to same project |
| Removal, transfer, stale and authorization | Team/manual browser plus service/API suites: restored original membership, transfer decline/accept, outgoing denial/incoming editing, stable URL, forbidden forged/outsider/legacy edits, revision conflicts |
| Working supplied HTML | `project-demo.spec.ts`: real static fixture inside sandbox, actual keyboard/click interaction **Interactions: 2**, Retry/Stop/focus behavior |
| Broken/unsupported demo | DNS-style abort, framing refusal, 12-second delay, missing fallback; details/roles/fallback/navigation survive |
| Privacy and employer inquiries | `private-student-profile.spec.ts`: actual UUID form persists FK, unverified/unpublished non-disclosing 404; all legacy/project inquiry and R1 directory/profile regressions passed |

Twelve screenshot copies cover both viewports: manual editor/public project, editable import/duplicate warning, contributor team and demo fallback. See [evidence](evidence/release-3/README.md) and [reproduction guide](release-3-qa-setup.md). Selected desktop/mobile screenshots were visually inspected for readable typography, wrapping/actions/focus and fallback. IDs are synthetic removed records, not production proof. Keyboard, reduced motion, 390px overflow and no-page-errors assertions passed. Physical devices, Safari/Firefox and formal screen-reader audit were not performed.

Next logged `The destination stream closed early` on some navigations, consistent with previous reports. No corresponding browser assertion/page-error failure or hang occurred. No configuration/app change suppressed it. Investigate a concrete user-visible deployment reproduction as a focused repair; no automatic feature expansion is proposed.

## Mandatory public evidence and release blockers

| Item | State / next action |
| --- | --- |
| Source/repository | Local origin confirmed: `https://github.com/JashSojitra/immxrsive-talent-platform.git`; remote not contacted. Review/freeze full uncommitted R3 work only after authorization |
| Public URL / deployed SHA | Historical R2 URL documented; no R3 deployment contacted. Establish and verify exact assessed/deployed SHA and public origin |
| R3-submission | **Absent**, R3.27 FAIL. Create only when separately authorized on verified assessed/deployed commit |
| Shared project, two accepted contributors | Disposable proof exists; durable public project + two consenting published profile URLs missing |
| Working public demo/fallback | Local copies/interaction proven; deployed URLs/CSP/reachability unverified |
| Real public GitHub import | Mocked behavior proven; real accessible repo/deployed review demonstration missing |
| Screenshots / instructions | Local synthetic evidence and setup guide available; public screenshots not established |
| Submission / adapter | Drafts prepared; latest official R3 adapter template missing, reconciliation blocks submission |
| Notes / issues / rollback | Prepared with explicit editing/removal decisions; operational checklist not executed |

No deployed URLs/IDs/accounts/credentials or successful production evidence were invented. The available R1 adapter template and submission template were inspected; latest R3 adapter template is not in supplied files. The adapter is explicitly provisional and validates only the documented team contract, not an unavailable official schema.

## Preservation and next actions

Branch remains `feat/release-3`, HEAD `4c8a64d7313c1401889ae97a1223090d059008de`, author Jash Sojitra `<jash221434@gmail.com>`. R1 ref `9caf0fe58b60982e356c6802bb21a332f04136e7` and R2 ref `88f1220b47a4e8d16123be2776afa9aba9a2b288` unchanged. No commit/push/deploy/tag occurred.

The runner verified 96 pre-existing untracked inputs outside `tmp` and historical SQL unchanged. Independent final SHA256 comparison of 248 app/test/migration/config/original fixture/course inputs verifies preservation. Phase 7 changes only documentation/submission/adapter, verification scripts and retained evidence. Pre-existing application changes belong to earlier phases. Prior R2 submission/adapter were archived; Phase 1–6 and original planning reports remain intact.

See the [Phase 7 file manifest](release-3-phase7-changes.md) and [final static/preservation checks](release-3-phase7-static-checks.txt). Initial adapter-validator authoring checks exposed an incorrect page count and an overly narrow export regex; those documentation-check defects were corrected, with no application/test change. Final validation passed.

Review local acceptance and documentation, obtain/reconcile the official adapter, then review/freeze complete source. Follow the [controlled deployment and rollback checklist](release-3-deployment-rollback-checklist.md) under separate authorization: establish backup/staging/target identity, apply only approved forward migrations, deploy exact assessed SHA, establish public human/demo/import evidence, verify adapter/links and only then authorize tag/submission. CONDITIONAL GO is not authorization to perform any release action now. Stop for review.
