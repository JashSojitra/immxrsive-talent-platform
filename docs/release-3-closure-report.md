# Release 3 closure audit — proposed patch, 2026-11-04

**NO-GO for assessed R3 submission.** Required public two-contributor/import evidence, official adapter reconciliation and `R3-submission` remain incomplete. This patch is for review only. Applying it requires the user's explicit approval; nothing was applied to the original machine, committed, pushed, tagged or deployed.

## Provenance and evidence boundaries

- Original repository: https://github.com/JashSojitra/immxrsive-talent-platform.git; original branch: `feat/release-3`.
- Caller-verified original HEAD and deployed baseline: `b81ba3df3a28f0b0e267414852f8e202129a2f19`. This worker did not independently verify deployment identity, original ancestry or original refs.
- Worker input: history-free synthetic transport commit containing 335 tracked blobs. Its HEAD is not the deployed baseline. Original tracked index/worktree were reported clean. Original `docs/course/r2/` and `tmp/` were untracked and not transferred.
- Caller verified unchanged R1 tag `9caf0fe58b60982e356c6802bb21a332f04136e7` and R2 tag `88f1220b47a4e8d16123be2776afa9aba9a2b288`; no R3 tag. These are transferred provenance statements, not fresh remote checks.
- Excluded tracked inputs: `.env.example` and the original Moodle R3 requirements PDF. Credentials, private PDFs, original Git history/refs, untracked/ignored data and dependencies were excluded. No private course materials or original history were downloaded.
- Requirements authority available here is the repository transcription in [requirements evidence](release-3-requirements-evidence.md), with [Phase 7 traceability](release-3-final-traceability.md). Its historical claim to have read the PDF is not a claim by this closure audit to have inspected it.
- Production URL supplied by caller: https://immxrsive-talent-platform.vercel.app/. R3 deployment, applied migrations 0008–0010, successful manual creation/publication/playable integration and 12/12 production smoke are **user-reported historical evidence**. No production endpoint was contacted in this task.
- Historical Phase 7: **158 integration/API, 230 unit/frontend, 125 browser passed; 5 intentional skips**. Preserved reports are point-in-time evidence, not this worker's fresh results. No historical result catalog, freeze manifest, SQL migration, migration journal or snapshot was changed.

## Confirmed findings and proposed changes

**Confirmed QA invocation defect (fixed):** `package.json` used `vitest run --exclude tests/integration/**`. On this worker's Bash, the shell expanded the glob to filenames. Vitest consumed the first as the exclusion and the rest as positional filters, selected integration files and returned exit 0 with **150 skipped, zero passed** when no database was configured. Quote the glob so Vitest receives one literal pattern. The corrected command selected the unit/frontend suite and exposed the prior checksum assertion failure, now fixed below. This is a test-command defect, not a cause of the production import complaint.

**Portable source-checksum verification (fixed in this revision):** the caller independently verified the original committed LF SQL hash. This worker verified raw snapshot SHA256 `52849fdd5d44e54f8e712f128ccd065812dd0cbd9a6c7920f422774050e047b2`; removing only the 67 CR bytes immediately before LF yields `3d9c718bef8edb14d3bcbd8bff858f6f5d822776548d69ed6c1532a63df9fe92`, the unchanged legitimate expected checksum in production hardening/postcheck SQL. Replacing LF with CRLF reconstructs the snapshot byte-for-byte; no lone CR or mixed LF exists. This proves the export differs from the caller-verified hash only by line endings, subject to SHA256 identity. The test-only byte helper removes CR exclusively when followed by LF. It asserts the literal legitimate checksum before checking both production documents. Two focused regressions prove LF/CRLF equivalence and rejection of changed SQL, spaces, lone CR, missing final newline and added content in both checkout encodings. No general whitespace or SQL normalization occurs. Migration application/hashing behavior, SQL, snapshots and journal bytes remain unchanged. The previous 236 pass/1 fail/0 skip result is historical; current validation is green below.

**Reported production import failure: not reproduced.** Exact-input deterministic tests pass; no confirmed application defect or root cause was established. No application source fix was justified. Added tests exercise the reported identity and save sequence rather than substituting `qa/xr-studio`. All upstream data in new tests is explicitly synthetic.

