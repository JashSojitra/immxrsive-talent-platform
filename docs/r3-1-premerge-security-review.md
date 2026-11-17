# R3.1 pre-merge security review — 2026-11-12

## Decision and provenance

**GO for a final reviewed commit/PR; NO-GO for production until the remaining release gates are satisfied.** One confirmed medium/P2 privacy defect repaired; no critical/high defects confirmed in the inspected XR Studio source. The independent source audit is now supplemented by the local Windows matrix below; production configuration and operations are not certified.

Caller identifies repository `JashSojitra/immxrsive-talent-platform`, source `feat/r3-1-xr-studio` at original HEAD `388497c`, target `main`. The supplied sanitized transport commit is not that original HEAD. Historical R3.1/stabilization reports remain historical evidence; their older branch/deployment instructions do not supersede this task. No production/staging service was contacted, no GitHub issue was changed, and no real staff account was created; credentials were not loaded into validation runtimes or disclosed. The remote audit performed no commit, push, merge, tag, migration, deployment or bootstrap. This local pass ran disposable migrations only; no production operation occurred. Existing `R3-submission` must remain immutable. R3.2 AutoDemo is excluded.

Independent review actually performed: a separate Codex collaboration agent, `gpt-6-astra`, high reasoning, reviewed Studio, auth, related project/team locking, SQL and tests, then independently reviewed the final service/test changes. It confirmed the finding and found no further blocking source defects. This was an independent agent/model pass, not a separate external API call or a database execution. The collaboration facility does not expose measured per-agent quota/token usage; no percentage or actual usage is invented. User-requested independent review authorized the pass. User-level `subagent-use`, `service-use` and `lab-dispatch` procedures are not installed in this snapshot; no external account operations were attempted. No project MEMORY.md or local project AGENTS.md was supplied.

## Local integration and Windows verification — 2026-11-13

Verified original branch `feat/r3-1-xr-studio`, exact baseline `388497c2b5d99f402071af9e79311c4fe7a6f5bd`, and immutable `R3-submission` target `cadaa1301583ea9884ebf3c8ffa16529d7d1792f`. The reviewed seven-file remote patch applied cleanly. The service repair is unchanged from that patch; this local pass added three reverse-order lock-lifetime tests in the same integration file. No code outside the seven-file manifest changed.

The user's explicit authorization for local Windows execution superseded the sanitized worker's `ld` handoff. The original checkout's `.env.local` was preserved. Validation used a separate worktree at the same baseline, without runtime dotenv files, with matching application/test content (Git checkout LF/CRLF differences only; all seven patch files match byte-for-byte), the unchanged safe runner, fresh labelled loopback-only PostgreSQL 17 resources and synthetic auth/email settings. The existing Docker container `immxrsive-r31-test-db` was preserved and never used by these tests.

| Local check | Actual result |
| --- | --- |
| Targeted security selection | 58 passed, six files, zero failures/skips |
| Targeted Studio integration | 21 passed, including all six concurrency races, zero skips |
| Complete unit | 200 passed, 23 files |
| Complete frontend | 100 passed, 16 files, including original resume-PDF fixtures |
| Complete integration | 179 passed, 14 files; Studio 21/21; zero skips |
| Browser desktop + 390px | 135 passed; five unchanged desktop exclusions for mobile-only cases; zero failures/flakes/top-level errors |
| Migrations / typecheck / lint / production build | PASS |
| Runner / disposable cleanup | Exit 0 / PASS |
| Source and scope | Whitespace check PASS; all 24 migration SQL/metadata files unchanged; protected files and tag unchanged |

Count drift from the original baseline is intentional: nine HTTP cases add 191 → 200 unit cases; three remote plus three local concurrency cases add 173 → 179 integration cases. Focused and complete counts are overlapping coverage, not additive unique tests. All six concurrency cases ran in both focused and complete integration checks. The five browser exclusions are unchanged desktop-only copies of mobile scenarios in inquiry, project-detail, release-1-acceptance, student-profile and talent tests; each scenario runs on mobile.

