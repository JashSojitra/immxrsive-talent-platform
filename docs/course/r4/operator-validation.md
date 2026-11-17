# R4 final operator status — cycle 5

Full Windows cycle 4 engineering verification passed. Review [validation-report.md](validation-report.md) for exact counts, five skips, source assessment and external limits. No full rerun is required for this documentation-only patch.

Caller next steps: review/apply this patch on `feat/r4-staff-industry-collaborations`, verify the baseline `8bbf9228a7b59602297f3d53697e1ca4a23b66dd`, inspect the exact diff and run `node scripts/validate-r4-candidate.mjs`. Confirm fingerprint `6f6dde98f90e129106386ba45f731890aa230bebd1d1ec5cb52b0c32d31b7ca4`, then prepare the authorized local reviewed commit. No push, merge, tag, grant or deployment is authorized.

The PowerShell runner has now executed successfully on Windows with all full gates and cleanup passing; prior parser/runtime/seed/browser pending statements below are historical. Four hosted fixture URLs/hashes and manual course acceptance remain pending, independently of local engineering readiness. See [fixture requirements](fixture-sources.md). Production prerequisites below still apply only to later separately authorized operations. Any new heavy lab verification must use the caller's established `ld` route; no heavy worker run was performed.

---

## Historical operator instructions (superseded execution status)

# R4 repair cycle 3 — Windows cumulative validation (current)

The gateway restriction for this job is: edit only in a throwaway snapshot; Git metadata is read-only; no commit/push; limited shared memory permits targeted checks, not whole builds, full suites or many parallel workers. The patch is returned to the caller for review. This restriction applies to this worker job. No `ld` tool/skill is installed on caller or worker; its absence is not an additional permission requirement. The explicitly authorized Windows Docker runner below is the current route for the heavy gates. Earlier dispatcher instructions below are retained as historical evidence and superseded for this run.

Apply/review the patch in `C:\Coding Assignments\immxrsive-r4` on exactly `feat/r4-staff-industry-collaborations`. Preserve the real baseline/history, records, tags and snapshots. Do not commit/push/deploy or use real accounts/credentials for validation. `scripts/validate-r31.ps1` remains unchanged. The R4 adaptation preserves its no-dotenv, environment restoration, synthetic auth/email, exclusively loopback PG17 and labelled-container ownership/cleanup guards. It refuses focused checks/build reuse; missing dependencies use lockfile `npm ci`, with no dependency/lockfile edits.

Run in Windows PowerShell 5.1+ (parser validation is **pending** because no PowerShell executable is available on the worker):

```powershell
Set-Location 'C:\Coding Assignments\immxrsive-r4'
$tokens = $null
$parseErrors = $null
[System.Management.Automation.Language.Parser]::ParseFile((Join-Path $PWD 'scripts\validate-r4.ps1'), [ref]$tokens, [ref]$parseErrors) | Out-Null
if (@($parseErrors).Count) { $parseErrors; throw 'R4 runner parser validation failed' }
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-r4.ps1 -InstallBrowser
if ($LASTEXITCODE -ne 0) { Write-Warning 'Validation failed: return sanitized results/logs for diagnosis.' }
```

The runner checks executable fingerprint/history and fixtures, migrates disposable PG17, then runs full typecheck/lint/unit/frontend/integration, a fresh production build, Chromium installation and **all** Playwright cases. No speculative build-memory change was made. The new integration case invokes the existing exact seed CLI using real disposable synthetic staff/company/project rows and explicit P01/P04 mappings, checks every fixture's content, project edges and audit mapping, and checks duplicate refusal/atomicity. It does not establish real/demo data or prove hosted fixture imports.

Return the temporary `immxrsive-r4-results-*` folder's sanitized `results.json`, text logs and `browser-results.json`. Exit codes and the final failed-check count count failed checks (not individual tests); Vitest logs and Playwright JSON supply actual test counts. An abort records `runner` failure and blocks remaining gates; absent gates are pending, never passes. Keep HTML/traces/screenshots local unless separately inspected for sensitive content; only the text/JSON logs are sanitized by this runner. It restores prior environment values and removes only its own labelled disposable container.

