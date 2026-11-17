# Administrator onboarding: final integration and release handoff

2026-11-16. Branch `feat/admin-student-project-onboarding`, based on R3.1 `9302e6487ee3efa4a9a9da29a701dca02c822702`. Transport commits were not imported. Delivery is a separate draft PR targeting `feat/r3-1-xr-studio`; its live PR records the final head and review/CI status.

## Delivered workflow

The administrator portal provides overview metrics, project search/filter/sort, drafts/published/unpublished/archived states, technical-readiness lists, activity, settings and secure staff access management. An authorized administrator can manually create or import public GitHub metadata, edit narrative/dates/technologies/tools/media, configure an independently hosted adaptation, enter descriptive credits, preview, publish directly, update, unpublish, archive and restore a private draft. Stable canonical IDs and public URLs are retained.

**ADMIN_MANAGED publication has no student account, affiliation, invitation, approval or consent-revision gate.** Optional profile links are unnecessary for credits and disappear when a linked profile becomes private. They confer no identity verification, ownership, membership or skills. Existing STUDENT_MANAGED ownership, consent, transfers and XR Studio rules are preserved; admin APIs cannot convert or seize those records.

GitHub intake uses exact-host normalization, bounded public API calls, editable suggestions applied explicitly, duplicate detection and manual recovery. Original source and adapted hosting are separate. Demonstrations support explicit-launch opaque sandboxed embeds, external hosting, video, static narrative/gallery and native/XR device instructions, with independent fallbacks. No imported code is executed or automatically built. Arbitrary native/Unity applications are not promised browser execution.

Current roles are verified from the authenticated session and database in every operation. Curators read/review; XR admins manage content; super admins additionally manage staff access. Transactional grant checks, optimistic revisions, immutable provenance and append-only audits protect mutations and revocation. Last-super-admin protection remains intact.

## Actual verification

Counts below overlap; do not add them as unique coverage or claim a single final full-matrix execution.

| Run | Actual result |
| --- | --- |
| Remote implementation, Node 22.22.0 | 158 focused tests passed; typecheck, lint, fixture validation and schema consistency passed. |
| Initial isolated Windows, Node 24.14.1/npm 11.11.0 | Fresh PostgreSQL 17 migrations, typecheck, lint, **245 unit / 112 frontend / 197 integration** tests and production build passed. Browser: **137 passed, 2 failed, 5 intentional exclusions, 0 flakes**. Both failures were the new admin lifecycle's initial keyboard-focus assertion. Cleanup passed. |
| Independent remote review | Four defects repaired; **117 unit/frontend and 79 PostgreSQL 17 integration tests passed**, including 27 admin/migration/session cases. Typecheck, targeted lint and schema checks passed. |
| Focused remote browser repair | Hydration readiness, deterministic keyboard starting context and a focusable skip destination; assertions retained and expanded. **43 tests**, typecheck, targeted lint, fixture parity and browser discovery passed. Browser execution was explicitly deferred to Windows. |
| Repaired isolated Windows candidate | Fresh migrations, **27 admin integration tests**, rebuilt production application and **4/4 desktop/mobile admin browser cases passed**, no failures/skips/flakes. Cleanup passed. |
| Final visual integration | One existing form-section class was reused to style the publication note consistently. Rebuilt again; **4/4 admin browser cases passed**, zero failures/skips/flakes; fresh database cleanup passed. Unchanged integration suites were retained, not rerun for styling. |

The passing lifecycle browser test exercises import suggestions, editable fields, manual credits, preview, sandbox launch/close, blocked/unavailable-host fallback, direct public API/showcase publication, staff grant/revocation, archive and private restoration. It verifies zero student profiles/memberships for the administrator. Independent signed-session PostgreSQL tests additionally verify direct publication with zero student profiles, affiliations, memberships or Studio submissions, plus forged inputs, revoked sessions/roles, concurrency, effective RLS/grants and migration compatibility. Desktop/390px screenshots were inspected; keyboard/skip/main/form focus, reduced motion and overflow assertions passed. Actual assistive-technology certification, fullscreen and real external-host compatibility remain operational checks.

