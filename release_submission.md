# Release Submission ? R3 preparation draft

> Closure update, 2026-11-04: **NO-GO for assessed submission.** See [worker closure audit](docs/release-3-closure-report.md) and [later human acceptance steps](docs/release-3-closure-human-checklist.md). The caller reports R3 deployed at baseline `b81ba3df3a28f0b0e267414852f8e202129a2f19`, migrations 0008–0010 applied and historical production smoke 12/12; this worker did not verify production identity or run live acceptance. The preparation text below is a preserved historical record; its pre-deployment/uncommitted statements are not the current caller-reported state. Official adapter, genuine public two-contributor/import evidence and assessed tag remain open. Current worker QA is green for 239 unit/frontend tests, lint, typecheck and build; DB/browser acceptance remains NOT RUN, as recorded separately. No patch application or release operation is authorized by this record.

Release: R3 (NOT YET FROZEN OR SUBMITTED)
Team: team-01
Deployment: NOT VERIFIED FOR R3. Previously documented R2 origin: https://immxrsive-talent-platform.vercel.app ? not contacted or claimed as R3 evidence.
Repository: https://github.com/JashSojitra/immxrsive-talent-platform (configured origin; remote accessibility not revalidated in Phase 7)
Release tag: R3-submission ? PLANNED, NOT CREATED
Commit: Local source-freeze checkpoint on feat/release-3; resolve exact SHA using git log -1 --format=%H -- docs/release-3-source-freeze.md. Deployed/assessed identity NOT ESTABLISHED.
Adapter: evaluation_adapter.json ? PROVISIONAL R3 EXTENSION; latest official evaluation_adapter_template.json missing. Reconcile before submission.
Known issues: Assessed SHA/tag, public deployment/evidence and official adapter reconciliation remain incomplete; see docs/release-3-known-issues.md.
Test notes: Fresh 2026-11-01 disposable QA passed 158 integration/API, 230 unit/frontend and 125 browser cases, with 5 intentional desktop skips for mobile-only assertions. Fresh 0000?0010, populated R2 0007?0010 upgrade, live 32-table RLS/privilege checks, migration integrity, typecheck, lint, build and fixture validation passed. These are local results, not production evidence. See docs/release-3-final-qa.md.

## Test accounts

No deployed evaluator accounts/credentials have been established for R3. Tests create two independently authenticated verified synthetic students and remove their accounts/projects afterwards. Do not reuse test IDs or invent credentials. For public QA, two consenting humans sign in with their own GitHub accounts and verify approved affiliation through normal UI. Provide evaluator access through a private course channel; never commit passwords or verification links.

Account/project reproduction: [QA setup](docs/release-3-qa-setup.md).

## Release-specific evidence

| Required item | Evidence / remaining action |
| --- | --- |
| Deployed URL and assessed SHA | NOT ESTABLISHED; verify exact authorized R3 deployment |
| Repository | Configured GitHub origin above; freeze/verify assessed source later |
| R3-submission tag | NOT CREATED; establish exact assessed/deployed SHA first |
| Release notes / issues | [Notes](docs/release-3-release-notes.md), [issues](docs/release-3-known-issues.md); maintainer-only editing and reversible soft removal stated |
| Shared published project, two accepted contributors | Fresh desktop/390px evidence exists; persistent public example, canonical URL and both consenting profile URLs NOT ESTABLISHED |
| Working demo/fallback | Supplied assets at /fixtures/r3/working_demo.html and /fixtures/r3/fallback.svg; actual local interaction/failure isolation passed; deployed public URLs NOT VERIFIED |
| Public GitHub import | Mocked tests passed; real repository/deployed import demonstration NOT ESTABLISHED |
| Screenshots / QA | [Local synthetic screenshots](docs/evidence/release-3/README.md), [setup](docs/release-3-qa-setup.md), [fresh case catalog](docs/release-3-qa-results.json) |
| Official requirements | [R3.01?R3.27 traceability](docs/release-3-final-traceability.md): 26 local PASS, R3.27 FAIL (tag absent); public evidence separately gated |
| Adapter | JSON/provisional team contract passed; official R3 template missing |

This draft uses the available release_submission_template.md fields. Prior R2 content is preserved in [submission archive](docs/release-2-submission-archive.md), and prior adapter in [adapter archive](docs/evaluation-adapter-before-r3.json). Historical R2 production claims are not R3 proof.

**CONDITIONAL GO for controlled release preparation after review; assessed submission remains blocked.** The [deployment/rollback checklist](docs/release-3-deployment-rollback-checklist.md) requires separate operational authorization. No commit, push, deployment, production migration or tag occurred in Phase 7.

Local checkpoint: [source-freeze record](docs/release-3-source-freeze.md). Manual human browser QA is intentionally deferred until after deployment and before submission; prior automated local results remain valid.