## Exact import, duplicate and save investigation

Reported repository: `https://github.com/JashSojitra/immxrsive-talent-platform`.
Reported playable: `https://immxrsive-talent-platform.vercel.app/`.

1. `src/projects/repository-url.ts` accepts that mixed-case owner and normalizes to `https://github.com/jashsojitra/immxrsive-talent-platform`. `.git`, trailing slash, query and fragment variants normalize to the same key. Branch/file URLs, credentials and custom ports are rejected.
2. `src/projects/github-import.ts` requests only `https://api.github.com/repos/jashsojitra/immxrsive-talent-platform` and its `/languages` endpoint, without a token. Redirects are forbidden; combined abort budget is 5 seconds; each response is bounded to 128 KiB. Null descriptions/languages are supported. 401/404 map to repository unavailable, 403/429 to rate limiting, timeout to `GITHUB_TIMEOUT`, malformed/private/changed-identity/upstream errors to `GITHUB_UNAVAILABLE`. Failure at the languages endpoint fails the suggestions as a whole. These are possible handled failure categories, not a diagnosis of the user's incident.
3. `src/projects/import-http.ts` requires a verified session, an account-owned verified profile, same-origin JSON and a strict URL body. It returns suggestions only; no project is inserted. Missing/expired session, affiliation, configured origin, GitHub response or server failures require actual status/body evidence to distinguish.
4. `GitHubImportPanel.tsx` reviews editable suggestions; `ProjectEditor.tsx` applies them only explicitly. Domain/type and contributor role still need valid selections. Media requires a label. `validation.ts` accepts the supplied playable as an independent media field, not a repository or import input. Importing does not infer a playable URL or generate a preview.
5. `evidence-url.ts` accepts the supplied playable HTTPS URL but does not embed this application origin. It uses an external launch. This is consistent with URL-only evidence and the application's anti-framing headers; an iframe is not required by R3.20. No live reachability or runtime-health claim follows from schema validity.
6. New-project save calls `/api/v1/student/project-duplicates` using the complete draft. A warning pauses creation; View Project opens a new tab and eligible matches offer Request to Join. Continue explicitly sends the returned acknowledgement to `/api/v1/student/projects`. Private matches expose no IDs/titles. Acknowledgement is bound to account, normalized repository keys and current exact candidate states.
7. `service.ts` verifies the actor/role, locks repository keys, rechecks duplicates and atomically creates the canonical project, accepted creator relationship, contribution and child rows. A changed candidate set returns a recoverable 409. Repository matching also reads legacy assets without granting ownership. Successful creation returns the saved draft and redirects to its editor. Editing requires current maintainer and version; stale saves return 409. Frontend tests mock persistence responses; they do not establish actual database commits.
8. New tests cover exact-case metadata with null description, languages, normalization, both-stage HTTP failures, malformed/private/renamed repository data, bad language data, non-JSON, transport rejection and timeout. Editor tests cover editable apply, exact playable retention, warning before save, explicit acknowledgement, server race warning and retained draft after failed save. Existing integration tests additionally cover concurrent creates, account-bound acknowledgements, private candidates, fixtures, approval/acceptance and legacy matches, but were not freshly run here.

Missing incident evidence: UTC time/timezone; browser and viewport; precise failing stage (Review, Apply, Create, Continue, Save or Publish); redacted request path/method and payload field names; response status and structured code/message/body; duration; browser console/network error; whether a response was JSON; verification/session status; whether an earlier private draft was created; correlation ID if present; redacted server/GitHub response details if available through an authorized operator. Never share cookies, tokens, OAuth codes, emails, verification links or raw HAR files. A lost create response can leave an already-created private draft; inspect My Projects before retrying. This is diagnostic guidance, not a reproduced defect.

## Complete requirement audit

Paths below are repository-relative. `I:` means an existing integration test inspected but **NOT RUN** here. `B:` means existing browser coverage inspected but **NOT RUN** here. Fresh unit/frontend outcomes are in validation below. “Supported” means source/coverage supports the requirement; it is not live acceptance. The historical suite supports R3.01–R3.26 locally; required deployed evidence remains separate.

