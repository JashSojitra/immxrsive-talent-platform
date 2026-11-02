# Release 3 Phase 2: shared-project foundation

Date: October 31, 2026 (America/Toronto). Branch: `feat/release-3`.
Scope: schema, security, private domain services, focused tests and preservation of existing public contracts. No new UI, HTTP project mutation routes, GitHub importer, duplicate-warning workflow, demo player or R3 release claim.

## Implemented requirements and decisions

The official IDs/wording remain in [requirements evidence](release-3-requirements-evidence.md). This phase supplies foundations for R3.01-R3.14, R3.17-R3.19, R3.24-R3.26; the complete user journeys are not yet implemented. R3.03 import, R3.15 public contributor projection, R3.16 warning/join actions, R3.20-R3.23 player/fallback/mobile UI, and R3.27 assessed release remain later work.

- Permanent text project IDs and legacy contributor relationships remain intact. New student projects receive independent UUID-string IDs. Repository changes, transfer and contribution changes do not allocate another project.
- Existing projects migrate as `legacy_fixture`, published, version 1, with no maintainer. No verified user can claim/edit them through the services. New student projects start unpublished with creator as maintainer and accepted contributor.
- Shared fields are **maintainer-only**. Every mutation rechecks the account-owned profile and verified affiliation in the database. Future HTTP adapters must derive `actorUserId` from `requireVerifiedRequestStudent`, never from JSON.
- Accepted contributors alone control their standardized role, statement, featuring and public attribution flag. Featuring, attribution and membership acceptance are separate. Skills are never inferred from technologies.
- Accepted relationships are reversibly soft removed. ID, original acceptance, contribution, preferences, last removal actor/time/reason and restoration time are retained. No hard-delete service exists. A current maintainer cannot remove their own relationship before transfer.
- Transfer is an offer to an active accepted contributor on the same project, followed by that contributor's consent. Replacement offers cancel prior pending offers. Shared changes after an offer invalidate its revision; the maintainer must issue a fresh offer. Former maintainer loses shared edit authority atomically.
- Shared changes use an integer version and transaction-scoped project row lock. Concurrent same-version saves produce one winner and one structured `ProjectError` with `EDIT_CONFLICT`, status 409, without partial child updates. Contributions have separate versions; membership transitions also check versions.

These editor/removal decisions must also appear in the eventual R3 release notes.

## Schema and migration

New `0009_r3_shared_projects.sql`, snapshot and journal entry are forward-only. Historical 0000-0008 SQL, existing journal entries and snapshot 0008 are unchanged.

| Existing/new table | Changes |
| --- | --- |
| `projects` | Origin, nullable restrictive maintainer FK, publication/lifecycle/date, positive integer version, created/updated/published timestamps |
| `project_roles` | Twelve exact official fixture labels, stable slug IDs and order |
| `project_repositories` | Independent zero/one/many repository associations, per-project unique normalized key and cross-project lookup index |
| `project_links` | Ordered structured general public links |
| `project_memberships` | Account-owned profile, proposed standard role, inviter, pending/accepted/declined/removed lifecycle, private timestamps, removal/restoration metadata, positive revision |
| `project_contributions` | Membership-owned standard role, statement, featuring, attribution visibility, independent revision |
| `project_maintainer_transfers` | Original maintainer, recipient membership, project revision, private offer/response state; one pending offer per project |
| `project_media` | Explicit playable/video/source/fallback image/video/link types; label/alt text; at most one playable/primary video |

All seven new tables have explicit RLS and privilege revocation from PUBLIC/anon/authenticated, with no permissive client policies. Schema and snapshot record RLS for these tables. Existing server-owned access model is preserved; this is application authorization plus database client-role denial, not a new Supabase client identity model.

Legacy publication is backfilled as published while the final column default becomes unpublished. The fixture importer explicitly publishes newly inserted legacy fixtures. Existing legacy role text is not normalized or rewritten. There is no table for speculative GitHub contributors, multi-role memberships, join requests, full audit UI or project deletion.

## Services, validation and compatibility changes

`src/projects/service.ts` exports create/update/publication, invite/respond, own contribution update, membership remove/restore, transfer offer/respond and authorized workspace read. Shared payloads are strict allowlists; owner/project ID/invitation state cannot be mass assigned. URL/collection/date/lifecycle validation lives in `src/projects/validation.ts`. Repository normalization supports lookup without fetching any external content or performing a merge.

Workspace reads are private: maintainers can see project invitations; other members see only their own invitation metadata, including removal/restoration notice data. No new domain object is passed wholesale to a public endpoint.

Minimal existing server-query changes suppress unpublished projects in public detail, legacy profile evidence, directory evidence counts and project inquiry resolution. No public response field was renamed and no presentation component was changed. Account-owned public contribution rendering remains Phase 3 work.

The importer now updates and reconciles children only for locked `legacy_fixture` projects. A colliding student-managed ID is skipped, including its technology/assets/relationships. Reported imported project/child counts reflect the rows actually eligible for fixture reconciliation. Existing fixture idempotence and rollback tests pass.

## Disposable verification and identity

No development/production/Supabase database was contacted. Each run created a new Docker PostgreSQL 18.6 instance with unique random credentials, run label, cluster name, tmpfs data and localhost-only dynamically assigned port. Fresh, upgrade and isolation-guard databases were separate databases inside that instance. All database environment variables in build/test subprocesses were overridden; `.env.local` was not edited and no credentials were printed.

