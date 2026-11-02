# Release 3 architecture and staged implementation

Date: October 30, 2026 (America/Toronto). Planning only. Authority and exact R3.01-R3.27 wording: [requirements and evidence](release-3-requirements-evidence.md). No application changes, executed migrations, branch switching, commits, pushes, tags or deployments are part of this task.

## Reconciliation with the initial audit

| Initial recommendation | Official reconciliation |
| --- | --- |
| Manual project editor | Missing date/status: add explicit project date and project lifecycle status, separate from publication (R3.02) |
| Editable GitHub metadata | Confirmed; URL input is enough, repository browser optional (R3.03) |
| Separate repository table | Required zero/one/many; generic assets' one-per-type constraint is insufficient (R3.04) |
| Canonical existing project IDs | Confirmed (R3.05/R3.26); retain all fixture relationships |
| Maintainer-only editing | Valid team decision, must appear in release notes (R3.06) |
| Transfer offer/accept | Meets R3.07; target consent is a team safeguard |
| Invitation | Must propose a standardized role, not just invite identity (R3.08) |
| Many standard roles per person | Unnecessary scope; one required role plus optional own description meets R3.10 |
| Personal visibility/featuring | Separate portfolio featuring from membership and optional public attribution control (R3.12) |
| Reversible removal | Required for canonical relationship disputes, not whole-project deletion; choose maintainer-reversible membership soft removal (R3.13) |
| Duplicate advisory only | Incomplete without view/join alternative; add consent-based join request (R3.16) |
| Integer optimistic locking | Appropriate; test two sessions even with one authorized editor (R3.17) |
| Separate playable/video/source | Confirmed; each type optional (R3.18) |
| Fallback image only | Broaden to fallback image/video/link (R3.21) |
| Embedded demo runtime | A choice, not mandatory; clear launch action and isolation are mandatory (R3.20-R3.23) |
| Project publication | Implied by core journey and published shared evidence; implement independently of profiles |
| Project deletion/audit-history UI | Optional; defer from R3 core |
| Provisional capability numbering | Superseded by official R3.01-R3.27 mapping |

## Baseline and safe future branch start

Observed branch `fix/r2-peer-qa-repair`, HEAD `8c2caedad5645bc822ba3380dfb7898affa352fc`, tracking its matching cached remote branch. Cached `origin/main` is `4c8a64d7313c1401889ae97a1223090d059008de`, the merge of PR #2. HEAD has zero file differences from that merge and is one ancestor commit behind. Local `main` is `7627b70`, four commits behind cached remote main. No tracked modifications were present before this task. Untracked `Release 3 Fixtures-20261030/` and `docs/course/` are user material and must remain intact. This task adds only the two R3 Markdown plans.

Git author is Jash Sojitra <jash221434@gmail.com>. Existing annotated tag refs: `R1-submission` object `9caf0fe58b60982e356c6802bb21a332f04136e7`; `R2-submission` object `88f1220b47a4e8d16123be2776afa9aba9a2b288` (tag object, not the peeled commit). Never move or overwrite either. Cached remote refs are not proof of current server state.

Safest future start, only when branch work is authorized:

1. Review status, ignored files, author, authentication and tag targets. Revalidate GitHub login; previous audit reported invalid CLI token.
2. Fetch `origin` normally, without force-updating tags; inspect latest `origin/main` and its diff. Preserve current branch pointer and verify repairs are merged.
3. Check every existing untracked path against the target tree for collisions. Do not use reset/clean, forced checkout, or blanket stash including user files.
4. If no collision, create `release/r3-development` directly from the freshly verified `origin/main`; there is no need to switch/update stale local main first. Untracked plans/fixtures/PDFs remain in place.
5. If collisions exist, stop before switching; prefer a separate worktree with explicit copies of authorized inputs/docs, retaining original untracked material. Do not move/delete source inputs to solve a checkout collision.
6. Recheck status and unchanged R1/R2 tag targets. No branch switch or fetch was executed here.

## First repair: R2 UUID profile inquiry 404 (R3.25)

`src/app/inquiry/student/[studentId]/page.tsx` can render a published R2 UUID profile through `getPublicStudentProfile`. `src/db/queries/inquiry.ts` resolves POST student sources only in `students`, and `inquiries.student_id` references only that legacy table. Consequently the visible self-service inquiry form cannot persist its submission. The browser journey stops at form/layout checks and misses this failure.