| ID | Requirement / audited implementation and route/UI | Evidence and remaining assessment |
| --- | --- | --- |
| R3.01 | Add Project: `src/projects/http.ts`, `service.ts`, `ProjectEditor.tsx`; `/student/projects/new`, POST `/api/v1/student/projects` | Supported: verified guard, atomic creator creation; fresh editor tests. I: `manual-project-api.test.ts`, `shared-projects.test.ts`; DB acceptance not rerun. |
| R3.02 | Manual fields: `validation.ts`, `ProjectEditor.tsx`; same entry, versioned PATCH `/api/v1/student/projects/{id}` | Supported: title/description/domain, technology/date/status, links and typed media. Fresh editor/validation tests; I: `manual-project-api.test.ts`. |
| R3.03 | Editable import: `github-import.ts`, `import-http.ts`, `GitHubImportPanel.tsx`; POST `/api/v1/student/project-imports/github` | Exact reported repository mocked checks pass; real deployed import demonstration and failure diagnosis remain open. I: `project-import-api.test.ts`; B: `project-import.spec.ts`. |
| R3.04 | Repository-independent identity: `service.ts`, `repository-url.ts`; repository rows in editor | Supported: zero/multiple repositories, stable generated ID. I: `manual-project-api.test.ts` zero/multiple/replaced repositories. |
| R3.05 | Canonical shared record: `service.ts`, `public-evidence.ts`; same `/projects/{id}` from both `/students/{id}` | I: `project-team-api.test.ts` two accepted profiles, B: `project-team.spec.ts`; genuine persistent two-contributor evidence missing. |
| R3.06 | Initial maintainer: `service.ts` create/maintainer guard; edit and team UI | Supported; documented maintainer-only shared editing. I: `shared-projects.test.ts`; fresh editor checks do not prove DB ownership. |
| R3.07 | Transfer: `service.ts`, `team-http.ts`, `ProjectTeam.tsx`; maintainer-transfer and project-transfers response APIs | Supported: accepted target, consent, project lock/version and unchanged ID. I: `project-team-api.test.ts`; B: `project-team.spec.ts`. |
| R3.08 | Invite existing student/role: `service.ts`, `team-http.ts`, `ProjectTeam.tsx`; invitations/teammates APIs | Supported: verified eligible account and role validation; private UUID may be explicitly shared. I: `project-team-api.test.ts`. |
| R3.09 | Accept/decline: `respondToInvitation`, `public-evidence.ts`; `/student/project-invitations`, membership response API | Recipient-only decision; pending/declined suppressed publicly. I: `project-team-api.test.ts`; genuine human consent evidence missing. |
| R3.10 | Standard role/optional statement: `contributionSchema`, `getProjectRoles`, `ProjectTeam.tsx` | 12 role fixtures; own contribution PATCH. Fresh team UI tests; I: `shared-projects.test.ts`. |
| R3.11 | Own contribution: `updateContribution`, strict `team-http.ts` payload; membership contribution PATCH | Session-derived owner and independent version; fresh team UI tests, I: `project-team-api.test.ts`. |
| R3.12 | Feature/hide personally: `public-evidence.ts`, `updateContribution`, team switches | Featuring independent from acceptance/public attribution. Fresh team UI tests; I: `shared-projects.test.ts`; DB projection not rerun. |
| R3.13 | Removal protection: `setMembershipRemoved`, team Remove/Restore APIs | Reversible soft removal retains accepted relationship/contribution; current maintainer protected. I: `project-team-api.test.ts`; decision preserved in notes. |
| R3.14 | Separate project technologies: `replaceSharedChildren`, `ProjectEditor.tsx`, public evidence | No personal-skill writes in project service; fresh editor/import tests. I: `shared-projects.test.ts`, `project-import-api.test.ts`. |
| R3.15 | Public contributor role: `public-evidence.ts`, `src/db/queries/project-detail.ts`, `ProjectDetailView.tsx` | Accepted, visible, published, verified gates; fresh detail UI tests. I: `project-team-api.test.ts`; two-human public example missing. |
| R3.16 | Duplicate warning: `duplicates.ts`, `service.ts`, `DuplicateWarning.tsx`; duplicate/view/join flows | Fresh exact-input warning/acknowledged save/race UI checks. I: `project-import-api.test.ts` fixtures/races/private matches; deployed exact-input evidence missing. |
| R3.17 | No silent lost update: `revision`, row locks, `ProjectEditor.tsx` conflict/reload | Fresh stale-save retention/confirmation checks. I: `shared-projects.test.ts` concurrent saves/atomic children; concurrency DB checks not rerun. |
| R3.18 | Separate playable/video/source: schema, `validation.ts`, editor media; public `/projects/{id}` | Fresh typed validation/demo/editor tests; exact playable passes independent of repository. I: `project-demo-api.test.ts`. |
| R3.19 | URL-only evidence: `evidence-url.ts`, `validation.ts`, `ProjectDemo.tsx`, `next.config.ts` | Fresh URL rejection/demo tests; structured rendering and sandbox, no student raw embed path. I: `project-demo-api.test.ts`; B: `project-demo.spec.ts`. |
| R3.20 | Play/Launch action: `ProjectDemo.tsx`; `/projects/{id}` | Fresh demo tests; supplied application URL is external launch. B: `project-demo.spec.ts` real fixture interaction; live example evidence missing. |
| R3.21 | Independent fallback: `ProjectDemo.tsx`; `/fixtures/r3/fallback.svg` | Fresh demo tests and fixture-copy contract check; B: `project-demo.spec.ts`; manual playable fixture success user-reported, durable evidence URL missing. |
| R3.22 | Broken demo isolation: `ProjectDemo.tsx`, detail view | Fresh demo/detail tests; B: `project-demo.spec.ts` unavailable/blocked/slow/missing fallback. Runtime health is never inferred from iframe load. |
| R3.23 | 390 CSS px usability: project detail/demo/editor CSS | B: `project-detail.spec.ts`, `project-demo.spec.ts`, `manual-project.spec.ts`, `project-team.spec.ts`, `project-import.spec.ts`; historical mobile passes only, no fresh layout/browser claim. |
| R3.24 | Authorization: `src/auth/server.ts`, project HTTP/team/import handlers and `service.ts` guards | Verified session, origin, strict schemas, in-transaction maintainer/owner checks; I: `manual-project-api.test.ts`, `project-team-api.test.ts`, `project-import-api.test.ts`. Hosted auth/config not verified. |
| R3.25 | R1/R2 regression: talent/profile/inquiry queries, `src/profile/service.ts`, related UI/routes | Fresh directory/profile/inquiry/auth frontend/unit coverage; I: talent/student/inquiry/private-profile/auth suites; B: `release-1-acceptance.spec.ts`, `private-student-profile.spec.ts`. Portable source-checksum regression passes; migration bytes unchanged. |
| R3.26 | Stable URL: project ID/FKs, `service.ts` repository replacement/maintenance transfer | I: `shared-projects.test.ts`, `manual-project-api.test.ts`; B: `project-team.spec.ts`. Source never derives ID from repository or target maintainer. |
| R3.27 | Assessed version: submission record and source/deployment/tag identity | **Unmet**, caller reports no R3 tag. Original ancestry/refs unavailable here. Human must verify exact reviewed/deployed commit, then separately authorize assessed tag or obtain instructor equivalent. |

