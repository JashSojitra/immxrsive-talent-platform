# Administrator onboarding security and acceptance review

Final coordinator integration and Windows/browser results supersede the pending-check status of this worker report; see [final validation and release handoff](admin-onboarding-final-validation.md). Historical execution results below remain attributed to their original run.

Date: 2026-11-16. Independent reviewer: Codex worker, sanitized `immxrsive-admin-review/slot-0`, separate from the implementation agent. Result: **four confirmed defects repaired; focused code/database checks pass; release remains gated on build, Windows/browser and deployment-environment verification.**

## Scope and evidence boundaries

Reviewed [requirements](admin-onboarding-requirements.md), [architecture/access matrix](admin-onboarding-architecture.md), [implementation report](admin-onboarding-implementation.md), [intake/demo guide](admin-onboarding-intake-demo.md), [operations](admin-onboarding-operations.md) and [release/rollback guide](admin-onboarding-release.md). Traced all admin pages and API handlers, policy/service/public projection, migration 0012/schema/journal/snapshot, GitHub intake, demo rendering and affected shared presentation/auth controls. Checked public detail/API/metadata, showcase discovery, inquiry resolution and student evidence/talent projections, plus existing student project and Studio authorization paths.

This was a feature review, not a dependency or unrelated-code audit. No imported repository code was downloaded, built or executed. No production/staging access, credential loading, real role grants, deployment, GitHub writes, commits, pushes or additional worker/model invocations occurred. Test accounts, sessions, roles and content were synthetic. The patch is returned to the coordinator for review/integration.

Transport HEAD `8974db2` is the implementation snapshot reviewed; `cd540cd` is its sanitized pre-feature comparison base. Neither substitutes for real release provenance. The coordinator's recorded source base remains R3.1 `9302e6487ee3efa4a9a9da29a701dca02c822702`; verify the final patch against that actual clone during integration.

## Findings and exact repairs

| Severity | Confirmed behavior before repair | Repair and regression evidence |
| --- | --- | --- |
| Medium — optional profile became a lifecycle gate | UUID validation accepted uppercase profile IDs, while PostgreSQL returned lowercase UUIDs. A configured uppercase credit failed public-link matching and was treated as a *new* association on later commands. Once the profile became private, even archive/restore/publication could fail with `PROFILE_LINK_UNAVAILABLE`. This contradicted administrative independence and could delay removal of published content. | `src/admin/policy.ts` normalizes incoming credit IDs. `src/admin/service.ts` compares associations canonically, including previously saved uppercase content. `src/admin/public.ts` normalizes lookup/link IDs. Added a real PostgreSQL regression that explicitly seeds an old uppercase presentation, publishes it, makes the profile private, then archives/restores/republishes without student action. The public link works while public and disappears, including the profile ID, while private. |
| Medium — local resolver URL validation bypass | `https://127.0.0.1.nip.io./demo` and analogous absolute DNS names passed the wildcard-resolver deny rule because the hostname retained its trailing dot. Such URLs could cause client-side requests to private addresses. This was not server-side SSRF: demo/media URLs are never server-fetched. | `safeAdminUrl` strips trailing DNS dots before checking the existing resolver deny rule. Added failing-then-passing cases for `nip.io`, `sslip.io`, `localtest.me` and `lvh.me`. Existing unsafe protocol, credentials, numeric/local host and GitHub exact-host tests remain intact. This remains syntactic validation, not DNS or malware certification. |
| Low — lifecycle commands could silently replace content | The command schema accepted `content` on archive, unpublish and restore; the service used it as replacement content. An authorized client could therefore change narrative/credits/repository under an action that the UI and operations guide described as acting on the saved revision. This was a data-integrity/acceptance defect, not privilege escalation. | `adminCommandSchema` now rejects replacement content for those three lifecycle actions. Save and publish retain their explicit editing behavior. Added three schema regressions and an HTTP/database test asserting 422 with unchanged project, version, detail and audit history. |
| Low — year-zero date accepted then failed at the database | JavaScript accepted `0000-01-01`, which passed the date validator, but PostgreSQL has no year zero. Creating a project with that start date returned 500 instead of field validation. | The admin date validator now requires years 0001–9999. Added a failing-then-passing year-zero unit case and a real HTTP/PostgreSQL assertion of 422. No historical student validator was changed. |

No confirmed high/critical defect remained in the reviewed paths after these repairs. No student policy was relaxed and no existing test was removed or weakened. The existing authorization-lock regression was extended from reads to reads **and** writes.

## Acceptance and threat-model assessment