Reproducible commands and worker limitations are preserved in the [implementation report](admin-onboarding-implementation.md), [independent security review](admin-onboarding-security-review.md) and [browser repair](admin-onboarding-browser-repair.md). Windows used the existing guarded `scripts/validate-r31.ps1` in an isolated validation branch, followed by a temporary copy restricted to the three admin integration files and `admin-onboarding.spec.ts`. All environment/container ownership, loopback and cleanup guards were retained. Original synthetic resume PDFs were exercised by the broad Windows run; remote snapshots conservatively omitted them.

Sanitized local evidence run IDs: `d9df4ad7cd6648a4b67fa379814b5bf6` (initial matrix), `13ae6823eeb54a388ff748d3c4abbec0` (security/browser repairs), `2b3e04f9111d429aab25ee5d85f46ac1` (final visual build/browser). Reports retain command exit codes, logs and browser JSON/screenshots. These are local artifacts, not fabricated GitHub CI results.

## Security, migration and preservation

Independent review fixed two medium defects (uppercase optional profile IDs becoming lifecycle gates; trailing-dot resolver URL bypass) and two low defects (content replacement on lifecycle-only actions; year-zero dates). Meaningful regressions passed. No confirmed high/critical finding remained in the bounded feature review. URL syntax checks do not certify DNS, malware, licensing or remote-host safety.

Additive migration `0012_cooing_shatterstar.sql`, its generated snapshot and appended journal entry add management mode, admin provenance/details, profile associations, audit, consistency/membership guards and deny-by-default RLS. Committed LF SQL SHA-256: `41a93c3e48eb4695219074dd6be2dd7ea90189106b1f40327c1c064ea6a4111d`. All 0000–0011 SQL, old snapshots and journal entries remain unchanged. Dependencies retain the validated manifests and prior audit dispositions; no redundant dependency audit was run. Environment files and unrelated course R2 work were preserved. `R3-submission` remains `cadaa1301583ea9884ebf3c8ffa16529d7d1792f`; the R3.1 branch stays at its verified head.

Feature commits: `eaff6b6` requirements, `f66fd1c` backend/schema/security/tests, `62b46d7` portal/demo/browser integration, followed by this documentation commit. Final integrated application/test bytes match the tested Windows candidate after line-ending normalization. Final whitespace, credential-pattern and preservation checks passed.

## GitHub and operational disposition

PR #9 is ready for review at the unchanged R3.1 head, not merged. #3/#5 are closed **NOT PLANNED**, with factual comments preserving their historical findings; they were not marked completed fixes. #4/#6/#7 remain closed as completed. A read-only current #5 observation found the playable domain corrected to `.vercel.app`, with empty technologies and no independent fallback; no production data correction or complete acceptance certification is claimed.

Substantive architecture, implementation, migrations, tests, documentation and independent security review ran on dilab-5080 through the existing launcher: one high-effort implementation, one high-effort independent review and one medium-effort confirmed browser repair. Local work was orchestration, sanitized transfer, review/integration, Windows verification, GitHub operations, this evidence summary and one non-substantive styling-class correction. No second delegation framework or local feature implementation was introduced.

**Ready for feature-PR review; NO-GO for production execution.** The connected Vercel account/team could not resolve this deployment project and returned no project for the repository, so hosted Node/Linux/runtime settings remain unverified. Also outstanding: actual database identity/ledger/effective privileges, restoration-tested backup and compatible rollback rehearsal, real-host media/device/accessibility smoke checks, and separate approvals.

Before release, reconcile the actual journal and verified hashes; apply only missing 0011/0012 through the approved production migration process. Retain additive schema, provenance and audits on application rollback; never rewrite historical migrations/tags or drop legitimate records. Production backup restoration requires approved restricted handling of real data and explicit data-loss assessment. First admin bootstrap requires a real signed-in internal account, independently verified environment/account, privileged operator and change approval, locked atomic grant/audit transaction and preservation of existing super admins. Subsequent authorized role administration uses `/admin/settings/access`.

Exact separate approvals remain: reviewed PR merge; correct hosting/database access and backup-data handling; migration for the exact SHA/environment/journal/hash/window/operator; deployment with a rehearsed rollback build; and real first-super-admin bootstrap identifying the intended account/approver/change reference. No production migration, deployment, private-data write, real admin grant, force push or historical tag change occurred. See [operations](admin-onboarding-operations.md), [intake/demo guide](admin-onboarding-intake-demo.md) and [release/rollback guide](admin-onboarding-release.md).