Before R3 features, add nullable `inquiries.student_profile_id` referencing `student_profiles.id` with restrictive deletion. Preserve `source_type`, `source_id`, snapshot name/URL and existing public payload/response. Revise `inquiries_source_fk_matches_type` so a student inquiry has exactly one of legacy student/profile FK matching source ID and no project FK; a project inquiry has only project FK matching source ID. PostgreSQL checks must explicitly test nullability to avoid UNKNOWN passing invalid combinations. Resolve published R2 source using an allowlisted identity/name query without leaking owner IDs or private profile fields. Do not mirror R2 accounts into fixture students.

Plan migration `0008_r2_profile_inquiry.sql` before R3 migration; do not alter migrations 0000-0007. Add a published UUID POST assertion, persisted correct FK/context, unpublished/unknown rejection with no insert, legacy and project inquiry regression, malicious source identifiers, and desktop/390px actual form submit. Preserve existing inquiries and public API shape. No migration execution during this planning task.

## Canonical schema and compatibility

| Table | Planned additions or purpose | Constraints and authority |
| --- | --- | --- |
| `projects` | Preserve text `id`, title, description, domain; add `project_date` date (optional day precision), `project_status` text (`in_progress`, `completed`, `on_hold`), nullable legacy `maintainer_user_id`, publication status, timestamps, integer `version` default 1 | New creator-derived maintainer required by service; null legacy owner is never claimable; version positive; project status distinct from publication |
| `project_repositories` | UUID PK, project FK, original URL, normalized key, optional GitHub repository ID, display order | Unique normalized key within project, indexed across projects; cross-project matches warn rather than globally prohibit; zero rows valid |
| `project_links` | UUID PK, project FK, label, safe URL, display order | Supports general public links without overloading media; bounded count/length |
| `project_roles` | Stable text ID, exact fixture label, order | Seed all 12 `standard_roles.json` values; no personal skill coupling |
| `project_memberships` | UUID PK, project FK, account-owned profile FK, state pending/accepted/declined, proposed role FK, inviter, accepted/responded timestamps, nullable removed time/actor/reason, integer version | One membership per project/profile; preserve acceptance and authored data on removal; target ownership via profile owner |
| `project_contributions` | Membership PK/FK, standard role FK, optional personal description, `featured`, optional `public_attribution_visible`, integer version | Owner-only update; one required standard role on acceptance; featured true by default after explicit acceptance with disclosed behavior; optional attribution visibility true by default |
| `project_join_requests` | Project/profile pair, pending/approved/declined state, timestamps/version | Request grants no accepted membership/edit permission; approval issues proposed-role invitation; one active request per pair |
| `project_maintainer_transfers` | Project FK, offered by/to user, expected project version, pending/accepted/cancelled state, timestamps | Only accepted active target; one pending offer per project; acceptance invalidates competing stale edits |
| `project_media` | UUID PK, project FK, kind playable/video/source/fallback_image/fallback_video/fallback_link, URL, label/alt text, order | At most one playable and primary video; fallback can have multiple types; repository list remains authoritative for repository links |
| Existing legacy joins/assets | Keep `project_contributors.student_id`, roles/order, `project_technologies`, `project_assets` | Preserve fixture rows and IDs; project technologies never mutate personal skills |

Date/status are proposed UI choices: date can remain unknown rather than inventing dates; manual form exposes both fields and tests real values. Final mandatory-field policy must support the requirement without blocking legitimate incomplete drafts. Description is a bounded short description. Public links and optional media are explicit form sections.

No whole-project soft-delete API is in core R3. Publication/unpublication provides reversible public availability. Minimal removal/transfer timestamps support recovery; a full event store and audit-history UI are deferred.

All new server-owned tables need explicit RLS and revocation from PUBLIC/anon/authenticated. Better Auth sessions are not Supabase client identities; do not add permissive client RLS policies in place of service authorization. Review runtime role permissions. Migration 0007/default privileges alone do not prove future tables are protected. Update security tests to distinguish the frozen historical 24-table migration from cumulative current-table protections; never edit historical migration hashes to satisfy a new count.

