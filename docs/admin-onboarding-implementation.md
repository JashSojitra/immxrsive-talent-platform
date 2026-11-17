# Administrator onboarding implementation report

Final coordinator integration and Windows/browser results supersede the pending-check status of this worker report; see [final validation and release handoff](admin-onboarding-final-validation.md). Historical execution results below remain attributed to their original run.

Date: 2026-11-16. Implementation owner: remote Codex worker on dilab-5080, sanitized `immxrsive-admin-onboarding/slot-0` snapshot. Real source base is R3.1 `9302e6487ee3efa4a9a9da29a701dca02c822702`, recorded by the coordinator in [requirements](admin-onboarding-requirements.md). Transport HEAD/history is used only for byte/diff comparison, never represented as real release provenance. No commit, push, GitHub write, deployment, production connection, secret loading or real role grant was performed.

Independent review update (2026-11-16): [security and acceptance review](admin-onboarding-security-review.md) records four confirmed repairs and executed disposable PostgreSQL 17 checks, including real synthetic Better Auth sessions and populated R3.1 migration preservation. The execution tables and pending statements below describe the original implementation run; the review supplies subsequent evidence. Production build, Windows/browser verification and deployment environment gates remain pending.

## Delivery and status

| Requested outcome | Result / responsibility |
| --- | --- |
| Issues #3/#5 historical NOT PLANNED closure; #4/#6/#7 status | Local coordinator responsibility; not queried or changed by this worker. No claim of historical fixes or accepted contributors. |
| PR #9 readiness, actual HEAD and release gates | Local coordinator responsibility; no remote GitHub operation or modification of historical validation. |
| Feature branch / separate draft PR | Intended branch `feat/admin-student-project-onboarding`; coordinator integrates reviewed patch and creates the PR. No PR URL exists from this worker. |
| Administrator dashboard | Overview, lifecycle counts, recent projects/activity, create/import shortcuts, searchable/filterable/sortable project library, technical review worklist, settings and staff access. |
| Complete project workflow | Create/import, save/edit, private saved preview, configure demo/media/credits, direct publish, immediate published updates, unpublish, archive, restore-as-private-draft. Stable canonical IDs and URLs. |
| Repository intake | Public exact-host GitHub normalization, fixed endpoints, bounded size/deadline, editable suggestions applied explicitly to empty fields, manual recovery, public/authorized duplicate warnings and serialized exact admin duplicate rejection. |
| Demo adaptation | Structured configuration for safe click-to-launch web embed, hosted external experience, video, static and XR/native. Independent source/host fields, visible fallback, mobile/device messaging and no imported-code execution/build. |
| Credits | Manual names/roles/descriptions without accounts; optional explicit public-profile associations. No invitations, consent records, student memberships, identity verification claims, ownership or derived personal skills. |
| Direct admin publication | Implemented independently of student tables/approval. Frontend/policy/API-boundary tests pass; real DB/public/browser proof remains an explicit pending gate. |
| Access management | Existing Better Auth session actor and current `studio_roles`; curator read-only, XR admin content control, super-admin access management; immediate revocation checks, optimistic versions, globally serialized access updates and last-super-admin protection. |
| Migration | New 0012 SQL, generated snapshot and appended journal entry. Independent admin provenance, authoritative immutable mode, consistency/membership guards, deny-by-default RLS/grants and append-only audits. |
| Student-managed compatibility | Existing service/consent/ownership/Studio policy implementation remains unchanged. Common rendering is extended additively; admin publishing never invokes the owner-approved Studio workflow. Existing focused regressions pass; full DB/browser regressions remain pending. |
| Security review | Implementation self-review completed below; subsequent independent remote security review is pending and must assess the returned patch. |
| Deployment readiness | **Not cleared for deployment.** Missing PostgreSQL 17, production build/browser and independent review/environment gates are listed below. |

The actor in every privileged HTTP operation comes from Better Auth. The application access endpoint accepts only target/desired-role/expected-role/reason; it never forwards a supplied actor into `assign_studio_role`. Content transactions lock canonical project then current staff role and details. Role updates take the existing procedure's EXCLUSIVE role-table lock before authorization. Audit and mutations commit together. Student-managed projects cannot be converted, seized or deleted by this API.

Public projection requires both canonical publication and admin lifecycle publication. Private/audit/provenance fields and credit profile IDs are omitted. Unpublish/archive hides admin content from project HTML, metadata, API and showcase discovery; restoration stays private. Existing project inquiry references work through canonical IDs. Descriptive credits stay independent if an optional profile becomes private: the public link disappears, and administrative content/lifecycle operations remain available.

See [architecture and access matrix](admin-onboarding-architecture.md), [administrator operations/bootstrap](admin-onboarding-operations.md), [repository intake/demo adaptation](admin-onboarding-intake-demo.md) and [migration/release/rollback](admin-onboarding-release.md).

## Executed checks

