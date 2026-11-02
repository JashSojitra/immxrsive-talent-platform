# Release 3 Phase 3 implementation and verification

Date: October 31, 2026. Result: ready for review; no Phase 4 implementation started.

Branch remained `feat/release-3`, HEAD `4c8a64d7313c1401889ae97a1223090d059008de`. Configured author remained Jash Sojitra `<jash221434@gmail.com>`. No commits, pushes, deployments, tags, branch switches, development/production database connections, or historical migration changes were made. Existing Phase 1/2 changes, planning documents, course documents, fixtures, and R1/R2 tags were preserved. The working tree intentionally remains uncommitted.

## Delivered behavior

The verified student dashboard links to My Projects. A verified student with an account-owned profile can create a manual project, becoming its initial maintainer and accepted contributor with a selected standard role. A profile can remain private; the workspace explains the profile prerequisite when none exists. Shared fields are maintainer-only, including all child repository/link/media/technology changes. Legacy unmanaged projects cannot be claimed through these routes.

The editor supports title, short description, domain/type, technologies, project date/status, any number of repository links including zero, public links, and typed playable/video/source/fallback image/video/link evidence. URLs use existing server validation; localhost with a trailing dot is also rejected. Project technologies never populate personal skills. Media remain ordinary evidence links; no iframe, raw embed code, external metadata fetch, or interactive player was added.

Projects start as drafts. Saved draft preview requires verified maintainer authorization. Publishing and unpublishing are explicit, confirmed, version-bound actions. Saving shared edits checks the integer version atomically through the existing Phase 2 services. A stale revision returns 409, preserves local input, and offers a separately confirmed reload. Validation and network failures also preserve input. Publishing is disabled while local changes are unsaved.

Published account-owned projects use the existing `/projects/[projectId]` presentation and inquiry handoff. Canonical IDs survive all edits and repository changes. Accepted contributors are publicly represented only when their profile is published, their affiliation is verified, and their attribution visibility permits it. Portfolio associations additionally require personal featuring. Pending, removed, hidden, or unpublished identities are not exposed. Draft projects are excluded from public project APIs, profile evidence, and directory evidence counts. Legacy presentation and public response contracts remain compatible.

## Files changed in this phase

These are Phase 3 changes; the larger git diff also contains pre-existing Phase 1/2 implementation and documents.

| Files | Purpose |
| --- | --- |
| `src/app/student/dashboard/page.tsx` | My Projects entry |
| `src/app/student/projects/page.tsx`, `new/page.tsx`, `[projectId]/edit/page.tsx`, `[projectId]/preview/page.tsx` | Verified workspace, manual creation, maintainer editing and private preview |
| `src/app/student/projects/loading.tsx`, `error.tsx`, `not-found.tsx` | Accessible loading, recovery and unavailable states |
| `src/components/project-editor/ProjectWorkspace.tsx`, `ProjectEditor.tsx`, `project-editor.module.css` | Expressive responsive editor, labeled fields, dynamic evidence rows, error focus, conflict recovery and publication |
| `src/app/api/v1/student/projects/route.ts`, `[projectId]/route.ts`, `[projectId]/publication/route.ts` | Private project endpoints |
| `src/projects/http.ts`, `types.ts` | Strict bounded JSON HTTP boundary, trusted-origin checks and client-safe DTO types |
| `src/projects/service.ts` | Maintainer project listing, editor projection, standard-role lookup and coherent version/child-row read snapshot |
| `src/projects/validation.ts` | Trailing-dot localhost validation regression fix |
| `src/projects/public-evidence.ts` | Shared public eligibility, account contributor and structured evidence projections |
| `src/db/queries/project-detail.ts`, `src/profile/public-projection.ts`, `src/db/queries/talent.ts` | Canonical presentation, portfolio associations and consistent evidence counts |
| `src/components/project-detail/ProjectDetailView.tsx`, `project-detail.module.css` | Private preview banner, date/status, role statements, readable media labels and long UUID wrapping |
| `tests/frontend/project-editor.test.tsx` | Five editor behavior tests |
| `tests/integration/manual-project-api.test.ts` | Seven database/API journey and security tests |
| `tests/browser/manual-project.spec.ts` | Actual desktop and 390px authenticated browser journeys |
| `tests/unit/project-validation.test.ts` | Additional localhost validation case |
| `scripts/verify-manual-projects.mjs` | Bounded disposable PostgreSQL migration/upgrade/test/build/browser verification |
| `docs/release-3-phase3-verification.md` | This report |

