# Release Submission

Release: R3
Team: team-01
Project Option: Project 1
Deployment: https://immxrsive-talent-platform.vercel.app/
Repository: https://github.com/JashSojitra/immxrsive-talent-platform
Release tag: R3-submission — **PENDING; do not submit as created**
Commit: b81ba3df3a28f0b0e267414852f8e202129a2f19 — **reported deployed R3 baseline; verify final assessed SHA after any further merge**
Adapter: evaluation_adapter.json — **replace with reconciled official-template version before assessment**
Known issues: Live GitHub import failure reported but not reproduced; two-contributor public evidence and assessed tag pending. No verified production backup; R2 rollback after R3 drafts may expose projects. See release notes and final QA.
Test notes: Pre-deployment disposable full R3 QA reported 158 integration/API, 230 unit/frontend and 125 browser tests passed (5 intentional mobile-only skips). Closure worker reported 239 unit/frontend passes after test reliability patch; DB/browser not rerun for that patch. Production rollout reported 12/12 smoke checks and verified migrations 0008–0010. Authenticated two-account production acceptance remains outstanding.

## Test accounts

Use two independent consenting verified Algoma student accounts, each authenticated through the application's existing GitHub sign-in and student verification flow. Create a canonical project with account A, publish both eligible profiles, invite account B with a standardized role, and accept on account B. Provide evaluator setup assistance through the approved private course channel; do not commit passwords, private verification links or tokens. Account details and public profile URLs: **PENDING**.

## Release-specific evidence

- **Deployed site:** https://immxrsive-talent-platform.vercel.app/ — production was reported ready on baseline `b81ba3d`; verify final deployed SHA against the assessed tag.
- **Repository and assessed tag:** https://github.com/JashSojitra/immxrsive-talent-platform — `R3-submission` **not yet created**.
- **Release notes and known issues:** `docs/release-3-release-notes.md`, `docs/release-3-known-issues.md`. Shared editing is maintainer-only; accepted relationship removal is reversible.
- **Published shared project with two accepted contributors:** **PENDING public canonical project URL and two published contributor profile URLs.** Automated two-account testing does not substitute for this persistent example.
- **Working playable demo:** https://immxrsive-talent-platform.vercel.app/fixtures/r3/working_demo.html — live interaction reported and independently tried through a published project page.
- **Fallback image:** https://immxrsive-talent-platform.vercel.app/fixtures/r3/fallback.svg — public smoke GET reported passed. The published QA project linking both playable and fallback is **PENDING URL**.
- **Real public GitHub repository for import:** https://github.com/JashSojitra/immxrsive-talent-platform is a candidate, but its successful *production import workflow* is **NOT VERIFIED**; do not claim success.
- **R3 requirement audit:** `docs/release-3-final-traceability.md`; initial local matrix 26/27 with R3.27 awaiting assessed tag. Final human acceptance is still required.
- **Completed evaluation adapter:** `evaluation_adapter.json` — must use the official downloaded template, with deployed entry points and evaluator setup.

**Submission status: NOT YET READY.** Fill public collaborative evidence, confirm GitHub import, finalize adapter and assessed/deployed commit, create `R3-submission` tag, then remove pending markers.
