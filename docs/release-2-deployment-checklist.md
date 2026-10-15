# Release 2 production release runbook

Every production mutation below requires separate human authorization. Do not
continue when an identity, target, command result, or backup state is uncertain.

## 1. Pre-release evidence

- [x] Replace and review both final course PDFs.
- [x] Reconcile every row in `release-2-requirements-evidence.md` with the final
      R2.01–R2.32 language and Peer QA A–K plan.
- [x] Review `git diff`, confirm Git author, and scan the exact staged set for
      credentials, `.env` files, test artifacts, PDFs not intended for submission,
      and generated build output.
- [x] Run `npm run env:check`, all quality gates, full browser suite, production
      build, dependency audit, and tracked-file secret scan.
- [x] Record the user's production confirmation of the profile workflow without
      including addresses, tokens, resume contents, or credentials.

## 2. Configuration review

- [ ] Confirm Preview and Production GitHub OAuth callback URLs and trusted
      `BETTER_AUTH_URL` values.
- [ ] Confirm Production variables are scoped only to Production and reference
      Supabase project `acnwbxqzkcdqgbohvpil`.
- [ ] Confirm Gmail/Resend secrets are server-only and present in the intended
      Vercel scope. Never expose them with a `NEXT_PUBLIC_` prefix.
- [ ] Confirm approved institutional domains and verification TTL.

## 3. Database rollout

- [ ] Take/confirm a recoverable production backup according to Supabase policy.
- [x] Run `release-2-production-security-audit.sql` in the confirmed production
      project and review the read-only results.
- [x] Run `release-2-production-security-hardening.sql`. It applies the idempotent
      `0007_harden_data_api` behavior and atomically records the exact migration
      hash/timestamp in `drizzle.__drizzle_migrations`.
- [x] Run `release-2-production-security-postcheck.sql`. Require 24 protected and
      RLS-enabled tables, zero client-role exposure, zero default-ACL exposure,
      one matching migration row, and zero conflicts.
- [x] Do not import fixtures, rerun migrations `0000`–`0006`, or modify application
      records.

## 4. Application release

- [ ] Push the reviewed release commit normally; never force-push. The immutable
      tag target and Moodle submission text record the full final SHA without an
      impossible self-referential commit hash inside that same commit.
- [ ] Deploy the exact reviewed commit. Record deployment URL and commit SHA.
- [ ] Run production smoke tests: public R1 journeys, sign-in start, verified
      affiliation email, private draft, privacy preview, publish, directory search,
      public profile, inquiry handoff, unpublish, sign-out/sign-in persistence, and
      the 390px keyboard workflow.
- [ ] Inspect sanitized runtime/function logs for authentication, email, database,
      rendering, and API errors.

## 5. Submission and tag

- [ ] Confirm `release_submission.md` contains no placeholders and records known
      issues and test evidence truthfully.
- [ ] Verify `evaluation_adapter.json` routes against the deployed application.
- [ ] Create the course-specified Release 2 tag on the exact deployed commit only
      after the name and SHA are reviewed. Do not modify `R1-submission`.
- [ ] Push the new tag normally and verify the remote SHA.

## Vercel command sequence after authorization

Run from the repository root. First verify the existing link; do not let the CLI
silently choose or create a project:

```text
vercel project inspect --non-interactive
vercel env ls production
vercel deploy --prod --skip-domain
vercel inspect <staged-production-url>
vercel logs <staged-production-url>
vercel promote <staged-production-url>
```

The staged production deployment must use the exact reviewed commit and must be
smoke-tested before `vercel promote`. This repository is not currently linked by
a local `.vercel/project.json`, so a human must explicitly link and verify the
intended team/project before running these commands. Environment values must be
entered in Vercel as scoped Secrets (except intentionally public configuration),
never placed on a command line or committed.

## Rollback

If smoke testing reveals a blocker, stop verification traffic, roll the application
back to the last known-good deployment, preserve logs, and assess database
compatibility before any database rollback. Never reverse migrations blindly.
