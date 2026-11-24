# Claude resume checkpoint — 2026-11-24 (updated after resume)

Branch: `feat/immxrsive-ux-overhaul`, PR #14 (draft).

## Completed

- Codex's UX work was kept as-is and committed together with this pass. It was reviewed against `visual-qa-review.md`; no further visual defects needed fixing.
- Admin-to-student intake linking was added without schema changes:
  - `queryCuratedCredits` (`src/admin/public.ts`) returns credits only while the project and the verified profile are both public.
  - Public profile: a separate "Credited in curated projects" block. Credits are not counted as project evidence or skills.
  - Student dashboard: a read-only credits panel.
  - Admin profile lookup: `GET /api/admin/profiles?q=`, write-staff only, searching verified public profiles. It's wired into the editor's credit section.
- Tests: unit (HTTP boundary), frontend (editor lookup, dashboard, profile view), and one integration test covering authorization, visibility and no ownership/membership.
- Docs: `project-intake-handoff.md` (R.I.S.E CRM and personal projects) and `resume-validation.txt`.

## Blocked

- Integration and browser suites: no runnable local PostgreSQL. The install is command-line tools only. See `resume-validation.txt`.

## Next

1. Start a PostgreSQL 17 test server on `127.0.0.1:5546`. `admin-onboarding.test.ts` asserts a server version of at least 17 and below 18. Then run the integration and browser suites.
2. Decide whether students can hide staff credits. That needs a migration.
3. Fill in the intake checklist with real R.I.S.E CRM and personal-project details.