Before each migration/test operation the driver matched container ID, run label, binding, `current_database()`, `current_user`, server port and `cluster_name`. Three local NOLOGIN roles (`postgres`, `anon`, `authenticated`) supported the historical migration requirements.

| Run | Identity | Binding |
| --- | --- | --- |
| Initial complete verification | `immx-phase2-1bd4d9533584`, container `edf69be06121db5ac15ef2997f5fa95ed8c222d61b55a1a7b26cc25600c9e5e1` | `127.0.0.1:49986` -> 5432 |
| Final reusable-runner validation | `immx-phase2-59aad02bb7fa`, container `87828e3e4639952d1925bdeec0574c929b413971262ca03dfd3404111c778ef5` | `127.0.0.1:50748` -> 5432 |

Image ID: `sha256:979bccfde35445db618c65107d27d08c6c21339d8dc3ad4c830c6633947be0e4` (`postgres:18`). Final database names are `phase2_59aad02bb7fa_fresh`, `phase2_59aad02bb7fa_upgrade`, `phase2_59aad02bb7fa_guard`.

Fresh 0000-0009 migration passed with ten journal rows. On a separate database, 0000-0008 passed with nine journal rows, then seeded legacy student/project/contributor/technology and student/project inquiries. Applying 0009 advanced the journal to ten; full pre-existing field snapshots were identical. Additional assertions confirmed the migrated legacy project stayed published, unmanaged and version 1. Project-only inquiry insertion still succeeded. Historical migration checksums remained identical.

## Results

| Check | Actual result |
| --- | --- |
| Typecheck | Passed |
| Lint | Passed; temporary-driver unused import warning removed with temporary file cleanup |
| Unit/frontend suite | 25 files, **174 passed** |
| New domain/security integration | **17 passed** |
| Phase 1 inquiry integration | **26 passed** |
| Fixture importer integration | **7 passed** |
| Existing API regressions | Four files, **63 passed** |
| Combined selected database cases | Seven files, **113 passed**, no selected skips |
| Production build | Passed, clean exit |
| Drizzle migration metadata check | Passed |
| Final diff/historical migration review | No unrelated implementation changes; Phase 1 preserved |

New domain tests cover atomic creation, unverified/forged input, legacy refusal, own statement/role/visibility control, private invitation metadata, acceptance/decline/replay, reversible removal, last-maintainer protection, consent/invalid/stale transfer, ID stability, concurrent saves with atomic children, repository disconnection, distinct media, fixture collision protection, database checks and live RLS/ACL denial on all seven new tables. Unit coverage includes URL boundaries, structured fields, zero/multiple repositories and normalized duplicate inputs.

No test failures were observed in the complete Phase 2 runs. The prior automated approval-review usage-limit error occurred before command execution; no database test ran on an unverified fallback. There were no reproduced test-runner hangs or weakened assertions.

Browser tests were not rerun in Phase 2: no UI was added; Phase 1 browser evidence remains in [Phase 1 verification](release-3-phase1-verification.md). This does not claim a complete R3 browser journey.

## Commands and reproduction

The reusable [verification driver](../scripts/verify-shared-projects.mjs) requires explicit opt-in and exclusively creates its own local resources:

```text
node --import tsx scripts/verify-shared-projects.mjs --run-disposable
```

It performs Docker identity checks, fresh migration, copied pre-0009 journal migration, populated upgrade assertions, targeted tests, build and unit/frontend suite, then labeled exact-container cleanup. Limits: 120 seconds per integration command, 180 seconds for build, 150 seconds for the unit/frontend run. It never reads a configured database URL to choose a target. Generated credentials stay in process memory; sanitized logs are written under `tmp`.

Executed child commands:

```text
node node_modules/vitest/vitest.mjs run tests/integration/shared-projects.test.ts tests/integration/fixture-import.test.ts tests/integration/inquiry-api.test.ts --maxWorkers=1 --reporter=verbose
node node_modules/vitest/vitest.mjs run tests/integration/talent-api.test.ts tests/integration/student-profile-api.test.ts tests/integration/project-detail-api.test.ts tests/integration/private-student-profile.test.ts --maxWorkers=1 --reporter=verbose
node node_modules/next/dist/bin/next build
node node_modules/vitest/vitest.mjs run --exclude tests/integration/** --maxWorkers=1
npm run typecheck
npm run lint
node node_modules/drizzle-kit/bin.cjs check
git diff --check
```

The migration was generated with `npm run db:generate -- --name=r3_shared_projects`, then reviewed to preserve legacy publication, seed the official roles and explicitly harden new tables. No historical migration was regenerated. Roles are seeded once by the migration journal, not on application startup.

## Review boundaries and outstanding work

Ready for Phase 2 code review. Do not expose these services through HTTP without the session/verification guard, bounded strict parsing, same-origin/CSRF protection and the structured error adapter. Complete collection replacement intentionally clears omitted collections; later UI must send the saved full draft and revision. URL validation is syntactic; no DNS probing or fetch/import/player is performed here.

Remaining phases must add the editor/private routes/inbox, consent UI, public accepted-contributor projections and portfolio featuring, duplicate warning/view/join workflow, editable GitHub suggestions, playable/fallback rendering and responsive/accessibility browser coverage. No R3 user journey or release evidence is marked complete by this foundation alone.

Both disposable containers/data were removed after tests; only the Docker image cache remains. Planning/course/fixture inputs, Phase 1 repair and R1/R2 tags remain preserved. No commit, push, deployment, tag or production operation occurred.