Upgrade is additive. Existing projects remain published for compatibility and retain unmanaged maintainer nulls; new projects start unpublished. Legacy IDs/roles/assets remain unchanged. Do not infer maintainers from first contributor or make legacy students claimable. Seed roles idempotently. Modify fixture importer before any later import so its delete/recreate logic cannot overwrite user-managed repositories, memberships, technologies or content. Test upgrade from populated R2 state and repeated permitted seeding. Runtime does not load fixture JSON.

## Permission and lifecycle decisions

| Actor | Shared fields | Invitation/transfer | Own contribution | Personal featuring | Canonical membership removal |
| --- | --- | --- | --- | --- | --- |
| Anonymous/unverified | No | No | No | No | No |
| Verified outsider | No; may create own project | May request to join a public project | No | No | No |
| Pending recipient | No | Review own invitation; accept/decline | Only establish own fields on acceptance | Disclosed during acceptance | Decline does not erase history |
| Accepted contributor | No | Can accept offered maintenance | Yes | Yes, without revoking acceptance | Personal hide; no unilateral hard delete |
| Current maintainer | Yes | Invite, decide join requests, offer transfer | Own only | Own only | Soft-remove/restore others; cannot erase authored data |
| Former maintainer | No after transfer | No maintainer powers | Own if still active accepted contributor | Own | Cannot remove current maintainer |

Shared editing and reversible membership removal are required release-note decisions. Removed members retain private access to their own relationship/history and see that they were removed. Restoration retains ID, original acceptance, statement, role and feature preference; restoring cannot override their own attribution hiding. Maintainer must transfer before leaving/removing their own active membership. A maintainer cannot be left without an active accepted relationship. Account deletion should restrict ownership-breaking deletion rather than cascade-delete projects/history; an account deletion UI is outside R3.

Public project eligibility: published project. Public R2 attribution additionally requires active accepted membership, published profile and permitted attribution visibility. Pending/declined/removed/unpublished members must not leak via counts, HTML, metadata or API. Portfolio display further requires `featured`; hiding only the portfolio does not change acceptance. Use consistent visible-evidence counts in directory and profile. Keep legacy publication filtering including the S16 repair. Do not fetch secrets, affiliations or auth tokens into public projections.

Every shared write rechecks session-derived maintainer authority and expected integer version in the same transaction as child updates. Increment once atomically. On 409 preserve unsaved input and offer reload; never silently retry an overwrite. Contribution/membership versions prevent unrelated contributors' edits from contending unnecessarily. Transfer acceptance rechecks target acceptance and updates project owner/version atomically. Old maintainer's pending save must fail authorization/version checks.

## API contract and UI surfaces

Existing public API paths and fields remain compatible: `/api/v1/talent`, `/students/{id}`, `/projects/{id}`, `/inquiries`; public page URLs remain `/students/{id}` and `/projects/{id}`. Public project schema can add structured repository/media/contribution fields while retaining existing `assets`, `contributors`, `technologies`, and permanent `id`.

All paths below use `/api/v1`. Private responses use `private, no-store`; public responses preserve existing no-store behavior. Strict bounded JSON schemas reject unknown ownership/HTML fields. Errors: 401 unauthenticated, 403 insufficient authority/verification, 404 unavailable resource, 409 stale revision/duplicate confirmation, 422 field validation, bounded upstream import errors. Protect custom cookie-authenticated mutations with same-origin/CSRF validation; do not assume the Better Auth handler protects unrelated routes.

| Method/path | UI and required behavior | IDs |
| --- | --- | --- |
| GET/POST `/student/projects` | My Projects; one Add Project creation, creator membership | R3.01-R3.06 |
| GET/PATCH `/student/projects/{projectId}` | Private editor; only maintainer shared changes | R3.06/R3.17/R3.24 |
| POST `/student/projects/{projectId}/publication` | Preview then explicit publish/unpublish; versioned | R3.05/R3.25 |
| POST `/student/projects/{projectId}/invitations` | Add Teammate: existing profile + proposed role | R3.08 |
| GET `/student/project-invitations` | Private inbox with role/project review | R3.09 |
| POST `/student/project-memberships/{id}/response` | Recipient accept/decline | R3.09-R3.10 |
| PATCH `/student/project-memberships/{id}/contribution` | Own role, optional statement, featuring/attribution | R3.10-R3.12 |
| POST `/student/project-memberships/{id}/removal` and `/restore` | Maintainer reversible soft removal; private notice | R3.13 |
| POST `/student/projects/{projectId}/maintainer-transfer` | Offer to active accepted contributor | R3.07 |
| POST `/student/project-transfers/{id}/response` | Target accept or decline offer | R3.07/R3.26 |
| GET `/project-roles` | Exact standard role options | R3.08/R3.10 |
| POST `/student/project-imports/github` | Editable unsaved metadata suggestions | R3.03 |
| POST `/student/project-duplicates` | Preflight every repository, view/join alternative | R3.16 |
| POST `/student/projects/{projectId}/join-requests` | Request invitation, no auto acceptance | R3.16 |
| POST `/student/project-join-requests/{id}/response` | Maintainer approve with proposed role or decline | R3.08/R3.16 |

