# Release Submission

Release: R1
Team: team-01
Deployment: https://immxrsive-talent-platform.vercel.app
Repository: https://github.com/JashSojitra/immxrsive-talent-platform
Release tag: R1-submission
Commit: FINAL_RELEASE_COMMIT_SHA
Adapter: evaluation_adapter.json
Known issues: No blocking issues. P07 intentionally contains an invalid optional external demo URL; the project page remains usable. See `docs/release-1-known-issues.md`.
Test notes: The Release 1 workflow is public and requires no account. The inquiry endpoint persists a simulated employer-intake record in PostgreSQL; it does not send email or create a CRM record.

## Test accounts

No test account is required for Release 1.

## Release-specific evidence

- The public directory at `/talent` returns the 17 published fixture students and supports text, skill, availability, and status filtering.
- Stable profile and project routes include `/students/S01` and `/projects/P01`; S16 is intentionally unavailable publicly.
- Student and project inquiry routes retain their source context and persist successful submissions.
- Desktop and exact 390 CSS px workflows passed keyboard, reduced-motion, WebGL-fallback, direct-navigation, reload, and browser-back checks.
- `/projects/P07` remains functional even though its optional external demo URL intentionally uses `example.invalid`.
- Production smoke testing validated the public Vercel UI, all Release 1 APIs, and persistent Supabase PostgreSQL data.
