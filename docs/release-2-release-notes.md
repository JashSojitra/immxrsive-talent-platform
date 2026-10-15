# Release 2 release notes

Release 2 adds a verified student self-service workflow while preserving the
public Release 1 directory, profiles, projects, advanced search, and contextual
employer inquiries.

## Added

- GitHub sign-in backed by internal database users, accounts, and sessions, with
  only the `user:email` OAuth scope.
- Single-use, expiring Algoma University email verification with durable rate
  limits, hashed tokens, explicit Gmail SMTP or Resend delivery, and sanitized
  failure responses.
- Authenticated, owner-bound private profile drafts with structured biography,
  program, status, skills, availability, links, education, and experience.
- Untrusted PDF resume extraction with bounded size, page, text, and processing
  limits. Candidates require explicit accept/edit/reject and merge/replace
  decisions; original PDFs are not persisted.
- Word-exported single-column resumes now recognize common section aliases,
  preserve section boundaries, split grounded experience entries, normalize
  protocol-less LinkedIn links, and disclose non-canonical skills without adding
  them to the standardized vocabulary.
- Server-side field visibility controls, private public-preview, and explicit
  publish/unpublish actions synchronized with the public directory.
- Allowlisted portfolio presentation presets, hero treatments, and section
  ordering without arbitrary HTML, CSS, or scripts.
- A public Student Login / Create Profile navigation action and responsive
  student workflow at 390 CSS pixels.
- Fail-closed logical database identity checks for migrations, destructive tests,
  fixture imports, and local application startup.
- Deny-by-default Supabase Data API protection for all 24 server-owned tables:
  RLS is enabled, `anon` and `authenticated` privileges are revoked, future
  `postgres`-owned objects inherit private defaults, and the privileged Next.js
  database connection remains unchanged.

## Changed after Release 1

- Talent keyword search supports AND groups, OR terms, and quoted phrases.
- Search syntax help is keyboard accessible.
- Student and project inquiries open with editable contextual templates, support
  reset, reject unresolved canonical placeholders, and persist the final message.
- Browser tests use a deterministic production-mode Next.js server lifecycle.

Release 1 remains archived at tag `R1-submission` and commit
`9caf0fe58b60982e356c6802bb21a332f04136e7`.

## Verified release evidence

On October 15, 2026, typecheck and lint passed, along with 95 unit tests, 64
frontend tests, 91 API tests, 98 integration tests, and 117 Playwright tests; 5
desktop-project duplicates of mobile-only assertions were intentionally skipped.
The standalone production build also passed. The production profile workflow,
resume import, and public profile visibility were user-verified on deployed commit
`21a75517ae7e637b8f5ab8d9967ab4ec5e150daf`. Production security migration `0007`
then passed its complete read-only postcheck: 24 of 24 tables protected, no client
role exposure, safe future-object defaults, and one matching Drizzle journal row.