No schema migration was necessary: Phase 2 already represents every required manual field. SQL migrations 0000–0009 and historical checksums were unchanged during Phase 3.

## Endpoints and authorization

| Endpoint | Method and behavior |
| --- | --- |
| `/api/v1/student/projects` | GET own maintained projects; POST manual draft creation |
| `/api/v1/student/projects/[projectId]` | GET editor data/roles; PATCH complete shared-field draft with version |
| `/api/v1/student/projects/[projectId]/publication` | POST `{ version, published }` |

All require a verified session. Item reads and mutations enforce maintainer ownership server-side; request bodies cannot assign identities or overwrite contributor statements. Mutations require JSON, a trusted same-site origin, strict schemas, and a maximum 64 KiB body. Private success responses use `Cache-Control: private, no-store`. Existing public routes and error envelopes remain in use.

The production origin check uses the canonical `BETTER_AUTH_URL` origin. Real browser verification revealed that Next can reconstruct a Request URL with an internal hostname, so comparing exclusively against that hostname rejected legitimate saves. The fix retains a configured trust boundary and is covered by proxy-origin and forged-origin API tests. Deployments must retain their existing correct canonical authentication URL.

## Disposable database evidence

Final verification created a new PostgreSQL 18.6 container:

- Name/cluster: `immx-phase3-a35e1c123bc9`.
- Container ID: `f0a27badde0fa7b2f7224553e20a39c0cf005a24e9fac3d804aa2c77e3d3be46`.
- Published binding: `127.0.0.1:63057` to container port 5432; no wildcard binding.
- Dedicated databases: `phase3_a35e1c123bc9_fresh`, `phase3_a35e1c123bc9_upgrade`, and a distinct build-guard database ending `_guard`.
- Dedicated user: `phase3_a35e1c123bc9`; unique random password stayed in process environment and was not printed.
- Container data used tmpfs. Container ID, unique run label, localhost binding, database, user, server port and cluster name were checked before migrations/test operations. All database environment variables were explicitly set to this isolated instance, including migration and test URLs.

Fresh migration sequence 0000–0009 completed with ten journal entries. The populated upgrade rehearsal applied 0000–0008 (nine entries), inserted representative legacy student/project/contributor/technology and student/project inquiry records, then applied 0009 (ten entries). Snapshots remained identical; legacy projects remained published, unmanaged and version 1. Project-only inquiry insertion still succeeded. The existing Phase 1 constraints and Phase 2 security/domain integration suites also passed.

Finally the script rechecked the container run label and removed only its exact container ID and disposable volumes. Subsequent Docker label inventories returned no Phase 3 or focused-browser verification containers. Existing resources were not reused or modified. Preservation checks confirmed 43 pre-existing untracked inputs and all SQL migrations unchanged in the final run.

## Commands and actual results

Safe full reproduction, with Docker running:

```powershell
node --import tsx scripts/verify-manual-projects.mjs --run-disposable
```

The script creates and verifies a new instance, supplies isolated database variables, runs the commands below, and cleans up in `finally`. Do not run database commands separately using normal environment files.

| Command / suite | Actual final result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `node node_modules/drizzle-kit/bin.cjs check` | Passed metadata integrity check |
| `git diff --check` | Passed; Git emitted existing LF/CRLF informational warnings |
| Vitest `manual-project-api`, `shared-projects`, `fixture-import`, `inquiry-api`, `--maxWorkers=1 --reporter=verbose` | 57 passed, four files |
| Vitest `talent-api`, `student-profile-api`, `project-detail-api`, `private-student-profile`, same options | 63 passed, four files |
| `node node_modules/next/dist/bin/next build` | Passed using isolated database environment |
| `node node_modules/vitest/vitest.mjs run --exclude tests/integration/** --maxWorkers=1` | 180 passed, 26 files |
| `node node_modules/@playwright/test/cli.js test --reporter=list` | 119 passed, five intentional skips, 124 entries; 2.1 minutes |

