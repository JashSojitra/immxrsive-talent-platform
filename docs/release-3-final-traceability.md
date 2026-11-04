# Release 3 final requirement traceability

> Closure update, 2026-11-04: the “fresh” cases and PASS labels below are historical Phase 7 results. See the [new complete 27-row closure matrix](release-3-closure-report.md#complete-requirement-audit) for source review, 239 passing unit/frontend tests including portable checksum regressions, NOT RUN DB/browser checks, production evidence gaps and current NO-GO. This worker used the repository transcription and did not inspect the excluded original Moodle PDF.

Date: 2026-11-01. Authority: official five-page Moodle PDF in `docs/course/r3`, reread for Phase 7. Exact numbered wording below is transcribed with line wrapping normalized. Official clarifications for R3.06 (team editor decision) and R3.13 (recoverable removal) are reflected in the release notes.

**Scope of status:** PASS means fresh Phase 7 disposable-environment acceptance evidence, not deployed production approval. Requirements R3.01?R3.26 are evaluated against current code, tests and observable behavior. R3.27 is FAIL because the required assessed tag does not exist. Public release-evidence gaps are separate mandatory release gates, even where local behavior passes. No previous report alone establishes a PASS.

Evidence: [fresh results and command/identity record](release-3-final-qa.md), [case-by-case machine-readable results](release-3-qa-results.json), [QA reproduction](release-3-qa-setup.md), [release notes](release-3-release-notes.md). Test names below are selectors into the full fresh result catalog; file paths under `tests/integration`, `tests/frontend`, `tests/unit`, or `tests/browser` identify their suites. Browser journeys run independently in desktop and mobile-390.

## R3.01 - Add Project

> A verified student can create a project using one clear Add Project workflow.

**Status: PASS** ? fresh local acceptance; deployment evidence remains separately gated.

**Implementation/source:** src/projects/http.ts; src/projects/service.ts; src/components/project-editor/ProjectEditor.tsx.

**Routes/UI:** /student/dashboard -> /student/projects -> /student/projects/new; POST /api/v1/student/projects.

**Acceptance evidence:** manual-project-api.test.ts: verified student creates, edits, publishes and unpublishes; manual-project.spec.ts: verified student manually creates. Fresh corresponding cases passed; exact names/outcomes are retained in the result catalog.

**Remaining action:** None for tested behavior; repeat with consenting deployed account.

**Exact fresh case/outcome:**

- `tests/integration/manual-project-api.test.ts` ? `manual project HTTP and public projection verified student creates, edits, publishes and unpublishes one canonical project`: **passed**.

## R3.02 - Manual Creation

> The workflow supports manual entry of at least title, short description, domain/type, project technologies, date/status, public links, and media/demo information.

**Status: PASS** ? fresh local acceptance; deployment evidence remains separately gated.

**Implementation/source:** src/projects/validation.ts; src/projects/service.ts; src/components/project-editor/ProjectEditor.tsx; src/db/schema.ts.

**Routes/UI:** /student/projects/new and /student/projects/{id}/edit; POST collection, PATCH /api/v1/student/projects/{id}.

**Acceptance evidence:** manual-project-api.test.ts: zero/multiple/replaced repositories; manual-project.spec.ts: verified student manually creates. Fresh corresponding cases passed; exact names/outcomes are retained in the result catalog.

**Remaining action:** None for tested behavior.

**Exact fresh case/outcome:**

- `tests/integration/manual-project-api.test.ts` ? `manual project HTTP and public projection zero/multiple/replaced repositories preserve the permanent ID and every shared field`: **passed**.

## R3.03 - GitHub Import

> The student can provide/select a public GitHub repository and use repository metadata to propose useful project fields such as name/title, description, repository URL, and language/technology evidence. Imported values remain editable suggestions.

**Status: PASS** ? fresh local acceptance; deployment evidence remains separately gated.

**Implementation/source:** src/projects/github-import.ts; src/projects/import-http.ts; src/components/project-editor/GitHubImportPanel.tsx.

**Routes/UI:** Import from GitHub on /student/projects/new; POST /api/v1/student/project-imports/github.

**Acceptance evidence:** github-import.test.ts; project-import-api.test.ts: deterministic GitHub HTTP import stays suggestion-only; project-import.spec.ts: GitHub suggestions remain editable. Fresh corresponding cases passed; exact names/outcomes are retained in the result catalog.

**Remaining action:** Record real public-repository import on assessed deployment. Fresh tests deliberately mock upstream metadata.

**Exact fresh case/outcome:**

- `tests/integration/project-import-api.test.ts` ? `GitHub duplicate and join API deterministic GitHub HTTP import stays suggestion-only with strict auth/body/origin checks`: **passed**.

## R3.04 - Repository Is Not Project Identity

> A project remains valid if a repository is disconnected or changed. A project can contain zero, one, or multiple repository links.

**Status: PASS** ? fresh local acceptance; deployment evidence remains separately gated.

**Implementation/source:** src/projects/service.ts; src/projects/repository-url.ts; src/db/schema.ts (projectRepositories).

**Routes/UI:** Editor repository collection; POST/PATCH project APIs; /projects/{id}.

**Acceptance evidence:** shared-projects.test.ts: repositories disconnect without changing identity; manual-project-api.test.ts: zero/multiple/replaced repositories. Fresh corresponding cases passed; exact names/outcomes are retained in the result catalog.

**Remaining action:** None for tested behavior; retain canonical ID in final evidence.

**Exact fresh case/outcome:**

- `tests/integration/shared-projects.test.ts` ? `shared project domain and database security only maintainer edits shared fields; repositories disconnect without changing identity`: **passed**.

## R3.05 - Canonical Shared Project

> A collaborative project is one shared record referenced by multiple student profiles, not separately duplicated project copies for each contributor.

**Status: PASS** ? fresh local acceptance; deployment evidence remains separately gated.

**Implementation/source:** src/projects/public-evidence.ts; src/db/queries/student-profile.ts; src/db/schema.ts (memberships/contributions).

**Routes/UI:** /projects/{id}; /students/{id}; public /api/v1/projects/{id} and /api/v1/students/{id}.

**Acceptance evidence:** project-team-api.test.ts; project-team.spec.ts: independent students consent, own their evidence, restore relationships and transfer maintenance. Fresh corresponding cases passed; exact names/outcomes are retained in the result catalog.

**Remaining action:** Establish persistent deployed shared project with two consenting accepted contributors; disposable evidence is not the submission example.

**Exact fresh case/outcome:**

- `tests/integration/project-team-api.test.ts` ? `project team private HTTP journey two accepted profiles share one URL and only the contributor controls their evidence`: **passed**.

## R3.06 - Initial Maintainer

> The creator becomes the initial project maintainer and can edit shared project information.

**Status: PASS** ? fresh local acceptance; deployment evidence remains separately gated.

**Implementation/source:** src/projects/service.ts (createProject, maintainer guards); src/components/project-editor/ProjectEditor.tsx.

**Routes/UI:** POST /api/v1/student/projects; PATCH /api/v1/student/projects/{id}; private editor.

**Acceptance evidence:** shared-projects.test.ts: creation is atomic, private, creator-maintained; manual-project-api.test.ts: anonymous, unverified, outsider and legacy mutations. Fresh corresponding cases passed; exact names/outcomes are retained in the result catalog.

**Remaining action:** Maintainer-only shared editing decision recorded in release notes.

**Exact fresh case/outcome:**

- `tests/integration/shared-projects.test.ts` ? `shared project domain and database security creation is atomic, private, creator-maintained and accepted without changing personal skills`: **passed**.

## R3.07 - Transfer Maintenance

> The maintainer can transfer maintenance to another accepted contributor without creating a new project record or URL.

**Status: PASS** ? fresh local acceptance; deployment evidence remains separately gated.

**Implementation/source:** src/projects/service.ts; src/projects/team-http.ts; src/components/project-editor/ProjectTeam.tsx.

**Routes/UI:** Team -> Offer maintenance; POST /api/v1/student/projects/{id}/maintainer-transfer; POST /api/v1/student/project-transfers/{id}/response; private inbox.

**Acceptance evidence:** shared-projects.test.ts: transfer requires accepted target and consent; project-team-api.test.ts; project-team.spec.ts. Fresh corresponding cases passed; exact names/outcomes are retained in the result catalog.

**Remaining action:** None for tested behavior; record deployed transfer evidence with unchanged URL.

**Exact fresh case/outcome:**

- `tests/integration/shared-projects.test.ts` ? `shared project domain and database security transfer requires accepted target and consent, preserves ID, revokes old edit authority`: **passed**.

## R3.08 - Invite Contributor

> A maintainer can invite an existing platform student and propose a standardized role.

**Status: PASS** ? fresh local acceptance; deployment evidence remains separately gated.

**Implementation/source:** src/projects/service.ts; src/projects/team-http.ts; src/components/project-editor/ProjectTeam.tsx; drizzle/0009_r3_shared_projects.sql.

**Routes/UI:** /student/projects/{id}/team Add Teammate; GET .../{id}/teammates; POST .../{id}/invitations.

**Acceptance evidence:** shared-projects.test.ts: roles match the official fixture exactly; invitations are recipient-only; project-team.spec.ts. Fresh corresponding cases passed; exact names/outcomes are retained in the result catalog.

**Remaining action:** None; 12 official roles are seeded, legacy role labels preserved.

**Exact fresh case/outcome:**

- `tests/integration/shared-projects.test.ts` ? `shared project domain and database security roles match the official fixture exactly and legacy labels are not rewritten`: **passed**.

## R3.09 - Accept / Decline

> The invited student can accept or decline. They must not be publicly represented as an accepted contributor before acceptance.

**Status: PASS** ? fresh local acceptance; deployment evidence remains separately gated.

**Implementation/source:** src/projects/service.ts; src/components/project-editor/ProjectWorkspace.tsx; src/projects/public-evidence.ts.

**Routes/UI:** /student/project-invitations; POST /api/v1/student/project-memberships/{id}/response.

**Acceptance evidence:** project-team-api.test.ts; shared-projects.test.ts: declined invitations retain history; project-team.spec.ts. Fresh corresponding cases passed; exact names/outcomes are retained in the result catalog.

**Remaining action:** None; only recipient can accept, pending/declined identities excluded publicly.

**Exact fresh case/outcome:**

- `tests/integration/shared-projects.test.ts` ? `shared project domain and database security declined invitations retain history but cannot become contributions`: **passed**.

## R3.10 - Contributor Role

> An accepted contributor has a standardized role plus an optional personal role/contribution description.

**Status: PASS** ? fresh local acceptance; deployment evidence remains separately gated.

**Implementation/source:** src/projects/validation.ts; src/projects/service.ts; src/components/project-editor/ProjectTeam.tsx.

**Routes/UI:** Own contribution form on team page; PATCH /api/v1/student/project-memberships/{id}/contribution.

**Acceptance evidence:** shared-projects.test.ts: contributor alone owns statement/role/visibility; project-team.test.tsx; project-team.spec.ts. Fresh corresponding cases passed; exact names/outcomes are retained in the result catalog.

**Remaining action:** None; one standard role plus optional description, not multiple roles.

**Exact fresh case/outcome:**

- `tests/integration/shared-projects.test.ts` ? `shared project domain and database security contributor alone owns statement/role/visibility; hiding does not remove acceptance`: **passed**.

## R3.11 - Personal Contribution Control

> A contributor controls their own personal contribution statement. No other contributor or maintainer can silently rewrite it.

**Status: PASS** ? fresh local acceptance; deployment evidence remains separately gated.

**Implementation/source:** src/projects/service.ts; src/projects/team-http.ts (strict contribution payload).

**Routes/UI:** Own contribution PATCH endpoint; team page.

**Acceptance evidence:** shared-projects.test.ts: contributor alone owns statement/role/visibility; project-team-api.test.ts; project-team.test.tsx: only own role, statement and visibility. Fresh corresponding cases passed; exact names/outcomes are retained in the result catalog.

**Remaining action:** None; session-derived ownership, independently versioned statement.

**Exact fresh case/outcome:**

- `tests/integration/project-team-api.test.ts` ? `project team private HTTP journey two accepted profiles share one URL and only the contributor controls their evidence`: **passed**.

## R3.12 - Feature/Hide Personally

> A contributor can choose whether the project is featured in their portfolio presentation without deleting the underlying accepted relationship.

**Status: PASS** ? fresh local acceptance; deployment evidence remains separately gated.

**Implementation/source:** src/projects/public-evidence.ts; src/projects/service.ts; src/components/project-editor/ProjectTeam.tsx.

**Routes/UI:** Feature in portfolio and public attribution switches; contribution PATCH; /students/{id}.

**Acceptance evidence:** project-team-api.test.ts; shared-projects.test.ts: hiding does not remove acceptance; project-team.spec.ts. Fresh corresponding cases passed; exact names/outcomes are retained in the result catalog.

**Remaining action:** None; portfolio featuring and shared attribution are separate personal controls.

**Exact fresh case/outcome:**

- `tests/integration/shared-projects.test.ts` ? `shared project domain and database security contributor alone owns statement/role/visibility; hiding does not remove acceptance`: **passed**.

## R3.13 - Removal Protection

> A maintainer cannot silently erase an accepted contributor and their historical relationship. A contributor may remove themselves from personal display.
>
> A disputed removal of the canonical relationship must be recoverable: the relationship is not destroyed by a single unilateral action, and it can be restored. A soft-delete a maintainer can reverse satisfies this; so does a two-party confirmation. Choose one and say which in your release notes.

**Status: PASS** ? fresh local acceptance; deployment evidence remains separately gated.

**Implementation/source:** src/projects/service.ts; src/db/schema.ts (removed/restored metadata); src/components/project-editor/ProjectTeam.tsx.

**Routes/UI:** Team Remove/Restore; POST /api/v1/student/project-memberships/{id}/removal and /restore.

**Acceptance evidence:** shared-projects.test.ts: soft removal and restoration retain relationship ID, acceptance and personal data; project-team.spec.ts. Fresh corresponding cases passed; exact names/outcomes are retained in the result catalog.

**Remaining action:** Maintainer-reversible soft removal decision recorded in release notes; no hard deletion.

**Exact fresh case/outcome:**

- `tests/integration/shared-projects.test.ts` ? `shared project domain and database security soft removal and restoration retain relationship ID, acceptance and personal data`: **passed**.

## R3.14 - Project Technologies Are Separate

> Project-level technologies describe the project and do not automatically become personal skills for every contributor.

**Status: PASS** ? fresh local acceptance; deployment evidence remains separately gated.

**Implementation/source:** src/projects/service.ts; src/projects/public-evidence.ts; src/components/project-editor/ProjectEditor.tsx.

**Routes/UI:** Project technologies editor / import review; profile personal skills remain independent.

**Acceptance evidence:** shared-projects.test.ts: creation ... without changing personal skills; project-import-api.test.ts; manual-project.spec.ts. Fresh corresponding cases passed; exact names/outcomes are retained in the result catalog.

**Remaining action:** None; no automatic GitHub-contributor acceptance or personal-skill inference.

**Exact fresh case/outcome:**

- `tests/integration/shared-projects.test.ts` ? `shared project domain and database security creation is atomic, private, creator-maintained and accepted without changing personal skills`: **passed**.

## R3.15 - Contributor Evidence

> Public project presentation makes each accepted contributor's role understandable.

**Status: PASS** ? fresh local acceptance; deployment evidence remains separately gated.

**Implementation/source:** src/projects/public-evidence.ts; src/components/project-detail/ProjectDetailView.tsx; src/db/queries/project-detail.ts.

**Routes/UI:** /projects/{id}; /api/v1/projects/{id}; accepted public role/statement section.

**Acceptance evidence:** project-team-api.test.ts; project-team.spec.ts; project-detail.spec.ts: canonical project shows ordered contributor roles; unpublished contributor identifier and role stay out. Fresh corresponding cases passed; exact names/outcomes are retained in the result catalog.

**Remaining action:** None; consent, accepted state and eligible published profile all gate attribution.

**Exact fresh case/outcome:**

- `tests/integration/project-team-api.test.ts` ? `project team private HTTP journey private inbox and pending/declined roles never imply public acceptance`: **passed**.

## R3.16 - Duplicate Warning

> When creating a project with a repository URL already connected to an existing project, the user is warned and can view/join the existing project instead of accidentally creating a duplicate.
>
> Name similarity may be used as an additional warning but must not automatically merge records.

**Status: PASS** ? fresh local acceptance; deployment evidence remains separately gated.

**Implementation/source:** src/projects/duplicates.ts; src/projects/repository-url.ts; src/projects/service.ts; src/components/project-editor/DuplicateWarning.tsx; drizzle/0010_r3_project_join_requests.sql.

**Routes/UI:** New editor duplicate warning; POST /api/v1/student/project-duplicates; View /projects/{id}; POST .../projects/{id}/join-requests; join response API and invitation inbox.

**Acceptance evidence:** project-import-api.test.ts: all official duplicate fixtures; concurrent same-repository creates serialize; changed candidate sets; public join requests need maintainer approval; project-import.spec.ts. Fresh corresponding cases passed; exact names/outcomes are retained in the result catalog.

**Remaining action:** None for tested behavior; deployed import/duplicate example pending. Legacy matches are view-only, never ownership claims.

**Exact fresh case/outcome:**

- `tests/integration/project-import-api.test.ts` ? `GitHub duplicate and join API all official duplicate fixtures produce distinct expected outcomes`: **passed**.

## R3.17 - No Silent Lost Update

> If two authorized users edit the same shared project from stale versions, one save must not silently overwrite the other's newer change. A conflict warning/reload/merge approach is acceptable.

**Status: PASS** ? fresh local acceptance; deployment evidence remains separately gated.

**Implementation/source:** src/projects/service.ts; src/projects/http.ts; src/components/project-editor/ProjectEditor.tsx.

**Routes/UI:** Versioned PATCH/publication; 409 conflict with retained input and explicit reload; team contribution/transfer revisions.

**Acceptance evidence:** shared-projects.test.ts: concurrent stale shared saves have one winner; manual-project-api.test.ts: stale update/publication; project-editor.test.tsx; manual-project.spec.ts. Fresh corresponding cases passed; exact names/outcomes are retained in the result catalog.

**Remaining action:** None; two sessions of same maintainer exercise shared-edit concurrency.

**Exact fresh case/outcome:**

- `tests/integration/shared-projects.test.ts` ? `shared project domain and database security concurrent stale shared saves have one winner and atomic child collections`: **passed**.

## R3.18 - Add Demo

> A project can store presentation links separately for at least: - playable web URL; - video/demo URL; - source/repository URL.
>
> Not every project must have every type.

**Status: PASS** ? fresh local acceptance; deployment evidence remains separately gated.

**Implementation/source:** src/db/schema.ts (projectMedia/projectRepositories); src/projects/validation.ts; src/components/project-editor/ProjectEditor.tsx.

**Routes/UI:** Separate playable/video/source/fallback editor fields; project APIs; /projects/{id}.

**Acceptance evidence:** project-demo-api.test.ts; shared-projects.test.ts: typed media and repository identity are independent; project-demo.spec.ts. Fresh corresponding cases passed; exact names/outcomes are retained in the result catalog.

**Remaining action:** None; every type optional, repository never treated as project ID.

**Exact fresh case/outcome:**

- `tests/integration/project-demo-api.test.ts` ? `typed project demo and public privacy all typed evidence persists separately, including hosted fixture paths and public descriptions`: **passed**.

## R3.19 - No Arbitrary Embed Code

> Students provide URLs/structured information, not arbitrary raw iframe/script HTML that is injected into public pages.

**Status: PASS** ? fresh local acceptance; deployment evidence remains separately gated.

**Implementation/source:** src/projects/evidence-url.ts; src/projects/validation.ts; src/components/project-detail/ProjectDemo.tsx; next.config.ts.

**Routes/UI:** URL-only project APIs and safe public rendering; no raw HTML editor.

**Acceptance evidence:** project-evidence-url.test.ts; project-demo-api.test.ts: unsafe URLs/raw embeds; project-demo.test.tsx; project-demo.spec.ts sandbox assertions. Fresh corresponding cases passed; exact names/outcomes are retained in the result catalog.

**Remaining action:** None for tested behavior; embedding remains restricted to reviewed providers and immutable local fixture.

**Exact fresh case/outcome:**

- `tests/integration/project-demo-api.test.ts` ? `typed project demo and public privacy unsafe/local/arbitrary-relative and raw embed inputs never persist`: **passed**.

## R3.20 - Visitor Action

> Where a playable URL exists, the public page offers a clear action such as Play Demo or Launch Experience.

**Status: PASS** ? fresh local acceptance; deployment evidence remains separately gated.

**Implementation/source:** src/components/project-detail/ProjectDemo.tsx; public/fixtures/r3/working_demo.html; next.config.ts.

**Routes/UI:** /projects/{id} Play Demo / Open Externally; /fixtures/r3/working_demo.html.

**Acceptance evidence:** project-demo.spec.ts: official playable fixture interacts inside an isolated frame; actual Interactions: 2 assertion; project-demo.test.tsx. Fresh corresponding cases passed; exact names/outcomes are retained in the result catalog.

**Remaining action:** Verify public deployed static asset/CSP and real interaction; local browser pass is not public hosting evidence.

**Exact fresh case/outcome:**

- `tests/browser/project-demo.spec.ts` ? `official playable fixture interacts inside an isolated frame while fallback and navigation survive failures` [desktop]: **passed**.
- `tests/browser/project-demo.spec.ts` ? `official playable fixture interacts inside an isolated frame while fallback and navigation survive failures` [mobile-390]: **passed**.

## R3.21 - Fallback Evidence

> A project can provide a fallback image/video/link so that it remains understandable when the playable experience is unavailable or unsupported.

**Status: PASS** ? fresh local acceptance; deployment evidence remains separately gated.

**Implementation/source:** src/components/project-detail/ProjectDemo.tsx; public/fixtures/r3/fallback.svg; src/projects/evidence-url.ts.

**Routes/UI:** Project View Fallback region; fallback image/video/link; /fixtures/r3/fallback.svg.

**Acceptance evidence:** project-demo.spec.ts; project-demo.test.tsx; project-demo-api.test.ts (independent optional media). Fresh corresponding cases passed; exact names/outcomes are retained in the result catalog.

**Remaining action:** Verify deployed public fallback URL and assessor reachability.

**Exact fresh case/outcome:**

- `tests/integration/project-demo-api.test.ts` ? `typed project demo and public privacy fallback_image-only projects remain valid without inventing other media`: **passed**.

## R3.22 - Broken Demo Isolation

> A missing/broken demo URL does not destroy the project page, student profile, or site navigation. The visitor can continue using the platform and reach fallback evidence.

**Status: PASS** ? fresh local acceptance; deployment evidence remains separately gated.

**Implementation/source:** src/components/project-detail/ProjectDemo.tsx; src/components/project-detail/ProjectDetailMotion.tsx.

**Routes/UI:** Public project demo panel; fallback, Retry, Stop, navigation, profile/inquiry links.

**Acceptance evidence:** project-demo.spec.ts: DNS-style abort, frame refusal, delayed response, missing fallback asset; project-detail.spec.ts: broken optional asset; release-1-acceptance.spec.ts Scenario E. Fresh corresponding cases passed; exact names/outcomes are retained in the result catalog.

**Remaining action:** No iframe load event claimed as runtime-health proof; live third-party compatibility cannot be guaranteed.

**Exact fresh case/outcome:**

- `tests/browser/project-demo.spec.ts` ? `official playable fixture interacts inside an isolated frame while fallback and navigation survive failures` [desktop]: **passed**.
- `tests/browser/project-demo.spec.ts` ? `official playable fixture interacts inside an isolated frame while fallback and navigation survive failures` [mobile-390]: **passed**.

## R3.23 - Mobile Project Page

> At 390 CSS pixels, project details, contributor roles, and fallback evidence remain usable even if the interactive demo itself is unsuitable for mobile.

**Status: PASS** ? fresh local acceptance; deployment evidence remains separately gated.

**Implementation/source:** src/components/project-detail/project-demo.module.css; src/components/project-detail/project-detail.module.css; src/components/project-editor/project-editor.module.css.

**Routes/UI:** All project/editor/team/import/fallback surfaces at 390 CSS px.

**Acceptance evidence:** project-demo.spec.ts; manual-project.spec.ts; project-team.spec.ts; project-import.spec.ts (mobile-390); project-detail.spec.ts: 390px project page. Fresh corresponding cases passed; exact names/outcomes are retained in the result catalog.

**Remaining action:** Automated Chromium/keyboard/reduced-motion checks plus selected screenshot inspection; physical devices and formal screen-reader audit remain unverified.

**Exact fresh case/outcome:**

- `tests/browser/project-detail.spec.ts` ? `390px project page retains content and has no horizontal overflow` [mobile-390]: **passed**.

## R3.24 - Project Authorization

> An authenticated student who is neither the maintainer nor an authorized editor cannot update another project's shared fields by changing a project identifier in a request.

**Status: PASS** ? fresh local acceptance; deployment evidence remains separately gated.

**Implementation/source:** src/projects/http.ts; src/projects/team-http.ts; src/projects/import-http.ts; src/projects/service.ts.

**Routes/UI:** All private mutation APIs use session, verification, same-origin, strict payload and transaction authorization.

**Acceptance evidence:** manual-project-api.test.ts: anonymous, unverified, outsider and legacy mutations denied; project-team-api.test.ts; project-import-api.test.ts; shared-projects.test.ts. Fresh corresponding cases passed; exact names/outcomes are retained in the result catalog.

**Remaining action:** None for tested behavior; hosted configuration still needs controlled deployment verification.

**Exact fresh case/outcome:**

- `tests/integration/manual-project-api.test.ts` ? `manual project HTTP and public projection anonymous, unverified, outsider and legacy mutations are denied`: **passed**.

## R3.25 - Profile and Discovery Regression

> R1/R2 directory, privacy, profile publication, customization, and employer inquiry continue working.

**Status: PASS** ? fresh local acceptance; deployment evidence remains separately gated.

**Implementation/source:** src/db/queries/inquiry.ts; drizzle/0008_r2_profile_inquiry.sql; src/db/queries/talent.ts; src/profile/service.ts; src/components/student-profile.

**Routes/UI:** /talent; /students/{id}; /inquiry/student/{id}; /inquiry/project/{id}; public inquiry/profile/directory APIs; private profile editor.

**Acceptance evidence:** inquiry-api.test.ts: published UUID profile inquiry persists; null-safe exact source combinations; private-student-profile.spec.ts; full talent/student/inquiry/auth/affiliation suites; release-1-acceptance.spec.ts. Fresh corresponding cases passed; exact names/outcomes are retained in the result catalog.

**Remaining action:** None for tested regression; production OAuth/mail delivery and external services not exercised.

**Exact fresh case/outcome:**

- `tests/integration/inquiry-api.test.ts` ? `contextual employer inquiry API published UUID profile inquiry persists only the trusted profile foreign key and snapshot`: **passed**.

## R3.26 - Stable Project URL

> The canonical project retains one stable public identity/URL when maintenance is transferred or repositories change.

**Status: PASS** ? fresh local acceptance; deployment evidence remains separately gated.

**Implementation/source:** src/projects/service.ts; src/db/schema.ts; src/projects/public-evidence.ts.

**Routes/UI:** Permanent /projects/{id}; repository replacement and consent transfer routes.

**Acceptance evidence:** shared-projects.test.ts: transfer ... preserves ID; manual-project-api.test.ts: zero/multiple/replaced repositories; project-team.spec.ts; populated R2 upgrade snapshot. Fresh corresponding cases passed; exact names/outcomes are retained in the result catalog.

**Remaining action:** None; no migration assigns arbitrary legacy maintainers or changes legacy IDs.

**Exact fresh case/outcome:**

- `tests/integration/shared-projects.test.ts` ? `shared project domain and database security transfer requires accepted target and consent, preserves ID, revokes old edit authority`: **passed**.

## R3.27 - Assessed Version

> The release is tagged R3-submission or instructor-approved equivalent.

**Status: FAIL** ? assessed tag absent.

**Implementation/source:** Git refs; release_submission.md; docs/release-3-deployment-rollback-checklist.md.

**Routes/UI:** Assessed source/deployment/tag identity, not an application route.

**Acceptance evidence:** git tag/ref inspection: R1-submission and R2-submission only; no R3-submission. Ref inspection only; assessed-version acceptance not met.

**Remaining action:** Release blocker: after review and explicit authorization freeze assessed commit, deploy/verify that SHA, then create/verify R3-submission or instructor-approved equivalent. No tag created in Phase 7.