UI pages: `/student/projects`, `/student/projects/new`, `/student/projects/{projectId}/edit`, `/student/projects/{projectId}/preview`, plus dashboard invitation/transfer/request panels. Extend existing public project and profile views, not duplicate copies. Labels should be Add Project, Add Teammate, Accept, Play Demo, Hide from my portfolio; do not expose internal version/state machinery as the primary experience.

Invitation targeting: provide existing profile ID/public-profile selection; a private account-owned profile can be targeted by exact shared ID without exposing an unpublished directory. No private email lookup or synthetic fixture account creation. Public identity search returns published profiles only. Legacy fixture profiles remain read-only historical evidence and cannot be authenticated invitation recipients.

## Import, duplicates and demo behavior

Repository normalization: parse URL, exact supported host, reject credentials/ports/encoded separators and malformed paths; normalize owner/repository case, trailing slash and `.git`, strip benign query/fragment decoration consistently. Non-GitHub public repository links remain allowed with safe URL validation; import is GitHub-only. Imported repository ID helps rename detection but never becomes project identity. Server constructs fixed `api.github.com` metadata/languages endpoints, bounds time/bytes/redirects, returns plain data suggestions, does not execute repository content or fetch arbitrary README URLs. No expanded login OAuth scope; do not reuse student OAuth tokens for public import. Manual editor survives upstream errors.

Duplicate matching checks every repository in manual and import flows, indexes normalized keys, rechecks at create under transaction/serialization for matching keys. A new exact match returns warning before insert unless the submitted acknowledgement matches the same candidate set; changed candidates require renewed acknowledgement. Never globally unique repository keys across projects: distinct justified projects may share a source. Public warning offers View project and Request to join. Approved request becomes invitation with role and explicit recipient acceptance. No merge, automatic ownership or inferred contribution. Private matches return generic non-identifying guidance and do not reveal titles/people; public view/join is available where permitted. Similar-title warning is optional. All three duplicate fixture cases get deterministic seeded preconditions; example-org URLs are not live import proof.

URLs: accept HTTPS for public playable/video/source/fallback links, reject script/data/file schemes, credentials, malformed hosts, local/private literal addresses and localhost; test-only local exceptions must be unreachable in production. For external URLs avoid server probing/fetching, so URL storage is not an SSRF path. Use a small reviewed embed-host policy; other HTTPS playable links launch externally. DNS-based private-host restrictions require controlled resolution if any later server fetch is introduced. Do not claim arbitrary third-party content is trustworthy just because its URL is valid.

Player: explicit launch, titled iframe where permitted, minimal sandbox with scripts only as needed, no same-origin privilege, top-navigation/download/camera/microphone by default. Never student-provided iframe markup/srcdoc. Fallback/details/navigation outside player and always reachable; reserve aspect ratio, retry/stop/external open controls. Cross-origin iframe load/error cannot prove health; timeout is an uncertain slow/unavailable state, not a certified broken result. Controlled fixture readiness messages must verify source and a per-launch nonce (opaque sandbox origins cannot authenticate solely by origin). No advanced capability detection or universal XR support.

Host supplied demo and SVG publicly during later approved release work. Same deployment static hosting is permitted by Moodle; separate static origin is optional defense-in-depth. Preserve exact fixture assets under a planned public fixture path and do not confuse local test URL with release evidence. A link-only project or missing playable must still render. Fallback supports image/video/link; image failure yields text and remaining links.

## File manifest and implementation stages

### Phase 1: R2 regression repair only