Node used: existing `/tmp/node-v22.22.0-linux-x64/bin/node` v22.22.0 (system Node v18.19.1 is below the manifest requirement). No manifest or lockfile change was needed. No dependency re-audit/research or package upgrades were performed. All test services were synthetic; the GitHub unit tests use injected fetch responses and browser specs use the established test-only preload/interception. No real student data or external model API was used.

| Command / check | Actual result |
| --- | --- |
| `npm ci --ignore-scripts --no-audit --no-fund --cache /tmp/immxrsive-admin-npm-cache` | PASS; 500 packages installed. Initial attempt using the unwritable default `/home/codex-worker/.npm` cache failed ENOENT; the writable temporary cache resolved it without dependency changes. |
| `npm run db:generate` | PASS; generated 0012 SQL/snapshot/journal, then explicitly added custom security triggers/grant revocations to the new SQL only. |
| `node node_modules/drizzle-kit/bin.cjs check` | PASS; snapshot/journal consistency. This does not execute SQL or prove PostgreSQL behavior. |
| `npm run typecheck` | PASS on final sources/tests. Initial authoring checks caught test fixture field names and a required inquiry honeypot field; corrected to existing schema, without fabricating private fixtures. |
| `npm run lint` | PASS; no reported lint errors/warnings on final code. |
| Focused Vitest command below | PASS: **158 tests, 13 files**, zero failures/skips. This is a focused combined unit/frontend set, not the full suite. |
| Final affected frontend rerun after ensuring changed demo configuration resets explicit launch | PASS: **16 tests, 2 files**, zero failures/skips. These overlap the 158; do not add them as unique coverage. |
| `npm run fixtures:validate` | PASS: 18 public synthetic students, 9 projects, 24 skills, 24 project contributors. |
| Historical byte/manifests/journal comparison | PASS: all 12 old SQL files, all 11 old schema snapshots, both exact manifests unchanged; all 12 old journal entries preserved in order. |
| `git diff --check` | PASS. Read-only Git inspection used an invocation-local safe-directory setting; Git metadata was not changed. |
| Docker capability probe | BLOCKED: installed CLI cannot access `/var/run/docker.sock` (permission denied). No container or database was started. |
| Browser executable probe | Default Playwright Chromium executable absent. Browser tests were not started; database/build requirements are also unavailable here. |

Exact 158-test command (with Node 22 on PATH):

```text
node node_modules/vitest/vitest.mjs run tests/unit/admin-policy.test.ts tests/unit/admin-http.test.ts tests/unit/studio-policy.test.ts tests/unit/studio-http.test.ts tests/unit/database-security-hardening.test.ts tests/unit/project-validation.test.ts tests/unit/public-project-layout.test.ts tests/frontend/admin-onboarding.test.tsx tests/frontend/studio-review.test.tsx tests/frontend/project-detail.test.tsx tests/frontend/student-auth.test.tsx tests/frontend/branding.test.tsx tests/frontend/talent-directory.test.tsx
```

Final affected rerun:

```text
node node_modules/vitest/vitest.mjs run tests/frontend/admin-onboarding.test.tsx tests/frontend/project-detail.test.tsx
```

The first focused run had **121 passes / 1 failure**: the existing hardening inventory expected only pre-admin tables. It was extended to include and check the new migration's three RLS/grant-protected tables; the next run passed all 122 then the expanded final set passed all 158. No old migration was changed to satisfy the test.

## Unexecuted tests and release gates

- `tests/integration/admin-onboarding.test.ts`: **18 authored cases**, not executed. Covers zero-student publication/manual credits; canonical inquiry references; curator/student/admin/super limits; private reads/IDOR; immutable mode/provenance; technical validation; stable lifecycle/privacy; concurrent duplicate intake/stale edits; role revocation, stale role assignments and concurrent last-super-admin races; append-only audit/effective grants/RLS; optional-profile privacy; session-derived API actors/CSRF; synthetic GitHub intake; and both directions of role-revocation versus protected read/mutation locking. It explicitly requires PostgreSQL major version 17.
- `tests/browser/admin-onboarding.spec.ts`: **2 authored scenarios / 4 configured desktop/mobile cases**, not executed. Covers unauthenticated denial and an actual synthetic-account import/create/configure/manual-credit/preview/publish/search/role-grant/revoke/archive/restore flow, working/blocked/unavailable frames, fallback, reduced motion, keyboard/focus and narrow-screen overflow. It reuses existing disposable Better Auth cookie setup rather than adding production auth bypasses.
- Existing DB/browser R1/R2/R3 regression suites were not executed on this worker. Existing focused Studio policy/review, student auth, public project, branding, directory and schema-security tests passed; this does not establish full regression compatibility.
- Production Next build was intentionally not run in the limited remote snapshot. Run the build and Docker suites through the owning `lab-dispatch` (`ld`) workflow, then execute Playwright against that isolated build with PostgreSQL 17. Exact targeted follow-up commands and environment prerequisites are in the release guide. Windows-only checks remain with the coordinator.
- Four private PDFs are intentionally absent. `tests/unit/resume-extraction.test.ts`'s original-fixture extraction group, the PDF extraction case in `tests/integration/private-student-profile.test.ts`, and the upload/extraction path in `tests/browser/private-student-profile.spec.ts` need the caller's original authorized files: `resume_clean_single_column.pdf`, `resume_minimal.pdf`, `resume_layout_stress.pdf`, `resume_untrusted_text.pdf` under `data/fixtures/r2/`. They were not fabricated, restored or reported as tested. The new admin tests do not depend on them.
- Independent security review, migration application on fresh and upgraded disposable PostgreSQL 17, actual deployment role/grant compatibility, restore-tested backups, browser/manual hosted-demo QA and explicit migration/deployment/bootstrap authorization remain gates. No production operation was attempted, so its credentials/readiness are not asserted.