| Area | Evidence and disposition |
| --- | --- |
| Real ADMIN_MANAGED lifecycle | A new test uses actual Better Auth signup, signed cookies and the real `requireAuthenticatedRequestUser` path, substituting only isolated auth configuration. An XR admin creates and publishes directly with exactly one staff account and **zero** student profiles, affiliations, memberships or Studio submissions. Stable canonical IDs, published edits, unpublish, archive, private restore and fresh publication are exercised against PostgreSQL. No student login, invitation, consent revision or owner approval is invoked. |
| Separate ownership and authoritative mode | Administrative provenance is `admin_project_details.created_by` referencing a real authenticated staff account; canonical student maintainer is NULL. Database checks tie ADMIN_MANAGED to `origin=admin`; immutable identity/mode/origin and provenance triggers prevent conversion or seizure. Admin endpoints reject student project IDs. Admin membership, orphan-detail and inconsistent-publication guards were executed, not inferred from SQL text. Shared code dispatching by origin is constrained by the authoritative mode/origin database check. |
| Exact roles, session actors and IDOR | Anonymous requests return 401; signed-in nonstaff and curator mutations return 403. Curators retain private read-only access. XR admin and super admin manage content; only super admin manages access. Strict request schemas reject actor/role/mode/ownership/approval fields. Real signed cookies, forged unsigned cookies, forged actor headers, role revocation and session deletion are tested. Authorization is never derived from repository identity, affiliation, request actor or cached UI role. |
| Lock order and revocation | Content operations lock canonical project, current role and detail; access writes acquire EXCLUSIVE `studio_roles` before actor/target checks, matching the existing operational function. Tests observe actual PostgreSQL lock waits in both directions: revocation commits before a waiting read/write and denies it, or revocation waits for an already-authorized read/write and denies the next operation. Concurrent stale saves and duplicate creation commit one result; concurrent super-admin self-revocations preserve one super admin. No reverse project acquisition in the role-management path was found. |
| Durable audit and privileged operational boundary | Content changes and snapshots commit together; HTTP role changes append to both ledgers in their role transaction. Audit UPDATE/DELETE/TRUNCATE rejection, stale role assignments and last-super-admin protection pass. `assign_studio_role` remains an invoker-rights **trusted operational** function accepting an actor parameter; HTTP never passes raw actor input to it. Direct privileged SQL/bootstrap is an independently authorized operational boundary, not an HTTP permission mechanism. The existing function records its changes in `studio_events`; it does not populate `admin_events`. Append-only triggers do not protect against a database owner deliberately disabling them; no such bypass is used by the application. |
| RLS/effective grants | All three new tables have RLS and no browser policies/grants. Tests inspect effective privileges and execute queries/functions after `SET LOCAL ROLE anon` and `authenticated`: private reads and `assign_studio_role` fail with PostgreSQL 42501. Existing application-table hardening inventory passes. The disposable owner connection proves application behavior; it does not establish the deployment runtime role's configuration. |
| Public privacy | Actual public API and page metadata are checked at draft, publish, unpublish, archive, restore and republish. Showcase query visibility tracks those states. Private responses omit content; public payloads omit creator, actor, snapshots and internal credit `profileId` fields. Explicit links to currently public profiles expose their public URLs; private profiles expose neither links nor their IDs. Canonical inquiry tests reject private/archived records. HTML source uses the same guarded public projection; dynamic/no-store routes prevent publication state becoming a static build snapshot. Full HTTP HTML/cache behavior remains a browser/build gate. |
| Credits and student-managed compatibility | Manual credits remain descriptive. Optional public-profile links do not create memberships, project evidence or personal skills; profile and talent projections are asserted. Making a profile private hides its link without taking away administrative control. Existing shared-project ownership/consent/invitations/maintainer-transfer, manual-project and owner-approved Studio regressions pass. These results do not claim the entire R1/R2/R3 suite passed. |
| Repository intake | Exact GitHub host/path normalization precedes fetching; only fixed public API endpoints are used, without tokens or redirects. Streaming responses are bounded to 128 KiB each with a shared five-second abort deadline; private/404/rate-limit/oversized/identity-change/fetch-error/timeout paths have synthetic tests. Suggestions require explicit apply and retain entered fields. Repository duplicates serialize with advisory locks/unique index; private student titles are not exposed. No README execution, imported-code build or arbitrary fetch path exists. Live GitHub was not contacted for acceptance testing. |
| Complete portal functions | Source and focused frontend checks cover overview counts/recent activity, searchable/filterable/sortable project library, create/import, saved private preview, metadata/dates/category/status, technologies/tools, thumbnail/gallery, original/adapted sources, credits, attribution, feature/order controls, demo settings and lifecycle actions. Reviews is a working private technical-review **worklist** with project detail/preview; advisory review is not an approval gate. Activity displays saved snapshots; settings shows identity/policy; access lists and mutates real staff grants. These are implemented controls, not placeholder pages. Visual acceptance remains pending. |
| Safe demonstrations and affected presentation | HTTPS fields are rendered as escaped text/structured media, never supplied iframe HTML. Embeds require explicit launch, reject the application origin, and use opaque `sandbox=allow-scripts` without same-origin, popups, forms, top navigation or device permissions. External launch and narrative/gallery/video fallbacks stay outside the frame. Direct video has controls, no autoplay and a visible description/transcript; native/XR shows device/install instructions. Gallery failure, curator read-only UI, import recovery, stale-edit retention, explicit launch/close and fallback behavior pass frontend tests. Actual framing, keyboard focus, fullscreen and mobile/reduced-motion behavior still require real browsers. Shared student navigation/auth defaults remain intact. |