Totals: 120 database/API tests, 180 unit/frontend tests, and 119 passed browser tests. The five browser skips are existing mobile-only checks skipped in the desktop project. Both new manual journey variants passed, with actual database persistence and real authenticated app routes. All bounded commands exited 0 without timeout. Sanitized detailed command/result output is retained at `tmp/phase3-verification-last.log`.

Browser coverage includes creation with all manual fields; draft API/privacy and authorized preview; two repositories followed by replacement/removal to zero; ID stability; real stale-save conflict with input preservation and cancel/confirm reload; simulated failed save followed by successful persisted save; explicit publish; public role/media presentation; project inquiry persistence; profile and directory evidence; no personal-skill inference; unpublished-profile suppression; outsider mutation/preview denial; reduced motion; and unpublish exclusion. Unit/API suites additionally exercise malformed/oversized/forged payloads, anonymous/unverified users, legacy ownership denial, contributor eligibility and version conflicts.

The complete existing browser matrix also covers UUID profile inquiries, directory/search, profile privacy, legacy project evidence, keyboard focus, reduced motion and WebGL failure. Mobile assertions cover exact 390px geometry without horizontal overflow. Desktop/mobile editor and public-page screenshots were captured under `test-results/manual-project-verified-st-0fe7d-ublishes-canonical-evidence-{desktop,mobile-390}/` and visually inspected. They retain the existing typography, motion, dark fields, signal accents, and responsive presentation.

## Investigated failures and remaining observations

Earlier bounded attempts exposed the real canonical-origin issue described above, which was fixed before the final matrix. Test-authoring failures were corrected: an ambiguous status label, a generic alert matching Next's route announcer, hidden loading markup matching a broad main selector, and screenshots captured before GSAP reveal completion. The editor alert now has an explicit accessible name. Tests use visible accessible landmarks and wait for completed reveal behavior; motion and privacy checks were retained.

Next may return HTTP 200 for a streamed HTML not-found response; [the framework documents this behavior](https://nextjs.org/docs/app/api-reference/file-conventions/not-found). Draft HTML tests verify unavailable content, noindex, and absence of private project text, while the public JSON API must return 404. This does not expose a preview flag or draft content.

No worker stall or Playwright teardown hang reproduced with bounded single-worker execution. The previously reported default-worker behavior was not rebenchmarked. During full browser regressions Next logged an intermittent `The destination stream closed early` message during navigation; the suite still exited cleanly and both manual journeys had no browser page errors. This remains an observation rather than a claimed framework repair.

## Official requirements and phase boundaries

| Official requirement | Evidence delivered here |
| --- | --- |
| R3.01, R3.02 | Verified Add Project and complete manual creation workflow |
| R3.04, R3.26 | Independent zero/one/multiple repository rows and canonical ID stability; Phase 2 transfer tests retained |
| R3.05, R3.06 | One canonical record, initial maintainer, accepted membership and eligible public profile associations; two-person release demonstration remains later |
| R3.14, R3.15 | Separate project technologies, role/statement presentation with contributor privacy |
| R3.17 | Versioned saves/publication, structured 409, preserved input and explicit reload |
| R3.18, R3.19 | Separate typed presentation URLs and structured data; no injected embed code |
| R3.21, R3.23 | Optional fallback storage/link presentation and usable 390px details/roles/evidence; actual player/failure-state QA remains later |
| R3.24, R3.25 | Maintainer authorization and complete R1/R2 regression matrix |

R3.03 import, R3.07–R3.13 contributor/transfer/visibility UI, R3.16 duplicate warnings, and the dedicated R3.20–R3.22 demo experience remain later-phase work. Existing Phase 2 contributor services were not replaced. My Projects currently lists projects the student maintains; invitation inbox and accepted-contributor workspace navigation belong to the next phase. No accepted contributors were invented and no legacy project ownership was assigned.

Release evidence (public deployment, consenting two-contributor project, public import example, working hosted demo/fallback, final release notes/submission/adapter and R3-submission tag) remains outstanding. Existing planning documents describe those obligations and were preserved. This phase is ready for review; no concrete blocker to Phase 4 was found. Review and acceptance should precede further implementation.
