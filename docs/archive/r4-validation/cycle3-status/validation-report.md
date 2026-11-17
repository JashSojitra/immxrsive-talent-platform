# Independent R4 validation / repair — 2026-11-17

**NOT READY FOR PRE-MERGE ACCEPTANCE.** Targeted validation passed after three product fixes and a migration-test repair. Full cumulative tests, production build, actual Playwright execution, hosted imports and human acceptance remain unmet gates. This job followed the explicit worker restriction to targeted checks; no whole build or full test suite was launched. `/usr/bin/ld` is the GNU linker, not the lab dispatcher. No accessible lab-dispatch/service-use skills, agent directory or project AGENTS/MEMORY files were present in the snapshot/home search. The caller must dispatch the heavy runs through its established `ld` workflow; no dispatcher syntax is invented here.

## Provenance and inspection

Real baseline `8bbf9228a7b59602297f3d53697e1ca4a23b66dd` exists locally. Supplied transport HEAD `c6908f57a9579d581c36f9b5bfd7eaf4e402c77d` contains the implementation; it is not a release commit. All 50 supplied inventory entries were read and their original transport bytes checked against the supplied hashes (inventory excludes its own hash). The complete real-baseline source diff, services, route wiring, UI, tests, fixtures, docs and generated schema metadata were reviewed; generated JSON was checked structurally and by schema comparison. Original inventory and changed release records are retained in `docs/archive/r4-validation/`. Historical R3 records remain untouched.

`validation-evidence/candidate.json` records the final executable candidate SHA-256, per-file hashes, all migration hashes and transport/baseline IDs. It excludes documentation to avoid recursive hashes. The complete final patch inventory, including reports and archives, is `changed-files.txt`. Reproduce/verify with `node scripts/validate-r4-candidate.mjs` (or `--write` to refresh after edits). A caller lacking the transport object can still check the baseline/history, candidate fingerprint and inventory; original transport-byte verification is explicitly null in that case. This is not a deployment SHA or tag.

## Confirmed repairs and proof

1. **Cross-company approval reuse:** the deferred relationship trigger accepted company B with an approved association request for company A. A direct transaction regression resolved successfully before the repair, proving the defect. 0013 now checks the associated company against the approved request. Existing approved association writes still pass. Original unapplied 0013 bytes are archived; deploy this corrected migration only after operator verification that 0013 has never been applied. If already applied anywhere, use a new additive migration there instead of changing its historical hash.
2. **Import provenance assigned to an unrelated company:** after applying an import, opening the duplicate warning's existing-company link retained `importEventId`. Saving then attached that pending import to the existing record without explicit application to it. The link now clears the pending import ID. The frontend regression failed before the repair and passes afterwards.
3. **Malformed public partner inquiry ID:** 36 hyphens or 36 hex characters passed the loose character/count regex and reached a PostgreSQL UUID comparison. The query now validates UUID structure before DB access. Three focused regressions failed before the repair and pass afterwards; a real DB malformed-ID check also passes.
4. **Stale migration regression:** the historical test required 0012 to be the final journal entry and failed on R4. It now runs separate disposable databases for upgrades from the 0011 and 0012 prefixes, preserving populated historical rows/ledger and checking 14 final entries and reapplication. No historical migration bytes were edited.

Two repair cycles: application/query regressions, then DB integrity/migration regressions. Final assessment reviewed the repairs and affected results; no additional agent/client was launched. The caller still reviews the returned patch before integration.

## Executed evidence and exact accounting

Node 24.11.1, npm 11.6.2, lockfile install with ignored lifecycle scripts. Project manifests unchanged. Temporary PostgreSQL **17.7**, loopback only, separate disposable test/control and unused runtime identities, 32 MB shared buffers and 20 maximum connections. Nologin `anon`, `authenticated` and compatibility `postgres` roles existed only in this new cluster; no privilege grants were made. No `.env.local`, real credentials, production URLs or remote service data were loaded. The cluster was stopped after each run; test-created databases were dropped by the harness. A first start in a separate tool call was inaccessible from the next sandbox; starting DB and tests within one tool execution repaired that infrastructure issue.

| Run | Actual exit and counts | Evidence |
|---|---|---|
| Initial focused R4/security | 0; 46 passed / 5 files | `r4-tests.txt` |
| New inquiry/UI regressions before fix | 1; 4 failed, 4 passed / 2 files | `regressions-before.txt` |
| Same regressions after fix | 0; 8 passed / 2 files | `regressions-after.txt` |
| First DB attempt across tool sandboxes | 1; 2 failed suites, **0 tests executed** | `integration-initial.txt` |
| Supplied R4 + historical migration on PG17 | 1; 5 passed, 1 failed / 2 files | `integration-before.txt` |
| Company-binding + concurrency regression before SQL fix | 1; 6 passed, 1 failed / 1 file | `relationship-before.txt` |
| Repaired R4 + migration/session/inquiry/project/profile regression | 0; 55 passed / 6 files | `integration-after.txt` |
| Final affected R4 + admin-managed publication regression | 0; 33 passed / 2 files | `integration-final-affected.txt` |
| Final focused unit/frontend | 0; 73 passed / 9 files | `final-focused.txt` |
| Initial and final typecheck / **full lint** | all 0 | `typecheck-final.txt`, `lint-final.txt` |
| Fixture validation | 0; 18 students, 9 projects, 24 skills, 24 contributors | `fixtures.txt` |
| Schema vs 0013 snapshot | 0; zero generated migration statements | command in `commands.json` |
| Baseline/history/inventory validation | 0; 25 historical SQL/snapshot files byte-identical, 13 journal entries unchanged | `candidate.json` |
| Vitest discovery | 0; 149 unit, 109 frontend, 188 integration declarations | `vitest-discovery.json`; **not executions** |
| Playwright discovery | 0; 150 cases / 16 files across two projects; R4 has 6 configured cases | `browser-discovery.txt`; **0 executed** |
| Final whitespace check | 0 | `git diff --check` |

