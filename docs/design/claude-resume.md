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

## Release-candidate validation (2026-11-25)

- The integration and browser suites, which were blocked locally, now run in GitHub Actions on an ephemeral PostgreSQL 17 database (`.github/workflows/release-validation.yml`). All green: see `resume-validation.txt`.
- Release steps, smoke tests and rollback: `release-checklist.md`.

## Next

1. Human review of PR #14, then merge. **Merging deploys production through the Vercel Git integration.**
2. Decide whether students can hide staff credits. That needs a migration.
3. After release, fill in the intake checklist with real R.I.S.E CRM and personal-project details.
