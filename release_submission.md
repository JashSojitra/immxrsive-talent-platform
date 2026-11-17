Chosen challenge: R4.14 - Duplicate Domain Warning

# R4 release submission — DRAFT, not deployed

Project 1 / ImmXrsive Talent Platform / team-01 (solo student)
Repository: https://github.com/JashSojitra/immxrsive-talent-platform
Intended integration branch: feat/r4-staff-industry-collaborations, from feat/admin-student-project-onboarding at 8bbf9228a7b59602297f3d53697e1ca4a23b66dd.
R4 live URL: PENDING deployment and public verification.
R4 deployed commit: PENDING.
Immutable R4-submission tag: PENDING; create only after deployed SHA is independently verified.
Deadline: Friday November 20, 2026, 11:59 PM America/Toronto, per supplied brief summarizing the Nov 16 instructor email.

This document is a preparation draft, not evidence of a completed Moodle submission, hosted fixture import, production migration, release tag or deployment. Historical R3 submission and adapter are retained under docs/archive/r4-preparation/.

## Implemented evaluation paths

- `/admin`: task counts and links to verification, company draft/import and association queues.
- `/admin/partners`: review student explanation/evidence, independently approve/reject, prepare manual company drafts, fetch/apply editable website proposals, publish reviewed company records, manage multiple collaborations and provenance history.
- `/student/projects/<projectId>/requests`: current verified student maintainer requests official verification or association with an existing/suggested company. Student forms cannot grant official state.
- `/partners` and `/partners/<companyId>`: published company profiles, current/past collaborations, related public projects and participating public profiles. Limited entries are anonymized; private entries and identifying links are omitted server-side.
- `/inquiry/partner/<companyId>`: contextual existing inquiry form, stored through `/api/v1/inquiries`; no account required. Storage confirms intake only, not email delivery or a promised collaboration.
- `/projects/<projectId>`: staff-approved official marker and multiple independently approved company associations.

See evaluation_adapter.json for route-specific scenarios and docs/course/r4/acceptance-matrix.md for evidence status. Public fixture source mappings are all PENDING in docs/course/r4/fixture-sources.md.

## Test accounts and evidence to complete

Use existing Better Auth GitHub sign-in and independently provisioned staff roles. Arrange actual staff access privately through the operator; no credentials are included or newly provisioned here. Use two eligible verified student accounts to test ownership denial and a different staff account to review requests. ADMIN_MANAGED projects retain direct staff publication without student authorization or consent gates.

Before submission record: staff access instructions; four verified public fixture URLs; one imported/published fixture company; one company with current and past collaborations; one actual student association request and independent staff decision; screenshots at 390px, tablet and laptop; live URL; deployed SHA; immutable tag and Moodle receipt. None of these human/production evidence items is implied by synthetic tests.

## Release gates / known limits

- This worker returns an uncommitted patch from a synthetic snapshot. Windows integration, feature branch, independent review, commits, push and draft PR remain operator actions.
- Full Windows cycle 4 local engineering gates PASS: 293 unit, 117 frontend, 216 integration; 149 browser passed, 5 configured skips, 0 failures/flaky (154 configured). All 10 R4 cases passed. Caller review and authorized local commit may proceed; hosted/manual acceptance and production operations remain pending. See docs/course/r4/validation-report.md.
- Import accepts public standard-port HTTPS HTML up to 500 KB; redirects, compressed responses and any DNS result containing IPv6 or private/reserved IPv4 are rejected conservatively. Manual draft completion remains available. No JavaScript rendering or AI extraction is used.
- Last 100 import proposals/activity events are shown in the staff console. Saved company source history remains attached to the record. Large installations need pagination beyond this course release.
- Production migrations 0011/0012/0013, backup/PITR, actual database identity, role bootstrap and auto-deployment ordering are unverified. Never run fixture setup against production.
- PR #9 and #10 remain dependencies; no merge, old tag change or live write was performed here.


## Final engineering verification

Full evidence and all command logs: `docs/course/r4/validation-evidence/windows-cycle4/`. Runtime: Windows Node 24.14.1 / npm 11.11.0 / disposable PG17 / Docker 29.9.2. All 12 runner checks and cleanup exit 0. No confirmed source/security defect remains from final review. Canonical tested fingerprint: `6f6dde98f90e129106386ba45f731890aa230bebd1d1ec5cb52b0c32d31b7ca4`. This final patch changes documentation only. Missing hosted fixture URLs are pending external acceptance requirements, not a failed engineering gate. No commit, push, merge, deployment, grant or tag was performed.