Modify `src/db/schema.ts`, `src/db/queries/inquiry.ts`, `tests/integration/inquiry-api.test.ts`, `tests/browser/private-student-profile.spec.ts`. Add `drizzle/0008_r2_profile_inquiry.sql` and reviewed Drizzle journal/snapshot metadata; modify inquiry validation/API tests only if needed without changing public contract. Update `docs/r2-peer-qa-repair-and-retest.md` with honest new evidence. Do not implement R3 features in this phase.

### Phase 2: R3 foundation and private manual workflow

Modify `src/db/schema.ts`, `src/fixtures/import.ts`, `src/app/student/dashboard/page.tsx`, `tests/unit/database-security-hardening.test.ts`. Add `drizzle/0009_r3_shared_projects.sql` and generated metadata after inspecting actual migration numbering. Add `src/projects/service.ts`, `authorization.ts`, `http.ts`, `src/validation/project.ts`, `src/validation/project-url.ts`; role seeding in migration. Add project list/create/detail/publication route files under `src/app/api/v1/student/projects/`; `src/app/api/v1/project-roles/route.ts`. Add pages under `src/app/student/projects/` (`page.tsx`, `new/page.tsx`, `[projectId]/edit/page.tsx`, `[projectId]/preview/page.tsx`). Add `src/components/project-editor/ProjectEditor.tsx` and `project-editor.module.css`. Acceptance: all manual fields, zero/multiple repositories, initial maintainer, draft/publish, ID stability, forbidden legacy writes.

### Phase 3: Collaboration, ownership and public evidence

Add `src/projects/memberships.ts`, `contributions.ts`, `transfers.ts`; route files for invitations, invitation inbox, membership response/contribution/removal/restore, transfer offer/response, join requests/response as listed above. Add `ContributorManager.tsx`, `ContributionEditor.tsx`, `ProjectInvitations.tsx` under `src/components/project-editor/`. Modify `src/db/queries/project-detail.ts`, `src/db/queries/student-profile.ts`, `src/db/queries/talent.ts`, `src/profile/public-projection.ts`, `src/db/queries/inquiry.ts` (published project gating), `src/components/project-detail/ProjectDetailView.tsx`, `src/components/student-profile/StudentProfileView.tsx` and their CSS modules. Acceptance: two accounts, same canonical project, proposed role, consent, own statement, personal hide, recoverable removal, transfer, integer conflicts.

### Phase 4: GitHub suggestions and duplicate alternative

Add `src/projects/github-import.ts`, `repository-url.ts`, `duplicates.ts`; `src/app/api/v1/student/project-imports/github/route.ts`, `src/app/api/v1/student/project-duplicates/route.ts`; `GitHubImportPanel.tsx`, `DuplicateWarning.tsx` under editor components. Integrate join request UI/API from Phase 3 into warning. Acceptance: editable/cancellable suggestions, all normalized URLs, all fixture duplicate cases, creation race recheck, no automatic merge/skill transfer.

### Phase 5: Public demo/fallback and responsive polish

Add `src/components/project-detail/ProjectDemo.tsx`, `project-demo.module.css`; modify project editor/media validation and projection, public detail view/CSS, `ProjectDetailMotion.tsx` only where layout refresh is needed. Plan copies `public/fixtures/r3/working_demo.html`, `public/fixtures/r3/fallback.svg` and JSON test fixtures `data/fixtures/r3/standard_roles.json`, `project_duplicate_cases.json`, preserving supplied sources. No fixture copies are made in this documentation task. Acceptance: real click interaction, video/source separation, fallback types, broken isolation and 390px. Keep premium GSAP composition, progressive readable rendering, cleanup and reduced-motion fallback; new panels must not trap focus or stay hidden when animation fails.

### Phase 6: Regression and release evidence

Add `docs/release-3-release-notes.md`, `release-3-known-issues.md`, `release-3-peer-tester-instructions.md`, `release-3-migration-plan.md`, `release-3-qa-results.md`; update these two R3 plans, `README.md`, `release_submission.md`, `evaluation_adapter.json` only with verified outcomes. No automatic production migration in build/deploy. Rehearse additive upgrades on disposable populated R2 database, review backup/pre/postchecks and application rollback compatibility. Later commit/push/deploy/tag require authorization; do not execute as a consequence of this plan alone.

## Acceptance test files and QA matrix