## Executed checks and exact results

Node: `/tmp/node-v22.22.0-linux-x64/bin/node` v22.22.0. Dependencies installed with `npm ci --ignore-scripts --no-audit --no-fund --cache /tmp/immxrsive-admin-review-npm-cache`; 500 packages installed, with no manifest/lockfile edits or dependency research.

Docker access is denied on this worker. Instead, PostgreSQL **17.12** binaries were extracted from PostgreSQL's Ubuntu packages into `/tmp/immxrsive-review-pg`; downloaded files matched the package index SHA-256 values. No system packages or persistent configuration were changed. A fresh cluster bound only to loopback port 55439 used synthetic roles and databases, 32 MiB shared buffers, at most 25 connections and disabled JIT. Each integration file created/dropped its own disposable database through the existing setup guards. Server startup/tests/shutdown ran within one command lifetime; the server was stopped after each run. No production URL was loaded.

| Executed check | Result |
| --- | --- |
| Original admin PostgreSQL suite before repairs | **18/18 PASS** after fixing the disposable environment prerequisites. |
| New pre-repair unit regressions | **8 expected failures** across diagnostic runs: three content-bearing lifecycle commands, four resolver trailing-dot URLs and one year-zero date. The selected HTTP/date check also reproduced 500 instead of 422. |
| New pre-repair uppercase-profile regression | Failed first on missing public link; a second diagnostic run placed that assertion after lifecycle operations and reproduced `PROFILE_LINK_UNAVAILABLE` on archive. Both behaviors are covered by the passing final regression. |
| Final focused unit/frontend command below | **117 tests / 8 files PASS**, zero failures/skips. |
| Focused PostgreSQL command below | **79 tests / 7 files PASS**, zero failures/skips: 27 admin/session/migration cases and 52 existing student/shared/Studio/detail cases. |
| Admin/session rerun after adding talent/profile evidence assertions and correcting test-only auth typing | **26 tests / 2 files PASS**, zero failures/skips; these overlap the 79, not additional unique tests. Final combined verification also includes the year-zero regression. |
| `npm run typecheck` | **PASS** on final sources and tests. |
| Targeted ESLint command below | **PASS**, no diagnostics. |
| `node node_modules/drizzle-kit/bin.cjs check` | **PASS**, journal/snapshot consistency. SQL execution is established separately by the PostgreSQL tests. |
| Historical byte/journal/manifests comparison with sanitized pre-feature `cd540cd` | **PASS**: 12 historical SQL files, 11 old snapshots and both manifests byte-identical; all 12 old journal entries identical/in order, one new entry. Review repairs change no SQL, snapshot or journal bytes, including 0012. |
| `git diff --check` | **PASS**. Git inspection used invocation-local `safe.directory`; no Git metadata was written. |

Focused unit/frontend command (Node 22 on PATH):

```text
node node_modules/vitest/vitest.mjs run tests/unit/admin-policy.test.ts tests/unit/admin-http.test.ts tests/frontend/admin-onboarding.test.tsx tests/frontend/project-detail.test.tsx tests/unit/public-project-layout.test.ts tests/unit/database-security-hardening.test.ts tests/unit/studio-policy.test.ts tests/unit/studio-http.test.ts
```

Focused PostgreSQL command (synthetic disposable URLs exported):

```text
node node_modules/vitest/vitest.mjs run tests/integration/admin-onboarding.test.ts tests/integration/admin-migration.test.ts tests/integration/admin-session.test.ts tests/integration/studio.test.ts tests/integration/shared-projects.test.ts tests/integration/manual-project-api.test.ts tests/integration/project-detail-api.test.ts
```

