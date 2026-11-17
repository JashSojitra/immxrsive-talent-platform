# R3.1 stabilization verification — 2026-11-11

Scope: the existing isolated validation worktree only. This report supersedes the earlier partial Linux-worker report. The original repository's pre-existing edits and untracked `docs/course/r2` were preserved. No commits, tags, pushes, PRs, issue updates, deployment, production migration, or R3.2 AutoDemo work were performed.

## Failure diagnosis recorded before fixes

- Integration: 172/173 passed. `inquiry-api.test.ts` expected SQLSTATE `23001` when deleting a referenced profile. Migration 0008 correctly defines `ON DELETE RESTRICT`. PostgreSQL 17's referential-integrity trigger reports this as `23503` (`foreign_key_violation`); see [PostgreSQL 17 trigger implementation](https://github.com/postgres/postgres/blob/REL_17_STABLE/src/backend/utils/adt/ri_triggers.c). The test now requires `23503` and the exact `inquiries_student_profile_id_student_profiles_id_fk` on both the nonexistent-profile insert and referenced-profile deletion, and retains the assertion that the profile still exists. No constraint changed.
- Browser: 12 failures, 123 passes, five intentional desktop skips. Ten desktop failures were fixture setup/order defects: `auth.spec.ts` public journeys hit `/projects/P01` 404, and nine `inquiry.spec.ts` cases encountered unavailable fixture pages instead of forms. Later browser files seeded the fixtures, explaining why mobile cases passed. Playwright now migrates and imports validated fixture data in guarded global setup before any test.
- Two `project-import.spec.ts` failures (desktop/mobile) lacked the existing deterministic GitHub fetch preload. Suggestions depended on a real GitHub request instead of `tests/fixtures/github-fetch.mjs`. Playwright's server process now receives that preload explicitly. Authentication succeeded; no auth bypass or transport switch was added to application code.
- Form interaction timeouts were consequences of missing fixture content, not evidence for increasing timeouts. No timeout increases, retries, new skips, relaxed assertions, or application-security changes were needed for these browser failures.
- The first focused rerun confirmed fixture repair (31 passed) but still missed the preload because an edit had not applied. The corrected focused rerun passed 33 tests with one existing mobile-only skip. It also verified a Windows PowerShell 5.1 Docker cleanup repair: quoted Go-template label lookup had failed; cleanup now parses label JSON before removing only the matching generated container.

## Runner hardening

`scripts/validate-r31.ps1` runs on Windows PowerShell 5.1+ and Node >=22.12. Each invocation creates a fresh random labelled PostgreSQL 17 container, loopback-only dynamic port, random database/password, and tmpfs data storage. It refuses runtime dotenv files, replaces runtime/auth configuration with synthetic test values, disables email delivery, clears inherited Node preload options, and restores the process environment in `finally`.

Logs and incremental `results.json` live in unique Windows TEMP directories, outside Playwright output. Connection URLs, generated passwords and inherited sensitive values are redacted from command logs and the browser JSON report. Browser artifacts also have a per-run external directory. Installation/downloads are explicit options (`-InstallDependencies`, `-InstallBrowser`); existing dependencies and Chromium were reused here. `-FocusedOnly` and `-ReuseBuild` support focused debugging. Native/test/setup/cleanup failures return nonzero, with runner and cleanup errors retained. Cleanup verifies its exact ownership label, removes that container and its volumes, and checks absence when the container has already disappeared. No prune or unrelated-resource deletion occurs.

## Verification

| Check | Result |
| --- | --- |
| PostgreSQL 17 migrations | PASS |
| Typecheck / lint / production build | PASS |
| Unit | 191 passed, 22 files |
| Frontend | 100 passed, 16 files |
| Integration | 173 passed, 14 files, zero skips |
| Browser, desktop + 390px | 135 passed, five unchanged mobile-only desktop skips, zero failures/flaky tests |
| Runner / cleanup | Exit 0; cleanup PASS |

The full matrix ran once after focused repairs, using fresh disposable infrastructure. Dependency installation and Chromium installation had already passed in the supplied logs and were not repeated.

Focused successful results: 26 inquiry integration tests; 33 browser tests passed, one existing mobile-only skip, zero failures/flaky results. Both focused runs used fresh disposable databases; the failed cleanup container was subsequently ownership-checked and removed. The corrected run cleaned itself up successfully.