Implementation references abbreviated in this matrix are under `src/projects/`, editor UI under `src/components/project-editor/`, demo/detail UI under `src/components/project-detail/`; I files are under `tests/integration/`, B files under `tests/browser/`. Full pre-existing per-case mapping is preserved in `release-3-final-traceability.md` and `release-3-qa-results.json`.

## Prior validation on dilab-5080 (historical)

Prior job scripts/config inspection: `package.json`, `vitest.config.ts`, `playwright.config.ts`, `next.config.ts`, fixture validator, adapter validator and Phase 7 disposable driver. The latter was not invoked: Docker socket access is denied, and its historical driver also contains Windows-specific timeout cleanup. No migrations, fixture imports, database connections or account creation were attempted. No local PostgreSQL executables were found. No hosted database fallback was used.

In the prior job, system Node was 18.19.1, below project requirement. A temporary Node 22.16.0 was installed outside the patch at `/tmp/immx-r3-runtime`, using npm cache `/tmp/immx-r3-npm-cache`. Project dependencies were installed with unchanged `package-lock.json`. No package versions were updated. Temporary runtime installation: `npm install --prefix /tmp/immx-r3-runtime --cache /tmp/immx-r3-npm-cache --no-audit --no-fund node@22.16.0` (passed). An initial attempt without a temporary cache failed to create the default npm cache; retry above succeeded.

