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

Before submission record: staff access instructions; four verified public fixture URLs; one imported/published fixture company; one company with current and past collaborations; one actual student association request and independent staff decision; screenshots at 390px, tablet and laptop; passing PG17/build/browser results; live URL; deployed SHA; immutable tag and Moodle receipt. None of these human/production evidence items is implied by synthetic tests.

## Release gates / known limits

- This worker returns an uncommitted patch from a synthetic snapshot. Windows integration, feature branch, independent review, commits, push and draft PR remain operator actions.
- Full PG17 integration, production build and Playwright validation require the caller's `ld` workflow. See the run report for actual local checks.
- Import accepts public standard-port HTTPS HTML up to 500 KB; redirects, compressed responses and any DNS result containing IPv6 or private/reserved IPv4 are rejected conservatively. Manual draft completion remains available. No JavaScript rendering or AI extraction is used.
- Last 100 import proposals/activity events are shown in the staff console. Saved company source history remains attached to the record. Large installations need pagination beyond this course release.
- Production migrations 0011/0012/0013, backup/PITR, actual database identity, role bootstrap and auto-deployment ordering are unverified. Never run fixture setup against production.
- PR #9 and #10 remain dependencies; no merge, old tag change or live write was performed here.

## Independent validation update — 2026-11-17

NOT READY for pre-merge acceptance. See docs/course/r4/validation-report.md and its per-command evidence. Final targeted coverage: 73 unit/frontend and 81 distinct PostgreSQL 17.7 cases; typecheck, full lint and fixture validation passed. Browser discovery found 150 cases; zero browser cases executed. Full cumulative suites, production build and actual browser/viewport authorization journeys remain caller `ld` gates. Prior implementation report counts are historical and are not added to this run.

Repairs bind approved requests to the correct partner company, clear pending import provenance when opening an existing duplicate, reject malformed partner inquiry UUIDs before querying, and exercise migration upgrades from both 0011 and 0012 states. Original supplied records/0013 SQL are preserved in docs/archive/r4-validation/. All 0000–0012 historical SQL/snapshot bytes and 13 journal entries match the real baseline. This corrected 0013 has only been applied to a new local disposable cluster; verify it has never been applied elsewhere before using its changed hash. No production writes, deployment, commits, push, tag or integration were performed.