Add unit suites `tests/unit/project-validation.test.ts`, `repository-url.test.ts`, `github-import.test.ts`, `project-duplicates.test.ts`, `project-url.test.ts`. Add integration suites `tests/integration/shared-project-api.test.ts`, `project-memberships.test.ts`, `project-contributions.test.ts`, `project-transfer.test.ts`, `project-concurrency.test.ts`, `project-public-projection.test.ts`, `r3-migration.test.ts`. Add frontend suites `tests/frontend/project-editor.test.tsx`, `project-contributions.test.tsx`, `github-import.test.tsx`, `project-demo.test.tsx`. Add browser suites `tests/browser/shared-projects.spec.ts`, `project-import.spec.ts`, `project-demo.spec.ts`. Extend existing inquiry, profile, directory, project-detail, fixture-import, privacy and R1 acceptance suites. Add CSRF/forged-ID tests to private route coverage.

Update cleanup/setup lists in affected integration and browser suites for new FKs, never disable RLS or point tests at production to make them pass. Existing integration tests migrate/clear their target; browser startup also migrates. Guard test/development/production isolation before execution. Historical report notes stale hosted test target and Windows server teardown hang: get a clean isolated test setup and clean runner exit before reporting a release gate.

| Dimension | Acceptance |
| --- | --- |
| Roles | Anonymous, unverified, outsider, pending, accepted, removed, maintainer, former maintainer; every mutation tested |
| Manual/import | All R3.02 fields; editable suggestions; zero/multiple repositories; failures retain form |
| Consent/history | Pending private; decline; own statements; hide without removal; soft removal and exact restoration |
| Shared identity | One project/two profiles; legacy IDs/FKs unchanged; repository disconnect and maintenance transfer |
| Concurrency | Two sessions same version, one save wins, second 409; no mixed child rows; transfer versus old save |
| Duplicates | Exact normalized repo warning with usable view/join; all three fixtures; no merge; private match no leak |
| Demo | Hosted fixture interaction; absent/blocked/slow/broken demo; fallback image/video/link; broken fallback; navigation remains usable |
| 390px | Details/roles/fallback/action controls readable; long IDs/URLs wrap; no horizontal document overflow |
| Accessibility/design | Keyboard, labels/errors, focus recovery, iframe title, alt text, reduced motion, animation failure, existing premium composition |
| Cumulative | R1 search expressions/filter semantics, R2 privacy/publication/customization/resume, real persisted employer inquiries |
| Upgrade/security | Populated R2 upgrade, constraints/null checks, RLS/ACL for every new table, fixture importer user-data preservation |
| Release | Public URLs accessible logged out; two accepted contributors; real public import; adapter routes verified; exact deployed SHA/tag |

## Existing submission/adapter contract and exact planned changes

`release_submission.md` uses the local template headings: Release, Team, Deployment, Repository, Release tag, Commit, Adapter, Known issues, Test notes, Test accounts, Release-specific evidence. Keep these names. Change Release to R3 and Release tag to R3-submission only when preparing the real submission; retain team-01/repository unless intentionally changed. Record public deployment, full assessed SHA/tag target, actual tests/skips/limitations and safe account setup. Add links/IDs for shared project with two accepted contributors, demo/fallback project and public assets, import repository, release notes/known issues and requirement evidence. State maintainer-only shared editing and maintainer-reversible membership soft removal in release notes. Preserve archived R1/R2 evidence through historical docs/tags; do not leave R2 results presented as R3 results or commit a guessed deployment SHA. The final SHA can be supplied in submission metadata after freeze to avoid self-reference in its own commit.

`evaluation_adapter.json` current root contract: `directory_endpoint`, `student_detail_endpoint`, `project_detail_endpoint`, `student_page_route`, `project_page_route`, `query_parameters` (`text`, `skill`, `availability`, `status`), `directory_results_path`, `id_field`, `skills_field`, `contributors_field`, `optional_broken_project_id`, and `release_2`. Preserve all existing values/keys and release_2 route mappings unless an actual compatible implementation change requires an update. Existing optional broken fixture is P07; do not silently replace it with the R3 example.

Proposed additive `release_3` object (team schema, subject to official current template reconciliation):