Every project command below used this clean prefix, so no ambient database/auth/email credentials were inherited:

```sh
env -i PATH=/tmp/immx-r3-runtime/node_modules/.bin:/usr/bin:/bin HOME=/tmp/immx-r3-runtime <command>
```

| Exact command after clean prefix | Historical prior-job outcome |
| --- | --- |
| `npm_config_cache=/tmp/immx-r3-npm-cache npm ci --no-audit --no-fund` (environment assignment before npm) | PASS, 496 packages; lockfile unchanged |
| `npm run lint` | PASS, exit 0 |
| `npm run typecheck` | PASS, exit 0 |
| `NEXT_TELEMETRY_DISABLED=1 npm run build` (environment assignment before npm) | PASS; optimized Next build, route compilation and type checks; no DB acceptance implied |
| `node scripts/validate-release-3-adapter.mjs` | PASS provisional contract only: 9 pages, 18 API method mappings, R1/R2 fields and fixture copies; official schema NOT validated |
| `npm run fixtures:validate` | PASS: 18 students, 9 projects, 24 skills, 24 contributor relationships; read-only fixture validation |
| `npm test -- --maxWorkers=1` before fix | Misleading exit 0: 12 integration files, 150 skipped, 0 passed; shell expansion reproduced |
| `node node_modules/vitest/vitest.mjs run tests/unit tests/frontend --maxWorkers=1` | 236 passed, 1 failed, 0 skipped across 33 files; checksum mismatch described above |
| `npm test -- --maxWorkers=1` after fix | 236 passed, 1 failed, 0 skipped across 33 files; same preserved checksum mismatch, actual unit/frontend selection restored |
| `node node_modules/vitest/vitest.mjs run tests/unit/r3-closure-import.test.ts tests/frontend/r3-closure-import.test.tsx --maxWorkers=1` | PASS: 7 tests, 2 files, 0 failed/skipped; exact reported inputs, wholly mocked transport/persistence |
| `docker info --format '{{.ServerVersion}}'` | FAILED: permission denied on `/var/run/docker.sock`; no resources created |
| Integration/API, migration/upgrade/security/fixture import tests | **NOT RUN**: no identity-verified disposable PostgreSQL; the initial accidental 150 skips are not passes |
| Browser tests, including focused auth/team/import/demo/390px flows | **NOT RUN**: configured Playwright server requires migrated disposable PostgreSQL; no unsafe server started |
| Production smoke, live GitHub import, OAuth/email, real accounts, tag/deployment identity | **NOT RUN**: historical/user-reported only; no production writes authorized or attempted |

The original 230 unit/frontend count plus 7 new checks accounts for 237 selected tests; do not add repeated runs into a cumulative pass claim. That failure was fixed by the current test-only revision below. No new production acceptance claim follows from build or mocks.

## Current revision validation — 2026-11-04

This revision reused the verified temporary Node **22.16.0** runtime. Every command used the same clean `env -i` prefix shown above; no ambient hosted credentials were inherited. Logs and generated output remain outside the returned patch. No unsafe selector was rerun. Corrected `npm test` selected real unit/frontend tests only.

| Exact command after clean prefix | Current outcome |
| --- | --- |
| `npm_config_cache=/tmp/immx-r3-npm-cache npm ci --no-audit --no-fund` | PASS, 496 packages, unchanged lockfile |
| `npm test -- --maxWorkers=1` | PASS: **239 passed, 0 failed, 0 skipped; 33 files passed, 0 failed/skipped** |
| `node node_modules/vitest/vitest.mjs run tests/unit/database-security-hardening.test.ts tests/unit/r3-closure-import.test.ts tests/frontend/r3-closure-import.test.tsx --maxWorkers=1` | PASS subset: **13 passed, 0 failed/skipped; 3 files**. Hardening 6, exact-input unit 5, exact-input frontend 2. The exact-input subset remains **7 passed, 2 files**, not an addition to 239. |
| `npm run lint` | PASS, exit 0 |
| `npm run typecheck` | PASS, exit 0 |
| `NEXT_TELEMETRY_DISABLED=1 npm run build` | PASS, exit 0; no database acceptance implied |

