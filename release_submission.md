# Release Submission

## Release 2 draft — not yet submitted

Release: R2
Team: team-01
Deployment: PENDING HUMAN PRODUCTION DEPLOYMENT
Repository: https://github.com/JashSojitra/immxrsive-talent-platform
Release tag: PENDING HUMAN RELEASE TAG
Commit: PENDING HUMAN RELEASE COMMIT
Adapter: evaluation_adapter.json
Release notes: `docs/release-2-release-notes.md`
Known issues: `docs/release-2-known-issues.md`
Privacy summary: `docs/release-2-privacy-visibility-summary.md`
Peer test instructions: `docs/release-2-peer-tester-instructions.md`
Environment assumptions: `docs/release-2-environment-assumptions.md`
Requirements evidence: `docs/release-2-requirements-evidence.md`
Deployment checklist: `docs/release-2-deployment-checklist.md`

### Release 2 test account

An evaluator must use their own GitHub account and an approved Algoma University
mailbox. No password or reusable verification link is stored in this repository.
The production Gmail delivery path has not yet been manually verified.

### Release 2 submission status

This is a preparation draft. It must not be submitted until the clean final
requirements and Peer QA PDFs have been reviewed, a live verification email has
been tested, and the authorized production release commit, deployment URL, and
tag have been recorded.

Local release gates passed on October 13, 2026: typecheck, lint, 153 unit tests,
64 frontend tests, 91 API tests, 98 integration tests, 117 browser tests with 5
intentional skips, and a standalone production build. These are local results,
not evidence of production deployment or live provider delivery.

## Archived Release 1 submission

Release: R1
Team: team-01
Deployment: https://immxrsive-talent-platform.vercel.app
Repository: https://github.com/JashSojitra/immxrsive-talent-platform
Release tag: R1-submission
Commit: 9caf0fe58b60982e356c6802bb21a332f04136e7
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
