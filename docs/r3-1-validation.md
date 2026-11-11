# R3.1 patch validation — 2026-11-06

This report is for the sanitized Codex remote snapshot only. The original repository has not been changed. No commits, pushes, migrations, accounts, permissions, release tags or deployments were changed. No production endpoint was contacted.

## Results

| Check | Passed | Failed | Skipped / unavailable |
| --- | ---: | ---: | --- |
| Final lint (`npm run lint`) | 1 command | 0 | 0 |
| Final typecheck (`npm run typecheck`) | 1 command | 0 | 0 |
| Final build (`npm run build`) | 1 command | 0 | 0 |
| Standard unit/frontend (`npm test`) | 261 tests, 34 files | 0 test cases; 1 suite setup failure | 8 resume cases skipped by failed setup |
| Unit/frontend excluding unavailable resume fixture suite | 261 tests, 34 files | 0 | 0 in selected suite |
| New database suite | 0 | 0 | 10 tests / 1 file skipped: TEST_DATABASE_URL absent |
| Existing R1–R3 database suites | 0 fresh executions | 0 claimed | Not run: no disposable identity-verified PostgreSQL |
| Browser suites / keyboard / 390px | 0 fresh executions | 0 claimed | Not run under the same database gate |
| Independent Codex review | Re-review found no further clear defects | 0 remaining findings | Static review only; no DB/browser evidence |

The standard test command exits 1: `tests/unit/resume-extraction.test.ts` cannot open `data/fixtures/r2/resume_clean_single_column.pdf` in its beforeAll setup. All eight cases are reported skipped, not passed; the suite itself fails. These inputs were excluded from the sanitized transfer. They were not recreated or fetched. The selected-suite rerun explicitly excluded only integration tests and that missing-fixture suite, without changing project test scripts or weakening assertions. This run is not a substitute for the complete suite in the caller's original environment.

Commands used the unchanged project dependencies with a temporary Node 22 runtime via `npm exec --cache /tmp/r31-npm --yes --package=node@22 -- ...`. Initial install with system Node 18 failed due to engine/cache restrictions; retry used temporary Node 22 and npm 10 with `npm ci --cache /tmp/r31-npm --ignore-scripts`. No manifest/lockfile changes resulted. Install reported 19 existing advisories (15 moderate, 3 high, 1 critical); no remediation or production dependency audit is claimed.

New executable unit/frontend coverage: 30 tests for role/owner boundaries, transition restrictions, reason requirements, client escalation-field rejection, evidence URL rejection, stale approval visibility, accessible field labels and recoverable revision conflicts. The 10 database cases are authored but unexecuted: private submission/IDOR, staff publication boundaries, suggestions and owner approval, withdrawal/resubmission, optimistic concurrency/audit rollback, owner transfer/project changes, moderation and append-only events, changes/rejection, RLS/revocations. Existing unit/frontend tests cover R1–R3 regression only to their existing scope; no end-to-end regression claim is made.

Independent review found one P2 display issue: stored publication/approval flags could disagree with effective public visibility after a canonical edit, transfer or unpublication. Fixed via current-owner/revision/status-aware display flags and regression coverage. Acceptance also explicitly clears publication so staff must republish. Final re-review found no additional clear defects. No additional remote client or paid third-party API was invoked for review; worker review used the existing Codex collaboration facility. Separate review token accounting was not exposed by that facility.

## Patch inspection and remaining gates

- No new dependencies, secrets, private user data, credentials, environment files, generated build output or unrelated source files included. New test identities are generated synthetic example.test accounts, never production accounts.
- Historical migrations 0000–0010 and their snapshots are unchanged. Journal has exactly one appended 0011 entry. Schema snapshot is new generated metadata; custom SQL triggers/functions are explicitly retained in 0011.
- Migration generation completed. RLS and revocations cover every new table. Static source-coverage test now includes 0011; historical hardening checksum assertions remain intact.
- Patch whitespace and path/manifest checks passed. Secret-pattern inspection found no private-key, database-URL credential, API-key or GitHub-token matches in changed files. This is targeted inspection, not a comprehensive external secret scanner.
- Block rollout until disposable PostgreSQL migrations, trigger/role tests, browser/accessibility/mobile checks and the missing resume tests pass. Confirm actual assessed baseline, migration state and production setup separately. R3 submission evidence gaps are preserved, not solved by this patch.
- Application remains pending explicit approval on a proposed local `feat/r3-1-xr-studio` branch. The worker creates no branch and performs no integration. See `r3-1-xr-studio.md` for setup/rollout and `r3-2-autodemo-architecture.md` for the non-executable design proposal.

## Exact changed-file manifest

23 files; all paths relative to the repository root.

- `docs/r3-1-validation.md`
- `docs/r3-1-xr-studio.md`
- `docs/r3-2-autodemo-architecture.md`
- `drizzle/0011_r31_xr_studio.sql`
- `drizzle/meta/0011_snapshot.json`
- `drizzle/meta/_journal.json`
- `src/app/api/studio/[projectId]/route.ts`
- `src/app/api/studio/route.ts`
- `src/app/showcase/page.tsx`
- `src/app/student/projects/[projectId]/showcase/page.tsx`
- `src/app/student/projects/page.tsx`
- `src/app/studio/[projectId]/page.tsx`
- `src/app/studio/page.tsx`
- `src/db/schema.ts`
- `src/studio/DetailPage.tsx`
- `src/studio/Review.tsx`
- `src/studio/http.ts`
- `src/studio/policy.ts`
- `src/studio/service.ts`
- `tests/frontend/studio-review.test.tsx`
- `tests/integration/studio.test.ts`
- `tests/unit/database-security-hardening.test.ts`
- `tests/unit/studio-policy.test.ts`