Final candidate coverage is **154 distinct executed passing cases across 16 files**: 73 unit/frontend cases plus 81 integration cases across 7 files. The two final DB runs overlap in the R4 file; count its latest 8 cases once (55 − earlier 7 + latest 8 + 25 admin cases = 81). Earlier runs, repaired failures and the prior author's claimed 165 are not added to this total. These targeted counts do not claim all available tests passed.

The final R4 DB file covers eight cases: staff protection/duplicate/version conflict; ownership/forgery/self-review/repeated decision; suggested company/multiple associations; privacy/current/past/inquiry/audit; exact mocked import provenance/no role grants; cross-company binding; simultaneous duplicate creation/stale edits/decisions; all-nine-table Data API denial/audit DELETE/TRUNCATE/malformed inquiry. Existing regressions executed: `admin-migration`, `admin-session`, `inquiry-api`, `project-detail-api`, `private-student-profile`, `admin-onboarding`. Other R1–R3 files are discovered only.

## Migration and security assessment

0013 creates nine tables, related keys/indexes and an invoker-rights trigger; it does not alter historical rows or grant privileges. 0000–0012 SQL and supplied historical snapshot bytes match the real baseline exactly. The journal retains all 13 old entries and appends idx 13 with an increasing timestamp. 0011 defines `studio_audit_immutable()` reused by 0013; 0012 supplies immutable management mode and preserves independent admin publication. Both populated upgrade prefixes, ledger preservation, reapplication, schema/snapshot parity and new constraint execution passed on PG17. All nine tables have RLS enabled; `anon`/`authenticated` have no table privileges; the trigger function denies anon execution; UPDATE/DELETE/TRUNCATE of audit rows fail. Production runtime-owner privileges, production migration history and backups remain unverified.

Staff mutations check current DB role in transactions; curator is read-only; actor is derived from session. Student requests require verified current student maintainer and immutable student management mode; other owners and self-review fail. Origin/JSON checks, strict payloads, optimistic versions and pending-request uniqueness protect mutations. Concurrent domain creation returns one saved record and one warning; concurrent stale edits and decisions produce one successful transition each. The corrected trigger binds company identity as well as request kind/project/independent decision.

Importer rejects credentials/non-HTTPS/nonstandard ports/private or mixed DNS/IPv6; pins validated IPv4 for TLS connections; declines redirects, non-HTML/compressed responses; caps bytes and total request/DNS time. Mocked network tests exercise these boundaries, not a live public fetch. The IPv4 filter deliberately over-rejects some reserved/range neighbors; manual fallback remains the supported behavior. No DOM/LLM execution; React escapes text; strict schemas cannot grant roles or publication through imported fields. Public companies must be published; collaboration projection omits private entries and strips original details/edges/people from limited ones; public relationship targets are rechecked through existing query filters. Source review plus targeted DB tests support this assessment, not a penetration-test or browser claim.

## Remaining gates and caller commands

Use Node >=22.12 supported by the lockfile. In an `ld`-dispatched isolated job with a new disposable PG17 service, configure distinct loopback `DATABASE_URL` and `TEST_DATABASE_URL` using the established harness; do not load `.env.local`. Then run:

```sh
npm ci --ignore-scripts
npm test
npm run test:integration
npm run build
npx playwright test
npm run fixtures:validate
npm run typecheck
npm run lint
node scripts/validate-r4-candidate.mjs
```

`npm test` covers all non-integration unit/frontend files. The integration runner isolates each file in a new disposable database; the browser runner needs an unused separate test DB, production build, installed Chromium and its OS libraries. Playwright uses one worker; ensure localhost app/DB stay in the same dispatched execution context. Full tests/build/browser are heavy follow-ups required through caller `ld`, not failed executions here. Existing R4 browser scenarios exercise 390px public privacy/inquiry and 1280/768px staff draft/publication; student/curator denial and full student-to-staff decision journeys still require browser acceptance coverage beyond supplied scenarios.

Exact collaboration seed execution with explicit resolved P01/P04/company/account mapping is still pending. Four public HTTPS fixture sources, content hashes after hosting, real staff access instructions, manual importer acceptance, student-to-staff review evidence, screenshots, live URL/deployed revision, immutable R4 tag and Moodle receipt remain pending. No fixture origin or deployed URL is invented. No merge, deployment, tag, production DB change, commit or push occurred. Integration target remains `feat/r4-staff-industry-collaborations`; no new branch/worktree was created.