Initial infrastructure failure: the copied dependency installation lacked npm's hidden lock marker, so runner preflight stopped before tests and cleaned up its container. A single locked `npm ci` in the isolated worktree repaired the installation. Focused checks and the full matrix then passed without dependency/version edits or browser reinstallation. No application/test failure remained. Non-failing React destination-stream cancellation warnings remain visible in browser logs.

Full logs: `C:/Users/JASH2/AppData/Local/Temp/immxrsive-r31-results-1dd3714792b842fbbe47461c10641bd9`. Focused logs: `C:/Users/JASH2/AppData/Local/Temp/immxrsive-r31-results-80af3e1a6efd4a8983505e4b34aa2b57`. Setup failure: `C:/Users/JASH2/AppData/Local/Temp/immxrsive-r31-results-01fff0a508474d47be226c60328a59e9`. Local source/resource audit and dependency JSON: `C:/Users/JASH2/AppData/Local/Temp/immxrsive-r31-security-local-16d6ed5957404934bbd7272a44de5275`. Results and browser artifacts remain outside Playwright's disposable output.

### Lock and privilege review

Detail locks project then actor grant, matching command order, and keeps both through submission/history retrieval. Queue locks the actor grant and uses an ordinary MVCC join without project-row locks. The operational role function locks grants and writes a role event with no project dependency. No new cycle was found in those paths; no deadlock occurred in the tested interleavings. These locks retain the existing trusted-backend privilege requirement; browser grants/RLS were not relaxed. Unbounded queues/history can still delay writers, so this is not load or arbitrary-DBA-transaction certification. Lock semantics were checked against [PostgreSQL 17 locking documentation](https://www.postgresql.org/docs/17/explicit-locking.html).

The three local read-first tests hold a test-only table lock at private history/queue retrieval, observe the authorization writer waiting in `pg_stat_activity`, release retrieval, require both operations to finish and then require 404/403 for the former owner/staff member. They protect against accidentally replacing the transaction with independent autocommit locking queries. Existing denial, optimistic concurrency, audit immutability, RLS/grant and role-management checks also passed.

### Current dependency gate

Read-only `npm audit --omit=dev --json` exited 1 with 11 affected-package entries (seven moderate, three high, one critical). Its output includes tooling chains; this is not a count of proven production-exploitable issues. The locked runtime includes Next 16.3.8, Zod 4.6.5, Nodemailer 10.1.0 and Undici 7.30.0. No dependency fix or broad upgrade was mixed into the seven-file Studio patch.

For the [Next image-optimization advisory](https://github.com/advisories/GHSA-2464-fhr4-w9xw), installed Sharp 0.35.5 meets the documented workaround; Windows verification does not certify the Linux production path. No application `use cache` function was found for the [typed-array cache advisory](https://github.com/advisories/GHSA-673q-mjm6-r5xr), but the maintainer still recommends upgrading. The [Zod constrained-collection advisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) affects the locked version; Studio's existing bounded JSON input is retained, but all application/deployment paths were not certified. Dependency remediation or explicit, evidence-based disposition remains a production blocker alongside manual persona/accessibility QA, backup/restore, hosted privileges and separate deployment/migration approval. No exploit was run and no production environment was contacted.

## Feature architecture and authority

- Better Auth GitHub sessions supply internal `auth_users.id` through `src/auth/server.ts`; roles are read from `studio_roles` on each operation, independently of session profile metadata and affiliation. Seven-day sessions do not preserve a revoked staff grant.
- `src/studio/policy.ts` provides strict command/content schemas, allowed transitions and effective visibility. `src/studio/service.ts` enforces ownership, roles, optimistic submission revision checks, atomic updates and audit insertion. `src/studio/http.ts` reuses project JSON/origin/size/error boundaries.
- Current student-origin project maintainer owns submit/resubmit/withdraw/accept rights. Contributors do not inherit maintenance or showcase consent. Existing R3 invitations, contribution evidence and transfer acceptance remain separate. Staff cannot edit contributors or grant owner consent. Owners retain showcase-response rights if affiliation later lapses.
- Curators review, request changes, reject, suggest and approve. Admins and super-admins also publish/moderate. Super-admin role management is a privileged operational SQL function; there is no assignment HTTP endpoint. Staff may review their own project if also owner: no four-eyes policy is implemented or claimed.
- Staff `/studio` queue/detail and maintainer `/student/projects/[projectId]/showcase` use the same authorized service. GET/POST Studio APIs are private/no-store. `/showcase` is dynamic and projects only project ID, approved title/summary and evidence links.
- First submission and owner resubmission approve the supplied showcase revision. Suggestions invalidate both review/owner approval. Review approval never publishes. Admin publication additionally requires unchanged canonical project/version, current maintainer acceptance and canonical publication. Transfer, canonical edits or unpublication hide stale curated output. Reacceptance clears stored publication; admin must publish again.
- Migration 0011 adds roles, one submission per project and events, with restrict FKs, checks, provenance/current-owner trigger, append-only event trigger, invoker-rights role procedure and indexes. All three tables enable RLS, with no permissive policies and browser/public grants revoked. Trusted backend connection is the privileged boundary; RLS does not constrain a table owner/BYPASSRLS DBA. Application audit is not tamper-proof against that operator.

## Confirmed finding

### Medium / P2 — authorization can expire between private reads (repaired)

**Original locations:** `src/studio/service.ts:12–28` (queue and detail). **Repaired locations:** `src/studio/service.ts:12–37`.

**Conditions:** Detail reads project ownership, staff grant, submission and history in separate autocommit snapshots. Pause after the ownership read; complete a maintenance transfer; let the new owner/staff save a new confidential note; resume the former owner's request. The stale ownership decision authorizes the newly created history. Similarly, queue/detail can authorize a staff grant, then read newly created private data after grant revocation commits. Sequential revoke-then-read tests did not exercise this interleaving.

**Impact:** Former owners/reviewers can receive post-revocation private showcase content/history. No write escalation or public publication bypass was found. Requires a concurrent authorization change; this is more than delivery of data already read before revocation.

**Repair:** Read detail in a transaction, holding project `FOR SHARE`, then actor grant `FOR SHARE`, through submission/history retrieval. Queue holds actor grant `FOR SHARE` until its result is read. Transfer/project writers and role deletion/update/operational exclusive role lock serialize with these reads. Lock order matches the existing project-first command path. No new grants, schema changes or public DTO fields.

**Regression:** Three new disposable PostgreSQL cases in `tests/integration/studio.test.ts:107` hold an uncommitted transfer or revocation, observe the reader waiting for `FOR SHARE` via `pg_stat_activity`, commit the authorization change and require 404/403. Original unlocked reads should fail the waiting assertion. All three were executed locally. Three additional local read-first regressions prove authorization locks remain held through private data retrieval. All six passed in targeted and complete integration runs. No claim of production exploitation; the observed lock-wait regressions used fresh disposable PostgreSQL only.

## Audit coverage and conclusions

| Area | Source evidence and result | Practical limit |
| --- | --- | --- |
| Authentication / forged actor | `auth/server.ts`, `studio/http.ts`: actor comes from authenticated request; HTTP test records session actor passed to service | OAuth/cookie deployment not exercised |
| Role hierarchy / IDOR / assignment | `policy.ts`, service project origin/maintainer/grant checks; unrelated/private-unsubmitted reads denied; strict JSON rejects role/owner/published fields | No new formal rate limiting or enumeration guarantees |
| Revocation / stale sessions | Fresh grants per call; write grant share lock; repaired private read locks | Six real concurrency regressions passed; production grants unverified |
| Maintainer transfers | R3 project row locks/version bumps; current owner acceptance/public predicates invalidate previous approval | Transfer/revocation regressions passed locally; no production exercise |
| Student/contributor consent | Studio never mutates membership, contribution, invitation or canonical project records; owner actions require current maintenance | Arbitrary curated prose requires human privacy/content review |
| Submit/withdraw/resubmit | Explicit state map; withdrawn content hidden and cannot be reviewed/published until resubmitted | Withdrawal retains review/audit records by design |
| Review/reject/changes/approval | Required reasons and explicit transitions; suggestions change content revision and reset approval | No reviewer independence enforcement |
| Publication/moderation | Admin-only; current owner/content/project acceptance and canonical public status; withdrawal/moderation hide gallery | External links are not destination-safety certified |
| Concurrency / atomicity / lock order | Project → role → submission for commands; transaction update + event; optimistic revision rejects duplicate commands | Local lock/trigger tests passed; arbitrary workloads/DBA transactions not certified |
| Audit integrity | Same-transaction snapshots; SQL blocks UPDATE/DELETE/TRUNCATE; restrict FKs prevent silent erasure | Privileged DBA can alter schema; no cryptographic ledger |
| RLS / client privileges | 0011 enables RLS and revokes PUBLIC/anon/authenticated table/function access, no policies | Hosted inherited/default grants and actual runtime role require inspection |
| Privileged SQL | `assign_studio_role` invoker rights, fixed search_path, exclusive grant lock, role validation, last-super-admin protection and event | Actor argument is trusted operational input, not authentication; never expose as RPC |
| Schema / compatibility | Additive 0011; provenance and acceptance checks; restrict auth/project/event FKs | Account/project hard deletion may be blocked intentionally; rehearse old-app compatibility |
| Safe links / public projection | Existing safeEvidenceUrl used on input/render; HTTPS/credential/local-address filters; allowlisted course fixture paths; escaped React text and rel=noopener/noreferrer | Outbound URLs are not fetched by Studio; DNS/reachability/malicious HTTPS sites not certified |
| CSRF / validation | Exact configured origin, cross-site fetch rejection, JSON and 64 KiB stream cap; strict Zod schemas | Correct BETTER_AUTH_URL remains an operational prerequisite |
| Errors / privacy | Private no-store responses; generic 500 without SQL internals; showcase excludes actors/history/contributors | Private authorized DTO includes internal actor IDs; access/log handling matters |
| Accessibility / keyboard | Labels, native buttons/details, status live region, shared focus styles and skip link | Current browser smoke exercises anonymous + empty gallery, not authenticated staff lifecycle |
| 390px / reduced motion | Shared wrapping/responsive CSS, motion component and reduced-motion handling | Populated long-content layouts, keyboard/focus and real devices require fresh QA |
| R1/R2/R3 regression | Shared HTTP, evidence, safety and DB-security tests selected; no changes to existing project/auth/public APIs | Complete local Windows matrix passed; live deployment unverified |
| Coverage / skips | Added 9 HTTP cases and 6 concurrency cases, no new skips/retries/only or assertion suppression | Original tracked resume PDFs were present and exercised locally |

## Risks distinguished from defects

- Staff can read current canonical title/description for a project with a retained submission, including withdrawn submissions. Existing docs explicitly allow submitted-project review/history; UI speaks of reviewing showcase text. This is a consent-scope ambiguity to clarify with the product owner, not a proven unauthorized-access defect under the documented rules. Withdrawal is not audit erasure.
- Queue/gallery/history are unpaginated. Acceptable only for a bounded pilot with monitoring; large-scale exposure needs bounded pagination and query/load evaluation. New share locks can delay transfers/revocations during long authorized reads; keep reads bounded and monitor contention. No load certification.
- The historical advisory count is superseded by the current local audit and disposition above. Current dependency remediation/risk disposition is still a production gate; no dependency upgrade was performed.
- Migration function reason validation is operational, and direct trusted DB writes can bypass application state semantics. Untrusted roles must not receive table access/function execution or backend credentials. No production grants verified.
- Issues #3 and #5 remain separate R3 evidence/production-data work. Supplied `r3-peer-qa-addendum.md` records #3's missing official adapter/two-human evidence and #5's previously observed misspelled demo URL/empty technologies/missing fallback. No issue/live-data recheck or repair occurred here; do not claim either resolved. Preserve canonical IDs and assessed tag.

## Historical remote worker validation (2026-11-12)

All Node/npm commands used `PATH=/tmp/node-v22.22.0-linux-x64/bin:$PATH` (Node 22.22.0). System Node 18 was inspected but not used for project checks. No runtime dotenv or real credentials were loaded.

| Command | Actual result |
| --- | --- |
| `npm ci --ignore-scripts --no-audit --no-fund --cache /tmp/immxrsive-r31-audit-npm` | Exit 0; 489 locked packages; no package/lockfile edits |
| `node node_modules/vitest/vitest.mjs run tests/unit/studio-policy.test.ts tests/unit/project-evidence-url.test.ts tests/unit/database-security-hardening.test.ts tests/unit/database-safety.test.ts tests/frontend/studio-review.test.tsx` | Exit 0; 49 passed, 5 files; zero failures/skips (pre-repair baseline selection) |
| `node node_modules/vitest/vitest.mjs run tests/unit/studio-http.test.ts tests/unit/studio-policy.test.ts tests/frontend/studio-review.test.tsx` | Exit 0; 39 passed, 3 files; zero failures/skips |
| `node node_modules/vitest/vitest.mjs run tests/unit/studio-http.test.ts tests/unit/studio-policy.test.ts tests/unit/project-evidence-url.test.ts tests/unit/database-security-hardening.test.ts tests/unit/database-safety.test.ts tests/frontend/studio-review.test.tsx` | Final selected run: 58 passed, 6 files; zero failures/skips |
| `npm run typecheck` | Initial run caught nullable role inference introduced by repair; explicit conditional restored Role-or-null. Final run exit 0 |
| `npm run lint` | Exit 0; no warnings/errors |
| `sha256sum -c /tmp/immxrsive-r31-audit/migrations-before.sha256` | All 24 SQL/snapshot/journal files byte-identical to snapshot; baseline hashes in `r3-1-audit-migration-sha256.txt` |
| `git -c safe.directory="$PWD" diff --check` and addition whitespace checks | Exit 0 |

The table above describes the remote worker only. Its 58-case selection was repeated locally; the complete Windows evidence above supersedes its unexecuted database/browser/build gates. The four resume PDFs missing from that sanitized snapshot are tracked in the real repository and were exercised without fabrication.

## Patch manifest and final review

1. `src/studio/service.ts` — transactional authorization-safe private reads; nullable role preserved.
2. `tests/integration/studio.test.ts` — six transfer/revocation race and lock-lifetime regressions after the local additions, no existing cases removed.
3. `tests/unit/studio-http.test.ts` — nine auth/origin/JSON/body-size/error tests; service mocked, so these do not prove database authorization.
4. `docs/r3-1-premerge-security-review.md` — this audit and validation evidence.
5. `docs/r3-1-release-readiness.md` — production approval gates, migration/backup/bootstrap/deployment/QA/rollback and Windows handoff.
6. `docs/r3-1-pr-description.md` — ready-to-paste feature PR title/body.
7. `docs/r3-1-audit-migration-sha256.txt` — exact snapshot migration/metadata hashes.

Final review covers all changed files, imports, nullable DTO compatibility, authorization, public projection, secrets, accidental deletions, test coverage and immutable migration bytes. No historical migrations, snapshots, journals, package manifests, dependency locks, generated/private files, identities, production data or R3.2 files changed. No schema migration required for this hardening patch. The worker transport returns all listed files as one reviewable patch. A secondary Git patch is `/tmp/immxrsive-r31-audit/r31-pre-release.patch`; it is outside the patch to avoid recursive inclusion. Sanitized tool logs also reside in that temporary directory; durable evidence is this report.