Full-run logs: `C:\Users\JASH2\AppData\Local\Temp\immxrsive-r31-results-8f7b89e2b3dd44209d0d7f7b830612a8`.
Successful focused logs: `C:\Users\JASH2\AppData\Local\Temp\immxrsive-r31-results-e5ba8d22f99747ea92a93f3bf00e1c3f`.
Initial focused investigation: `C:\Users\JASH2\AppData\Local\Temp\immxrsive-r31-results-dc014e10a0d7434eb5b676179a6ccd8e`.
Original supplied logs: `C:\Users\JASH2\AppData\Local\Temp\immxrsive-r31-results-1efd622e54594f299b7f69ed3673ff50`.

## Changed files and security review

- `package.json`, `scripts/migrate-test.ts`: recovered changes remove implicit real `.env.local` loading from test commands.
- `src/db/safety.ts`, `src/db/client.ts`, `tests/unit/database-safety.test.ts`: recovered disposable-loopback target guards, development overlap detection including loopback aliases, and automated-client protection.
- `tests/integration/setup.ts`: recovered per-file disposable database isolation, runtime client shutdown, and database removal without deleting append-only evidence or disabling triggers.
- `tests/integration/studio.test.ts`: recovered concurrency, revocation, append-only audit, super-admin assignment/last-admin, RLS and both browser-role privilege checks.
- `src/app/studio/page.tsx`, `src/components/project-editor/project-editor.module.css`: recovered filtered empty state, disclosure focus and long-text wrapping fixes.
- `tests/browser/studio.spec.ts`: recovered anonymous Studio/auth/API denial and public showcase accessibility/390px smoke checks.
- `tests/integration/inquiry-api.test.ts`: precise PostgreSQL FK assertions described above.
- `playwright.config.ts`, `tests/browser/global-setup.ts`: deterministic fixture setup, test-server-only GitHub preload, preserved output paths and runtime database identity.
- `scripts/validate-r31.ps1`: runner hardening described above.
- `docs/r3-1-stabilization-report.md`: this final evidence report.

Review found no weakened FK/RLS/auth/audit protections, no migration changes (0000–0011 unchanged), no new skip/only directives, and no production connections. Existing integration describe-skip fallbacks cannot silently skip a missing database because imported setup fails collection first. Five browser skips are unchanged desktop exclusions for mobile-only scenarios (inquiry, project-detail, release-1-acceptance, student-profile, talent); the scenarios execute on mobile.

Non-failing Next.js `destination stream closed early` server warnings appear during navigation in both original and corrected runs. Local source inspection traces the message to React's `destination.on("close", createCancelHandler(...))` handler. The warnings occur around navigation; no browser assertion or page-error check failed. They are retained in logs, not suppressed. Automated checks do not certify deployment configuration, real OAuth/provider availability, production backup/restore, or every manual visual interaction. Staff bootstrap and any deployment remain separately authorized operations, documented in `docs/r3-1-xr-studio.md`.

## Deliverable and disposition

Patch base: `feat/r3-1-xr-studio` at `0b17644d52431836c57a79cc3d2a3861fee5f8b7`.
Protected `R3-submission` tag: `cadaa1301583ea9884ebf3c8ffa16529d7d1792f`.
Comprehensive patch: `C:\Users\JASH2\AppData\Local\Temp\immxrsive-r31-review-1e67159871114d1fbb4df336adc52784\stabilization.patch`. It includes all recovered stabilization edits plus these repairs, against the original branch commit, and is not applied to the original repository. The original worktree already contains some recovered edits; the patch is intended for review against its base, not blind application over those pre-existing edits.

Final checks: all 372 original tracked-file SHA-256 hashes match the pre-edit baseline; original dirty status, branch commit and submission tag are preserved. The patch passes `git apply --cached --check` against the unmodified branch index and `git diff --check`. The 15-file manifest and source audit are saved beside the patch. No labelled validation containers or port 3100 listener remain; the first failed-cleanup container was verified and removed. Logs and final results are preserved.

Recommendation: **GO for R3.1 stabilization patch review/application**. No remaining test failures or external blockers. The retained React stream-cancellation warnings are nonblocking. This recommendation does not authorize deployment or production operations.