## Migration/security self-review

New migration SHA-256: `41a93c3e48eb4695219074dd6be2dd7ea90189106b1f40327c1c064ea6a4111d`.

Inspected session-only actor routing, strict request fields, bounded same-origin JSON, role lock ordering/revocation, existing procedure lock compatibility, optimistic content/access versions, canonical ownership/mode immutability, no student memberships/consent, public projection privacy, duplicate advisory locks/unique constraints, append-only audits, explicit function/table privilege revocation and iframe/media URL handling. Security-sensitive operational SQL is documented as a separately authorized privileged procedure, never an endpoint.

An edge case found during implementation was fixed: revalidating previously configured profile links on every content/lifecycle operation would have blocked admins when a profile became private. Existing explicit associations now remain descriptive and project-independent; public projection rechecks actual profile visibility, and only newly configured links require a currently public verified target. Another presentation fix ensures changing saved demo configuration remounts the player and requires a new explicit launch. Admin routes gained frame-ancestor/permissions protections, no-store/noindex responses and a dedicated sign-in path.

These are source inspection and focused-test findings, not an independent review or successful execution of database race tests. PostgreSQL grant/trigger/constraint behavior and real browser headers/framing still require the follow-up gates. Privileged DB operators remain trusted and can bypass application controls; no attempt is made to protect against a compromised database superuser.

Current scale limits: project libraries/showcase lists are unpaginated and role management intentionally requires exact internal IDs rather than private account search. Audit overview shows the latest 100 events, with full per-project history. Add pagination before large catalog use. Host availability, malicious third-party content, DNS resolution and external permissions/license records remain operator responsibilities; syntactic URL checks and iframe load events do not certify them. No automatic build/deploy pipeline is included.

## Patch manifest

The coordinator receives all changes as one working diff; this worker made no commit or push. Existing tracked changes are limited to schema/projection/security/navigation/shared auth and the hardening test. All new implementation/doc/test paths follow.

Total: 46 files (11 existing changed, 35 new).

```text
M drizzle/meta/_journal.json
M next.config.ts
M src/app/showcase/page.tsx
M src/components/auth/GitHubSignInButton.tsx
M src/components/auth/SignOutButton.tsx
M src/components/project-detail/ProjectDetailView.tsx
M src/components/project-editor/ProjectWorkspace.tsx
M src/components/talent/TalentDirectory.tsx
M src/db/queries/project-detail.ts
M src/db/schema.ts
M tests/unit/database-security-hardening.test.ts
A docs/admin-onboarding-architecture.md
A docs/admin-onboarding-implementation.md
A docs/admin-onboarding-intake-demo.md
A docs/admin-onboarding-operations.md
A docs/admin-onboarding-release.md
A drizzle/0012_cooing_shatterstar.sql
A drizzle/meta/0012_snapshot.json
A src/admin/Access.tsx
A src/admin/AdminShell.tsx
A src/admin/Discovery.tsx
A src/admin/Editor.tsx
A src/admin/Experience.tsx
A src/admin/ProjectList.tsx
A src/admin/admin.module.css
A src/admin/github.ts
A src/admin/http.ts
A src/admin/policy.ts
A src/admin/public.ts
A src/admin/service.ts
A src/app/admin/[[...section]]/page.tsx
A src/app/admin/error.tsx
A src/app/admin/loading.tsx
A src/app/admin/sign-in/page.tsx
A src/app/api/admin/access/route.ts
A src/app/api/admin/activity/route.ts
A src/app/api/admin/duplicates/route.ts
A src/app/api/admin/identity/route.ts
A src/app/api/admin/imports/github/route.ts
A src/app/api/admin/projects/[projectId]/route.ts
A src/app/api/admin/projects/route.ts
A tests/browser/admin-onboarding.spec.ts
A tests/frontend/admin-onboarding.test.tsx
A tests/integration/admin-onboarding.test.ts
A tests/unit/admin-http.test.ts
A tests/unit/admin-policy.test.ts
```