| Key | Planned value |
| --- | --- |
| `my_projects_route` | `/student/projects` |
| `project_creation_route` | `/student/projects/new` |
| `project_creation_api` | `/api/v1/student/projects` |
| `project_editor_route` | `/student/projects/{id}/edit` |
| `project_preview_route` | `/student/projects/{id}/preview` |
| `project_publication_api` | `/api/v1/student/projects/{id}/publication` |
| `github_import_api` | `/api/v1/student/project-imports/github` |
| `contributor_roles_api` | `/api/v1/project-roles` |
| `contributor_invitation_api` | `/api/v1/student/projects/{id}/invitations` |
| `invitation_inbox_api` | `/api/v1/student/project-invitations` |
| `contributor_response_api` | `/api/v1/student/project-memberships/{id}/response` |
| `contribution_api` | `/api/v1/student/project-memberships/{id}/contribution` |
| `membership_removal_api`, `membership_restore_api` | `/api/v1/student/project-memberships/{id}/removal`, `/api/v1/student/project-memberships/{id}/restore` |
| `project_claiming_route` | `/projects/{id}`; Request to join action, not maintainer takeover |
| `project_join_request_api` | `/api/v1/student/projects/{id}/join-requests` |
| `duplicate_warning_api` | `/api/v1/student/project-duplicates` |
| `duplicate_warning_route` | `/student/projects/new`; both manual and import branches |
| `maintainer_transfer_api`, `transfer_response_api` | `/api/v1/student/projects/{id}/maintainer-transfer`, `/api/v1/student/project-transfers/{id}/response` |
| `demo_fallback_surface` | `/projects/{id}`; Play Demo/fallback section |
| `fixture_directory` | `data/fixtures/r3` after approved fixture copies |
| `shared_published_project_id`, `demo_project_id` | Actual seeded-by-consenting-users QA IDs, supplied at freeze |
| `public_import_repository_url` | Actual successful public repository URL, supplied at freeze |
| `working_demo_url`, `fallback_url` | Real public hosted fixture URLs, supplied at freeze |
| `setup_instructions` | `docs/release-3-peer-tester-instructions.md` |

No placeholder example ID should be shipped as evidence. Fetch the official current `evaluation_adapter_template.json` from Submission Templates before final packaging: only the R1 template is available locally. The PDF does not prescribe key names, framework or URL shape; final object must reconcile any template-required fields. If "claiming" has additional template-defined semantics, clarify without granting arbitrary legacy ownership.

## Concrete blockers and scope boundaries

The numbered PDF mapping is complete; no requirement source blocker remains. Current adapter template is missing locally, blocking only final adapter contract confirmation. GitHub token validity, isolated database availability, Windows Playwright exit behavior, two consenting verified QA accounts, public import repository selection, public fixture hosting and deployed commit verification are future execution/release prerequisites, not reasons to invent feature requirements. No production contact or secret inspection is needed for this planning task.

## Implementation-ready Phase 1 prompt (not executed)

> Implement only the R2 UUID self-service profile inquiry regression repair described in docs/release-3-architecture.md and R3.25 in docs/release-3-requirements-evidence.md. First inspect current status, applicable repository instructions, Git author, cached/fresh main and tag targets. Preserve all untracked fixtures/course PDFs/planning docs. Revalidate GitHub access and fetch origin normally if available; if the remote cannot be verified, report that limitation before claiming latest-main status. When safe, create release/r3-development from verified latest merged origin/main without resetting/cleaning or moving R1/R2 tags; check untracked collisions first and use an isolated worktree if needed. Repair inquiry source resolution and persistence for published student_profiles UUIDs while preserving legacy student/project behavior and the existing request/response contract. Add a restrictive nullable student_profile_id FK and exact-one-source/null-safe CHECK in a new reviewed migration after 0007; never edit historical migrations. Resolve identity/name from published profiles server-side and retain source snapshots. Test successful UUID POST and actual stored FK/context, unpublished/unknown rejection with no insert, legacy/project success, invalid combinations and desktop/390px form submission. Preserve privacy and existing UUID layout repairs. Run credential-free checks first; execute database/browser tests only against a verified disposable isolated non-production target, never development/production or a fallback URL. Do not execute migrations against development/production, import production fixtures, modify R3 feature code, commit, push, deploy or tag. Report exact changed files, migration review notes, passing/failing/skipped tests and any environmental blockers honestly. Update R2 repair evidence with observed results; stop after Phase 1 for review.