Integration/API and browser tests: **NOT RUN**, with no new DB/Docker probes; prior Docker access denial remains the limitation. No disposable PostgreSQL identity was available or assumed. Production smoke/import/collaboration, OAuth/email, deployment identity and tag checks: **NOT RUN**. Adapter and fixture validators in the prior table are historical, not rerun here. Historical Phase 7 counts remain 158 integration/API, 230 unit/frontend, 125 browser passes and 5 intentional skips; reported 12/12 production smoke remains historical.

The current total is the original 230 plus 7 exact-input tests plus 2 checksum regressions, not the sum of repeated runs. All current selected files and per-file counts follow:

| Selected file | Passed | Failed | Skipped |
| --- | ---: | ---: | ---: |
| `tests/frontend/talent-directory.test.tsx` | 15 | 0 | 0 |
| `tests/frontend/private-student-profile.test.tsx` | 6 | 0 | 0 |
| `tests/frontend/inquiry.test.tsx` | 11 | 0 | 0 |
| `tests/unit/affiliation-verification.test.ts` | 10 | 0 | 0 |
| `tests/frontend/student-profile.test.tsx` | 10 | 0 | 0 |
| `tests/unit/resume-extraction.test.ts` | 8 | 0 | 0 |
| `tests/frontend/resume-import.test.tsx` | 3 | 0 | 0 |
| `tests/frontend/project-editor.test.tsx` | 5 | 0 | 0 |
| `tests/frontend/project-detail.test.tsx` | 9 | 0 | 0 |
| `tests/unit/database-security-hardening.test.ts` | 6 | 0 | 0 |
| `tests/frontend/r3-closure-import.test.tsx` | 2 | 0 | 0 |
| `tests/frontend/project-demo.test.tsx` | 11 | 0 | 0 |
| `tests/frontend/project-team.test.tsx` | 5 | 0 | 0 |
| `tests/unit/r3-closure-import.test.ts` | 5 | 0 | 0 |
| `tests/frontend/affiliation-verification.test.tsx` | 4 | 0 | 0 |
| `tests/frontend/github-import.test.tsx` | 4 | 0 | 0 |
| `tests/unit/talent-query.test.ts` | 23 | 0 | 0 |
| `tests/unit/github-import.test.ts` | 26 | 0 | 0 |
| `tests/frontend/student-auth.test.tsx` | 5 | 0 | 0 |
| `tests/unit/fixture-validation.test.ts` | 9 | 0 | 0 |
| `tests/unit/student-profile-validation.test.ts` | 7 | 0 | 0 |
| `tests/unit/database-safety.test.ts` | 6 | 0 | 0 |
| `tests/unit/inquiry-validation.test.ts` | 8 | 0 | 0 |
| `tests/unit/project-validation.test.ts` | 15 | 0 | 0 |
| `tests/unit/project-evidence-url.test.ts` | 4 | 0 | 0 |
| `tests/unit/inquiry-template.test.ts` | 4 | 0 | 0 |
| `tests/unit/student-access-route.test.ts` | 3 | 0 | 0 |
| `tests/unit/inquiry-api-error.test.ts` | 1 | 0 | 0 |
| `tests/unit/project-api-error.test.ts` | 1 | 0 | 0 |
| `tests/unit/auth-config.test.ts` | 8 | 0 | 0 |
| `tests/frontend/branding.test.tsx` | 2 | 0 | 0 |
| `tests/unit/fixture-ids.test.ts` | 2 | 0 | 0 |
| `tests/unit/resume-runtime-config.test.ts` | 1 | 0 | 0 |

**Reviewed-proposal recommendation: APPLY**, subject to caller review, read-only applicability checks and explicit user approval before local application. This recommendation concerns only the combined 11-file proposal. **Assessed submission: NO-GO** until the production evidence, official adapter, assessed deployment identity/tag and acceptance gates below are resolved. No application or release action was performed.

## Release records and decision

