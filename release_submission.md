# Release Submission

Release: R2
Team: team-01
Deployment: https://immxrsive-talent-platform.vercel.app
Repository: https://github.com/JashSojitra/immxrsive-talent-platform
Release tag: R2-submission
Commit: the full commit targeted by the immutable `R2-submission` tag (also recorded in the Moodle submission text)
Adapter: evaluation_adapter.json
Known issues: Image-only or malformed resumes require manual entry; email delivery remains subject to provider limits and spam filtering; legacy fixture profiles cannot be claimed by newly authenticated accounts.
Test notes: The production profile workflow, resume import, and public profile visibility were user-verified on commit 21a75517ae7e637b8f5ab8d9967ab4ec5e150daf. Production Data API hardening passed its complete read-only postcheck on October 15, 2026. The submitted tag identifies the subsequently deployed and smoke-tested documentation/security release commit.

## Test accounts

Peer testers use their own GitHub account and approved Algoma University mailbox.
No shared password, reusable verification link, operator credential, or private
resume is included in the repository or submission.

## Release-specific evidence

- Release notes: `docs/release-2-release-notes.md`
- Known issues: `docs/release-2-known-issues.md`
- Privacy/visibility summary: `docs/release-2-privacy-visibility-summary.md`
- Peer tester instructions: `docs/release-2-peer-tester-instructions.md`
- Environment assumptions: `docs/release-2-environment-assumptions.md`
- Requirements evidence: `docs/release-2-requirements-evidence.md`
- The final Moodle requirements and Peer QA PDFs were reviewed against R2.01-R2.32 and scenarios A-K.
- The original resume PDF is discarded after extraction and is not publicly downloadable.
- Direct Supabase Data API access to all 24 server-owned application tables is denied with RLS and explicit privilege revocation in migration `0007_harden_data_api`.
- Local final gates passed on October 15, 2026: typecheck, lint, 95 unit tests, 64 frontend tests, 91 API tests, 98 integration tests, 117 browser tests with 5 intentional skips, and a standalone production build.
- The production security postcheck confirmed all 24 application tables have RLS enabled, no `anon` or `authenticated` table/sequence/function access remains, future objects inherit private defaults, and Drizzle migration `0007` has one matching journal row with no conflict.

## Archived Release 1 submission

Release tag: R1-submission
Commit: 9caf0fe58b60982e356c6802bb21a332f04136e7
