# Release 3 Phase 5 — GitHub suggestions, duplicates and joining

Date: October 31, 2026. Branch: `feat/release-3`. Result: implemented and ready for review. Final complete verification passed; Phase 6 is unblocked after review. No Phase 6 work started.

## Delivered behavior and decisions

The existing Add Project page now offers optional **Import from GitHub** alongside manual creation. The student reviews editable title, description, repository URL and language/technology suggestions, explicitly applies them to the local draft, and then saves separately. Existing draft content requires confirmation before replacement; cancellation keeps the review available. Repository/language suggestions add no platform contributors or personal skills. Manual creation works without an import and remains available after unavailable/private/missing/rate-limited upstream responses.

The server accepts only exact HTTPS `github.com/owner/repository` pages for import. It rejects credentials, explicit ports including 443, lookalike hosts, encoded separators/paths, backslashes, traversal and branch/file/API URLs. Case, `.git`, a trailing slash and ordinary query/fragment decoration normalize to a stable repository identity. General safe non-GitHub repository links remain supported manually. Validation happens before URL parsing can hide explicit ports or normalize traversal away.

The importer constructs only two fixed `api.github.com/repos/{owner}/{repo}` routes: metadata and languages. It sends no OAuth token or Authorization header, follows no redirects or upstream-provided URLs, bounds the entire operation to five seconds and each response to 128 KiB, validates public metadata and returns only suggestion fields. It fetches no README, repository content, contributors or executable code. Renamed repositories that redirect fail safely; the student can supply the current URL. Public repository metadata/languages can be requested without authentication, as documented by [GitHub's repository REST reference](https://docs.github.com/en/rest/repos/repos).

Every manual or imported new project gets a duplicate preflight. Creation independently rechecks repository matches in its transaction. Sorted PostgreSQL advisory locks serialize overlapping repository keys across creation and shared repository edits. A concurrent unacknowledged create cannot silently insert a second matching project. Repository identity remains separate from permanent project identity; zero/one/multiple repositories and unchanged project IDs remain supported.

Exact matches require explicit distinct-project confirmation. An opaque HMAC acknowledgement binds the account, normalized repository set and current exact candidate set; changed candidates/publication require renewed review. It is not a project ID or ownership credential. No automatic merge occurs. Public matches expose only public project title, canonical ID, match category and join availability. Private matches expose no project/profile/member IDs, names, counts, descriptions or repository metadata; they produce only generic non-identifying review guidance and an opaque acknowledgement. Pending/removed/private relationship data never enters this lookup.

Title similarity is advisory, uses token overlap among public projects in the same domain, and never blocks the creation service. Different-domain same-title projects remain distinct. Exact repository matching includes historical fixture repository assets without rewriting their IDs, URLs or relationships. Unmanaged legacy projects can be viewed but cannot be claimed or joined through these APIs.

Warnings offer **View Project**, which opens a new tab and preserves the draft, and **Request to Join** for eligible maintained public projects. A request creates no membership. The current maintainer approves it with a standard role, atomically creating a normal Phase 4 pending invitation. The requester must then independently accept or decline. Approval itself never creates an accepted public contributor. Request state, request revision and project revision are checked server-side; stale, duplicate, unauthorized and invalid transitions fail safely. Both pending requests and their status are reachable through the private inbox/team UI.

## Schema and endpoints

New forward-only migration `0010_r3_project_join_requests.sql`, snapshot `0010_snapshot.json` and an appended journal entry add one server-owned table. Phase 2's schema had no durable join-request state, so an additive table was necessary. Columns: permanent request ID, project/profile FKs, pending/approved/declined state, optional resulting invitation membership FK, responding maintainer FK, positive version and creation/response timestamps. Unique project/profile pairing and null-safe response-state checks prevent duplicate/reset consent and invalid approved records. FKs are restrictive; RLS is enabled and all privileges revoked from PUBLIC/anon/authenticated, with no permissive policies. Historical migrations 0000–0009 were not edited.

New routes under `/api/v1`:

| Method / path | Purpose |
| --- | --- |
| POST `/student/project-imports/github` | Verified public metadata suggestions |
| POST `/student/project-duplicates` | Verified draft duplicate preflight |
| POST `/student/projects/[projectId]/join-requests` | Verified eligible public-project join request |
| GET `/student/project-join-requests` | Own private request statuses |
| POST `/student/project-join-requests/[joinRequestId]/response` | Current maintainer approval/decline with revisions and proposed role |

Existing POST `/student/projects` accepts optional `duplicateAcknowledgement` and returns a structured 409 `DUPLICATE_WARNING` with the safe warning DTO when review is required. Existing payloads and public R1/R2 response contracts remain compatible. All new routes derive identity from the existing verified session guard, independently enforce domain permissions, reuse bounded strict same-origin JSON parsing, and return private no-store responses. No client identity, ownership or acceptance field is trusted.

## Exact Phase 5 file manifest

| New files | Purpose |
| --- | --- |
| `src/projects/repository-url.ts`, `github-import.ts`, `duplicates.ts`, `import-http.ts` | Safe identity/import client, duplicate matching/locking/acknowledgement and HTTP adapters |
| `src/components/project-editor/GitHubImportPanel.tsx`, `DuplicateWarning.tsx` | Explicit suggestion review and view/join/distinct-create controls |
| Five `route.ts` files corresponding to the endpoint table above | Authenticated HTTP entry points |
| `drizzle/0010_r3_project_join_requests.sql`, `drizzle/meta/0010_snapshot.json` | Additive request schema/security |
| `tests/unit/github-import.test.ts`, `tests/frontend/github-import.test.tsx`, `tests/integration/project-import-api.test.ts`, `tests/browser/project-import.spec.ts` | Import, URL, fixture, race, privacy, join and real browser coverage |
| `tests/fixtures/github-fetch.mjs` | Deterministic upstream transport, loaded only by disposable driver |
| `scripts/verify-project-import.mjs` | Safe bounded complete verification and cleanup |
| `docs/release-3-phase5-verification.md` | This report |

Modified: `src/db/schema.ts`, `drizzle/meta/_journal.json`, `src/projects/validation.ts`, `service.ts`, `http.ts`, `src/components/project-editor/ProjectEditor.tsx`, `ProjectTeam.tsx`, `src/app/student/project-invitations/page.tsx`, `tests/frontend/project-editor.test.tsx`, `project-team.test.tsx`, and `tests/unit/database-security-hardening.test.ts`. The larger working-tree diff contains preserved Phase 1–4 work; it is not all new Phase 5 work.

## Official requirement and fixture mapping

| Item | Evidence |
| --- | --- |
| R3.01–R3.03 | Existing Add Project manual path plus explicit editable GitHub review/application and manual recovery |
| R3.04/R3.26 | Normalized repository associations independent of canonical ID; zero/multiple/change regression |
| R3.05/R3.08–R3.11/R3.15 | View/join alternative integrates standard-role invitations, recipient consent and existing owner-controlled evidence |
| R3.14 | No imported language or project technology writes personal skills |
| R3.16 | Exact warnings, advisory names, public view/join, fresh creation recheck, explicit distinct continuation and no merging |
| R3.17/R3.24 | Request/project version checks, serialized repository creation and server-derived authorization |
| R3.23/R3.25 | Desktop/390px imported/manual/collaboration workflows and full applicable legacy/privacy/inquiry regressions |
| `exact_repository_duplicate` | XR Anatomy Lab repository match warns and offers eligible public actions |
| `similar_title_different_repository` | XR Anatomy Learning Lab produces advisory similarity; distinct creation succeeds without merging |
| `same_title_different_domain` | XR Anatomy Lab in Art / Visualization with the other repository is allowed as a separate ID |

All three cases are read from the official fixture in automated integration tests. The fixture and course documents themselves remain unchanged.

## Database identity and migration evidence

Only new Docker PostgreSQL 18.6 containers were used, with random dedicated credentials, localhost-only ports, unique run labels/cluster names and tmpfs data. Passwords were kept in process environment and never printed. Before migration/test operations the runner verifies exact container ID/label/binding plus database/user/server-port/cluster identity. Every database environment variable in build/test/server subprocesses is overridden; no development, production or Supabase database is selected. Normal environment files are unchanged.

| Attempt | Container | ID / localhost port |
| --- | --- | --- |
| Startup-only failure | `immx-phase5-df4fee94931e` | `c38cac9bcbf720c0ceb18c876ada591f39ec76ad8020b8275cdb5a88349f88e0`; stopped before migrations |
| First complete pass | `immx-phase5-a74f2b832838` | `02fd29a37baa42f7b2cbe6e5af20928e792a8579dd87854adff6c8c3e8440cf8`; 55407 |
| Final verification | `immx-phase5-9deecad700c3` | `b17a413e42d023be8a8b9e9430b00dc8e512ce6b92b445909860531f1e539ef4`; 54570 |

Final user/DB prefix: `phase5_9deecad700c3`; separate `_fresh`, `_upgrade` and `_guard` databases. Final cluster name equals the container name. Published address is always `127.0.0.1`, container server port 5432. Image ID: `sha256:979bccfde35445db618c65107d27d08c6c21339d8dc3ad4c830c6633947be0e4`.

Fresh migrations 0000–0010 completed with eleven journal entries. A separate database migrated through 0009 (ten entries), seeded representative legacy students/projects/contributors/inquiries and an account-owned maintained project at version 7 with profile, accepted membership, repository and versioned hidden personal contribution, then applied 0010. Final rehearsal compares full JSON snapshots of all those existing rows, including project ownership/version and personal visibility. No historical data changed. Existing legacy projects remain published/unmanaged/version 1; project-only inquiries still work. New-table live RLS/ACL and state-check tests complement the existing security suite.

## Commands, tests and cleanup

```powershell
npm run typecheck
npm run lint
node node_modules/drizzle-kit/bin.cjs check
git diff --check
node --import tsx scripts/verify-project-import.mjs --run-disposable
```

The driver alone owns database creation, identity checks, migrations and cleanup. Its child commands use only the verified isolated environment: Vitest targeted integration/API groups with `--maxWorkers=1 --reporter=verbose`; `next build`; Vitest excluding integration for the full unit/frontend group; and the complete Playwright matrix. Deadlines are enforced for every test/build command. GitHub traffic is intercepted deterministically through a Node preload only in the disposable verification process; application code has no mock-upstream switch. Unknown GitHub fixture routes fail rather than contact the public API. Unit/HTTP tests additionally inject mocked transports.

| Check | Actual final result |
| --- | --- |
| Typecheck, lint, Drizzle metadata, diff check | Passed |
| Targeted import/team/manual/domain-security/fixture/inquiry integration | 73 passed in six files |
| Existing directory/profile/project/private-profile API regression | 63 passed in four files |
| Full unit/frontend | 215 passed in 29 files |
| Production build | Passed |
| Full desktop/mobile browser matrix | 123 passed, five intentional skips, 128 entries; 4.5 minutes |

The first complete run passed 135 database/API tests, 213 unit/frontend tests and 123 browser tests, with five intentional desktop skips for 390px-only checks. Review then fixed comma-separated technology editing and improved suggestion-cancel/draft preservation checks; added legacy repository coverage; strengthened upgrade snapshots; and added actual new-tab public viewing and review/warning screenshots. Final totals: **136 database/API tests, 215 unit/frontend tests and 123 browser tests passed, with five intentional browser skips**. No final checks failed, no selected integration/unit cases were skipped, and no child command timed out. Both new viewport journeys passed the no-browser-page-errors assertion. The nine new API cases include the official fixtures, live concurrent creation, hidden matches, legacy repository assets, two-step joining, permission boundaries and database RLS/state constraints.

Final cleanup verified the exact run label before removing the created container/volumes. A subsequent Docker label inventory was empty. All three attempt containers were removed; existing resources were untouched. Preservation checks confirmed 83 pre-existing untracked inputs and all SQL migrations unchanged across the final run. Final diff review found no unrelated Phase 5 changes; earlier uncommitted work remains preserved. The architecture/requirements document and 0008 migration hashes also match prior-phase values.

Sanitized full commands/results are retained in `tmp/phase5-verification-last.log`; earlier run evidence remains in `tmp/phase5-startup-attempt.log` and `tmp/phase5-verification-first-pass.log`. Desktop and 390px suggestion-review, duplicate-warning and joined-project screenshots were captured under `test-results/project-import-GitHub-sugg-4cb53-pendent-contributor-consent-{desktop,mobile-390}/`. Both viewport review/warning screenshots were visually inspected for layout, labels, wrapped actions and draft preservation. The browser journey also opens the real canonical public page from View Project and checks the original draft remains available.

The initial container reported PostgreSQL starting up after its internal readiness command. No migration ran on that unverified connection; its exact labeled container was removed. The runner now bounds TCP identity retries for recognized startup/connection errors and still aborts immediately on identity mismatch. No test assertion was weakened, no existing cluster was started, and no runner hang was accepted. As in earlier phases, Next can log `The destination stream closed early` during regression navigation; this is recorded separately from the new browser journey's no-page-errors assertion.

## Remaining limits and Phase 6 handoff

Unauthenticated GitHub requests share upstream rate limits; the UI handles these failures without blocking manual creation. See [GitHub's rate-limit documentation](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api). There is no token reuse, added OAuth scope, private-repository import, redirect-following, repository browsing, README import, GitHub contributor mapping or automatic skill inference.

Title similarity is intentionally simple and checks up to 250 public same-domain candidates; exact structured repository matching remains indexed and is independently rechecked. Legacy repository assets normalize on read. Join requests are retained once per project/profile, including declines; they do not silently resend invitations or restore removed relationships. Existing consent/removal/transfer services remain authoritative.

The playable demo/fallback player remains Phase 6 work. A live public repository import example, hosted demo/fallback, consenting two-human public project, deployment, final release notes/submission/adapter and R3-submission tag are still release evidence gaps. Deterministic synthetic tests do not replace those public examples. No concrete architecture blocker to Phase 6 has been found, subject to review.

Branch/HEAD and configured author are preserved: `feat/release-3`, `4c8a64d7313c1401889ae97a1223090d059008de`, Jash Sojitra `<jash221434@gmail.com>`. Existing documents, fixtures, uncommitted implementation and R1/R2 tags remain intact. No commit, push, deployment or tag was made.