Lint:

```text
node node_modules/eslint/bin/eslint.js src/admin/policy.ts src/admin/public.ts src/admin/service.ts tests/unit/admin-policy.test.ts tests/integration/admin-onboarding.test.ts tests/integration/admin-migration.test.ts tests/integration/admin-session.test.ts
```

The new migration test applies the unmodified 0000–0011 chain, seeds existing published/private student and legacy projects, accepted contribution/consent data, a staff role, an approved/published Studio submission and immutable history, then applies 0012. Every historical public-table JSON row is compared exactly, excluding only the new management-mode column; the historical migration-ledger prefix is unchanged. Reapplying through the normal migrator also preserves records. Fresh installs are exercised independently by the other integration files.

Setup/authoring failures are not claimed as passes: an initial PostgreSQL process did not persist across tool calls and produced ECONNREFUSED; keeping the server and tests in one command resolved it. The first migration attempt then failed because the custom test cluster lacked `postgres`, which historical 0007 references; only that disposable cluster was given the expected NOLOGIN role. The release guide now documents this prerequisite. Three new guard assertions initially inspected Drizzle's outer message instead of its PostgreSQL cause; they now assert exact database error codes/messages. Typechecking caught Better Auth's configuration-specific generic in the new synthetic test; only its test mock typing was corrected. Existing assertions were retained.

## Remaining gates and documentation assessment

1. **Caller integration:** inspect this repair diff and the complete feature diff against real R3.1, integrate into `feat/admin-student-project-onboarding`, then follow the authorized separate draft-PR workflow. This throwaway worker does not commit, push or integrate branches.
2. **Heavy checks through `ld`:** run the production Next build once and the owning Docker/broader regression suites on disposable PostgreSQL 17. Neither a whole build nor full test suite ran here. The release guide lists the broader API/Studio/student regression command, now including the migration/session tests.
3. **Pending local Windows/browser verification:** use the supported Windows workflow (`scripts/validate-r31.ps1` with the intended branch) and execute `tests/browser/admin-onboarding.spec.ts` in both configured desktop/mobile projects, plus affected student/Studio/demo regressions, against the isolated build. The Playwright CLI is installed, but its Chromium executable `/home/codex-worker/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome` is absent here; no browser case was run. Verify actual layout at 390px, keyboard/focus, reduced motion, frame blocking/timeout, fullscreen, hosted video and external/native fallback. Frontend/jsdom checks are not browser evidence.
4. **Omitted private fixtures:** `data/fixtures/r2/` contains only its README. `resume_clean_single_column.pdf`, `resume_minimal.pdf`, `resume_layout_stress.pdf` and `resume_untrusted_text.pdf` are absent. Original-fixture cases in `tests/unit/resume-extraction.test.ts`, the extraction case in `tests/integration/private-student-profile.test.ts`, and the upload/extraction browser path were not executed or fabricated. Their absence does not block the executed admin checks; it blocks claiming the broader resume/profile gates complete.
5. **Deployment environment:** independently verify the actual runtime/migration roles, effective grants, Better Auth configured origin, historical ledger/hash continuity and restoration-tested backups. Large-data migration-lock duration and real hosting compatibility were not measured. Deployment, migration and first-super-admin bootstrap remain separately authorized operations. No production readiness is asserted.

The original implementation report correctly distinguished its executed unit/frontend checks from unexecuted DB/browser checks. Its broad independence claim had the uppercase-profile exception above; that exception is now repaired and exercised. The report now links this subsequent review without rewriting its original run evidence. The release guide records the missing disposable `postgres` prerequisite and separates completed focused review/database checks from the remaining gates. Live host availability, cross-origin frame success and deployment safety are not inferred from synthetic tests. No additional confirmed missing feature requirement was left as an implementation placeholder in this review's scope.

## Final changed-file manifest (this review patch)

```text
M docs/admin-onboarding-implementation.md
M docs/admin-onboarding-release.md
A docs/admin-onboarding-security-review.md
M src/admin/policy.ts
M src/admin/public.ts
M src/admin/service.ts
A tests/integration/admin-migration.test.ts
M tests/integration/admin-onboarding.test.ts
A tests/integration/admin-session.test.ts
M tests/unit/admin-policy.test.ts
```

No manifests, migrations, historical release artifacts or unrelated `docs/course/r2/` files were changed. No branch/worktree or integration was created by this worker; the launcher returns these edits as one reviewable patch.