Cycle 3 worker evidence: Node 22.22.0; lockfile install succeeded using a writable temporary npm cache after the default cache failed; manifests unchanged. Typecheck and changed-test ESLint passed; 44 affected R4 unit/frontend tests passed in five files. Playwright discovery lists 10 R4 cases (five scenarios across two projects), including new student/curator HTTP/UI staff-write denials and student requests followed by independent staff decisions and public official/partner markers, at 390px student/public and 1280/768px staff. Discovery proves no browser behavior. No local PG17 executable/target or PowerShell is available: the new seed integration, parser check and **all full Windows cumulative suites/build/browser gates remain pending**. Prior 73/81-case evidence remains historical. Independent final patch review remains with caller before any later commit. Send actual sanitized logs back for the next diagnosis/repair cycle.

---

The following pre-cycle-3 records are historical:

# Morning validation and integration

First review/apply the returned patch to `feat/r4-staff-industry-collaborations` created from the verified admin head. The worker's synthetic Git history is not the source history. Re-verify GitHub/admin branch heads before integration; do not rewrite #9/#10/main or old tags. Obtain independent Codex review of the final patch under the local delegation procedure before committing.

The worker used Node 22.22.0 from `/tmp/node-v22.22.0-linux-x64/bin` and installed lockfile dependencies without changing the lockfile. Default worker Node 18 is unsupported. Use project Node >=22.12 (the installed test dependencies currently support Node 22/24/26 ranges).

Run heavy verification through the caller's `lab-dispatch` / `ld` workflow, not directly on an arbitrarily chosen lab host. No dispatcher skill or configured disposable PG17 target was supplied to this worker. Dispatch these commands using that workflow's documented syntax:

- PostgreSQL 17 disposable service and `npm run test:integration` (includes `tests/integration/r4-partners.test.ts`, existing R1–R3 API, auth, ownership, admin/session and migration regressions).
- `npm run build`.
- `npx playwright test tests/browser/r4-partners.spec.ts` initially, then the cumulative existing browser suite once fixes pass. The configured browser harness requires a production build, TEST_DATABASE_URL and a distinct development/runtime identity; it uses one worker and synthetic Better Auth accounts.
- Full `npm run lint` and cumulative unit/frontend checks if required by the release workflow. The worker already ran typecheck, changed-file lint and selected regression tests; see its exact command record.

Use only loopback disposable `immxrsive_test_*` databases, never production credentials. The integration harness creates isolated per-file databases; its control user must have CREATEDB. Existing migrations assume the test roles documented by the current harness. No R4 SQL has been applied to any live database.

## Manual hosted-fixture and course evidence

1. Host exact HTML bytes through an authorized deployment. Independently verify all four source URLs and hashes and replace PENDING in fixture-sources.md.
2. With a real existing staff session, import each URL. Inspect proposals before applying. Confirm the injection text never grants any status or executes. Save a reviewed draft and explicitly publish one fixture company.
3. Repeat the normal-company import and check its normalized website domain warning with existing record link; import the similar-name/other-domain fixture and confirm no forced merge. Verify manual fallback on a blocked/failing URL.
4. Resolve the exact collaboration seed mappings in a disposable acceptance environment; establish honest public demo records separately through the authorized operator workflow. Record one company with 2025/past and 2026/current work. Check private/limited response HTML, not only CSS visibility.
5. A real verified maintainer requests verification and association. Another staff actor reviews. Capture pending/approved states, ownership denial and the public official marker/partner links. Existing admin-managed projects must still publish without student participation.
6. Capture laptop/tablet staff and 390px public/inquiry evidence. Add actual staff test access instructions privately.

Production approval requires independent DB identity/journal, backup/PITR and roll-forward verification, migration ordering (0011,0012,0013), staff bootstrap and automatic deployment checks. Deploy only through an authorized operator, verify the exact SHA publicly, then create `R4-submission` immutably and submit Moodle evidence. No such step has occurred in this worker.

## Independent sprint update — current validation status

Read validation-report.md first: this later sprint ran targeted PG17 tests safely in a new temporary local cluster. Final union is 81 distinct DB cases across seven files and 73 unit/frontend cases across nine files. Full lint/typecheck/fixture validation passed. Full cumulative suites/build/browser still require caller `ld`; browser discovery alone found 150 cases and proves no UI behavior. The original report above and overnight-sprint-report.md are preserved historical instructions, not current execution claims.

The supplied 0013 was corrected before release to bind association approval to its company. Original bytes are archived. Before applying the returned patch/migration, verify 0013 has never been applied to any intended target; if already applied, preserve that ledger/hash and prepare a separately reviewed additive migration instead. No production action is authorized by this instruction. Verify the final inventory and executable fingerprint with `node scripts/validate-r4-candidate.mjs`; caller integration target is the existing feat/r4-staff-industry-collaborations branch.
