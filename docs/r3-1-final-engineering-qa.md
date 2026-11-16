# R3.1 final engineering and peer QA handoff

This is the preserved remote-worker report. Final local integration reviewed its six-file patch, added no application changes, and passed 64 targeted tests plus typecheck/lint. See [local integration report](r3-1-final-local-integration.md) for current commits and authorization. Worker-local logs referenced below were not returned; their results are attributed to the worker. Local results are separately verified. A new independent reviewer was not launched during integration; GitHub release review remains outstanding.

2026-11-15. Source branch: `feat/r3-1-xr-studio`; actual PR: **#9**, target `main`. Production URL: `https://immxrsive-talent-platform.vercel.app`. No production service, database, credentials or GitHub write was used. This worker snapshot's Git SHA is not production provenance. R3.2 AutoDemo is excluded.

## Disposition

**GO for patch review and PR preparation; NO-GO for production.** No new reproducible application defect was found in the inspected paths. Do not infer complete security certification from this bounded review. Final independent review of these new tests/documentation remains a caller integration step; this worker did not launch another paid worker or claim self-review as independent review. Existing independent security/dependency reviews remain in the supplied evidence.

Added five executable frontend regressions: three staff-role cases prevent owner impersonation and enforce curator/admin action differences; exact saved-revision acceptance excludes unsaved edits even when the owner is also staff; first submission uses canonical revision and subsequent withdrawal uses the returned submission revision. No application or security policy change was needed. Older Studio documentation incorrectly described a new branch, untested migration and unresolved historical audit; it now links current evidence. The original guide is retained in `docs/archive/r31-final-20261115/r3-1-xr-studio-before.md`.

## Actually executed here

Node 22.22.0, npm 10.9.4; no runtime dotenv loading. Initial `npm ci --ignore-scripts --no-audit --no-fund` failed because the default `/home/codex-worker/.npm` cache was unwritable. Retry with `--cache /tmp/immxrsive-r31-final-npm` passed, installing 500 packages without manifest/lock edits. Installation warnings concerned deprecated esbuild-kit and ESLint 9. Do not bypass integrity checks to resolve installation errors.

| Check | Actual result |
| --- | --- |
| Selected Vitest baseline, 11 files | 126 passed, zero failures/skips |
| Updated Studio frontend file | 7 passed, zero failures/skips (2 overlap baseline; 5 new) |
| `npm run typecheck`, repeated after new tests | PASS, exit 0 |
| `npm run lint` | PASS, exit 0 |
| `sha256sum -c docs/r3-1-audit-migration-sha256.txt` | All 24 files match |
| `git diff --check` | PASS |

**131 distinct tests passed** across the overlapping runs; do not sum the two runs as unique coverage. Baseline selection: `tests/unit/{studio-policy,studio-http,project-evidence-url,project-validation,public-project-layout,talent-route,talent-query}.test.ts` and `tests/frontend/{studio-review,talent-directory,student-sign-in-page,project-demo}.test.tsx`.

Logs are worker-local `/tmp/immxrsive-r31-final-{install,tests-baseline,studio-tests,typecheck,lint}.log`; they are not portable artifacts. Durable results are recorded here. No full suite, integration/database, Docker, build or browser run was performed in this job. Those checks require disposable infrastructure and heavier execution through the caller's lab dispatcher `ld`; this job does not warrant rerunning the whole previously completed matrix. Run the changed frontend file plus typecheck/lint after integration. If integration changes application/dependency/migration behavior, dispatch the affected database/browser/build checks through `ld` before release. Hosted/manual QA remains mandatory regardless.

The supplied [Windows dependency validation](r3-1-dependency-validation-final.md) separately records **614 passed**, zero failures, five intentional desktop exclusions, successful migration/build/type/lint and both clean audits. That historical matrix was not rerun here.

## Security, privacy and migration review

Inspected Studio policy/service/HTTP/detail/queue/review UI, migration 0011 and existing security/concurrency tests. Authorization derives from the session actor and current database grant/maintainer, with strict input schemas. Staff cannot supply owner consent; curators cannot publish/moderate. Owner acceptance applies to the saved content revision. Suggestions invalidate acceptance/review; publication additionally requires approved state, current owner/canonical revision and public canonical status. Canonical edits/transfers/unpublication hide stale public output. Acceptance clears publication; withdrawal/moderation retain history.

Private detail holds project then actor-grant share locks through history retrieval; queue holds its actor grant through retrieval. Existing six PostgreSQL concurrency tests cover authorization-change ordering and lock lifetime; they passed in prior local evidence, not this worker. Public projection excludes internal actors, notes, grants and history. No impersonation endpoint, role escalation or new grant was introduced.

Migration 0011 remains byte-identical: restrictive foreign keys, version/acceptance/publication checks, current-owner/provenance trigger, append-only UPDATE/DELETE/TRUNCATE guard, deny-by-default RLS and revoked browser privileges. Role assignment uses invoker rights, serialized grants and last-super-admin protection. Its actor argument is trusted operational input, not authentication; never expose it as browser RPC. Backend table-owner/BYPASSRLS access and direct privileged operators remain trusted boundaries. No historical SQL was modified.

Residual limits: unpaginated pilot queues/gallery; manual long-content/mobile/screen-reader QA; product confirmation of canonical title/description visibility to reviewers after withdrawal. These remain documented gates, not newly demonstrated vulnerabilities.

## Issue dispositions and precise retest