Reviewed `release_submission.md`, `release_submission_template.md`, `evaluation_adapter.json`, R1 adapter template, adapter contract/validator, requirements transcription, final traceability, release notes, known issues, final QA, QA setup/result catalog, deployment/rollback and source-freeze records. The submission template supplied is generic. No `evaluation_adapter_template.json` or official R3 replacement is supplied. The existing adapter remains **PROVISIONAL_OFFICIAL_R3_TEMPLATE_MISSING**, with null production evidence. Do not manufacture values or mark the official schema valid. Closure annotations link current findings without rewriting historical phase results. Conflicting old “uncommitted/R2 HEAD” statements are historical, superseded by caller provenance only, not erased.

Submission blockers:

1. Genuine persistent public project with two independently consenting verified contributors, both public portfolio references to one ID, recorded consent/publication and working demo/fallback evidence. Local synthetic fixtures and reported manual success do not fill this artifact gap.
2. Real deployed import demonstration for the exact repository, plus captured redacted incident evidence or an explicitly tracked unresolved failure. Passing mocks cannot explain or close the reported failure.
3. Official R3 adapter template reconciliation or explicit instructor acceptance of the provisional contract.
4. Exact assessed source/deployment identity and `R3-submission` tag/instructor-approved equivalent. Caller baseline information is supplied; this worker cannot independently verify original refs/deployment. This proposed patch, if approved, creates a later source revision requiring its own review/identity decision.
5. Current unit/frontend, lint, typecheck and build checks pass. Required disposable DB/browser acceptance remains NOT RUN in this revision; complete it where safe infrastructure is available. Do not count skipped tests as passed.

Optional improvements (not R3 submission requirements): authenticated upstream GitHub quota, partial metadata success when languages fails, expanded title search beyond 250 public same-domain candidates, extra browsers/physical devices/formal screen-reader audit, richer import diagnostics, automatic resend/multiple roles/full history UI. No such expansion was implemented. AutoDemo and R3.1 are deferred in the [separate roadmap](release-3-post-release-roadmap.md).

## Proposed changed-file manifest and patch inspection

- `package.json`: quote existing test exclusion glob; no dependency/version edits.
- `tests/unit/database-security-hardening.test.ts`: portable source-only CRLF checksum verification and two regression tests; legitimate hash unchanged.
- `tests/unit/r3-closure-import.test.ts`: five exact-input deterministic test cases (including parameterized stages).
- `tests/frontend/r3-closure-import.test.tsx`: two mocked editor/import/duplicate/save checks.
- `docs/release-3-closure-report.md`: this audit, full 27-row matrix, limitations and validation.
- `docs/release-3-closure-human-checklist.md`: reproducible later human acceptance and incident evidence steps.
- `docs/release-3-post-release-roadmap.md`: explicit AutoDemo/R3.1 deferral.
- `release_submission.md`: current closure pointer and caller-reported deployment context.
- `docs/release-3-final-traceability.md`, `docs/release-3-known-issues.md`, `docs/release-3-release-notes.md`: dated closure pointers preserving previous records.

Final inspection uses per-command `git -c safe.directory="$PWD"` (no global Git configuration changes), tracked diff plus complete untracked-file manifest/content inspection. New files remain ordinary untracked source/docs for the remote client's patch collector; no staging/commit required. No secrets, real account data, `.env`, raw logs, dumps, `node_modules`, build/browser output or unrelated files are proposed. Synthetic IDs/descriptions and test response bodies are explicitly artificial. SQL, migration metadata, freeze files, historical phase test records, R1/R2 artifacts and dependency lockfile remain unchanged against the synthetic transport baseline. Whitespace is checked for both tracked and new files. Existing CRLF formatting is retained; Git whitespace checking uses `-c core.whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol` so carriage returns are treated as line endings rather than trailing spaces. Final byte comparison verified all 329 other tracked blobs unchanged (including all 43 specifically protected migration/SQL/freeze/phase/QA/adapter/lockfile inputs); the complete manifest has 11 files, and the matrix has 27 distinct requirement rows. Original repository remains untouched and its supplied baseline frozen; the returned patch is not an applied release.

No independent agent review was run because the task explicitly prohibits subagents/other workers/personal Codex. The coordinating worker inspected its own final diff; this does not constitute independent review. Caller review and explicit approval are required before local application. Stop here: no apply, integration, push, tag or deploy.