**#3 remains open for genuine human evidence.** Automated shared-project acceptance cannot establish two real contributors. Two consenting humans must use distinct real identities, accept the same canonical project through normal invitation/join flows, and independently confirm their actual roles/statements/public visibility. Record only consented public project/profile URLs, deployed SHA, date and sanitized acceptance evidence. Obtain the official R3 adapter/schema or explicit instructor acceptance of an alternative and reconcile assessed tag/deployment provenance. Do not invent identities, approvals, technologies or historical evidence; preserve `R3-submission`. Use the [human checklist](release-3-closure-human-checklist.md), subject to current immutable-tag instructions.

**#5 remains a maintainer data correction, not a reproduced mapping defect.** The earlier read-only API observation for `02bf74ba-fe2a-4707-9b62-30d45fc08b01` recorded a playable URL ending `.vercel.ap/`, `technologies: []` and no fallback. This job did not reread production; the observation may no longer be current. Public projection maps persisted technologies/media directly. HTTPS syntax validation cannot certify DNS/reachability; silently rewriting URLs or requiring invented technologies is inappropriate. Existing URL and media validation tests passed; no new restriction is justified by the evidence.

After explicit production-edit authorization, the actual maintainer must sign in normally and open `/student/projects/02bf74ba-fe2a-4707-9b62-30d45fc08b01/edit`. Confirm the intended playable destination before replacing `.vercel.ap` with `.vercel.app`; confirm actual technologies from the repository; add independently useful, accurate fallback evidence using an owner-approved public HTTPS asset or the reviewed `/fixtures/r3/fallback.svg`. Verify that the chosen fallback actually exists on the deployment. Save through the normal maintainer UI and preserve the canonical ID, ownership and contributor records. Do not use staff impersonation or direct SQL. Saving a published project changes its public data and invalidates Studio approval; reacceptance/republication must follow normal consent/review rules.

Retest after saving: reload the editor to prove persistence; inspect the signed-out `/api/v1/projects/02bf74ba-fe2a-4707-9b62-30d45fc08b01` and `/projects/02bf74ba-fe2a-4707-9b62-30d45fc08b01`; compare exact URL, truthful technologies and independent fallback. Open the playable externally; test fallback independently at desktop/390px and keyboard. A root application URL is intentionally external-only, and an iframe load event is not proof of a working experience. Capture date/deployed SHA and sanitized results before recommending closure. Detailed field instructions remain in [peer QA addendum](r3-peer-qa-addendum.md).

**#4/#6/#7: no demonstrated regression; retain prior closed dispositions.** #4 has case-insensitive canonical skill API and checked/removable UI regressions, with unknown skills producing actionable 400 rather than unfiltered data. Those selected tests passed. #6 has layout tests for unavailable projects, published legacy fixtures and infrastructure-error propagation; they passed. Existing browser tests assert invalid/missing IDs return real HTTP 404 and published fixtures return 200; `manual-project.spec.ts` also asserts private/unpublished HTML/API 404. Browser assertions were inspected, not rerun. #7's release-neutral `Student access` frontend assertion passed. Confirm deployed behavior only after an authorized release; do not reopen/close GitHub issues based solely on this snapshot.

## Dependencies and production gates

No compatibility defect found in the inspected dependency update or executed checks. Retained full/production audit JSON both contain zero vulnerabilities; no fresh online audit was run here. Preserve the existing six Next advisory dispositions: five lack required application features, while the installed MCP origin guard has five prior executable assertions. Numeric vendor fixed-floor metadata remains follow-up, not a new claim that every advisory has a confirmed vendor patch floor. Reassess if features/framework/origin settings change. Better Auth's documented hoisted/nested core versions and scoped esbuild/minimatch overrides retain their prior exercised compatibility evidence.

Exact worker LF hashes: package.json `cb2d1b188976cd622da5ad38c8ba1cdec22996d069c17a6bd5ea4a210c425313`; package-lock.json `5820dcbcb3f6d90d903b0c71a7171f62e7c5cd7ee822997ecb8770a40a1d65a9`. Converting LF to CRLF reproduces both hashes recorded in the Windows report exactly; this is line-ending transport, not dependency drift. Neither file changed here.

Production remains **NO-GO** pending hosted Node/Linux native runtime verification; authenticated owner/contributor/curator/admin/super-admin/revoked-role lifecycle and populated mobile/accessibility QA; withdrawal consent-scope confirmation; verified hosted identity/journal/checksums/effective grants; encrypted backup and timed restore evidence; compatible rollback rehearsal; and separate migration/bootstrap/deployment approvals. Course evidence #3 and maintainer correction #5 remain separate unresolved peer QA requirements. Do not claim they were resolved by the 614-test baseline.

The exact ordered preflight, backup, bootstrap, deployment, persona QA and rollback procedures are in [release readiness](r3-1-release-readiness.md). Freeze the caller's approved real SHA; reconcile actual journal through 0010 or verify already-installed 0011 before applying anything; stop on drift/partial objects or unsafe grants; never use test migration commands against production. Roll back the application to the rehearsed compatible build while retaining additive 0011 tables, submissions and append-only audit. No down migration, journal rewrite, audit deletion or tag movement is authorized. Whole-database restore requires separate approval and explicit data-loss assessment.

## Patch integration

Return the snapshot's changed/new files as one patch. No commit/push was made. On the caller's existing branch, preserve unrelated changes and verify the patch manifest; use `git apply --check` before application, adapting only reviewable line-ending conflicts. Obtain independent final Codex review, run the targeted checks above and verify immutable migration/tag/dependency content. Record the resulting actual commit only in the caller's normal approved workflow. Update PR #9 with [prepared description](r3-1-pr-description.md). Integration, commit, push, ready-state/merge, issue updates and production actions were not performed here.
