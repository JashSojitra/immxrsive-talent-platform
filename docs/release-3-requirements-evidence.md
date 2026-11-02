# Release 3 requirements and evidence plan

Date: October 30, 2026 (America/Toronto). Status: planning only; no R3 implementation or passing-test claims.

Authority: [official Moodle Release 3 requirements PDF](course/r3/6.%20Release%203%20-%20Requirements%20_%20Project%201%20-%20ImmXrsive%20Talent%20and%20Industry%20Platform%20_%20R%20Moodle.pdf), five pages, read in full. Requirements are cumulative with R1/R2. The numbered wording below transcribes the PDF with line wrapping normalized; accompanying clarifications are retained. See [architecture](release-3-architecture.md) for schema, routes, decisions, file manifest, stages, and Phase 1 handoff.

## Exact official requirements and planned acceptance evidence

### R3.01 - Add Project

> A verified student can create a project using one clear Add Project workflow.

Gap: no private project creation UI/API. Plan: one `/student/projects/new` entry with manual and GitHub options; verified server guard; atomic project/creator membership creation. Test: verified success, anonymous 401, unverified 403, failed creation leaves no partial record.

### R3.02 - Manual Creation

> The workflow supports manual entry of at least title, short description, domain/type, project technologies, date/status, public links, and media/demo information.

Gap: existing fixture projects have only title/description/domain and child technologies/assets. Plan: manual editor includes project date and lifecycle status distinct from publication status, multiple public/repository links, and structured media. Test every field persists without GitHub; zero repositories is valid. Exact date precision/status vocabulary is a team design choice, not prescribed by Moodle.

### R3.03 - GitHub Import

> The student can provide/select a public GitHub repository and use repository metadata to propose useful project fields such as name/title, description, repository URL, and language/technology evidence. Imported values remain editable suggestions.

Gap: no importer. Plan: URL-based public repository import into unsaved editable suggestions; explicit apply; manual creation remains available on failure. Test editable title/description, language evidence, cancellation, no silent overwrite, private/missing/throttled/timeout recovery. Repository browsing is optional: providing a URL satisfies the requirement.

### R3.04 - Repository Is Not Project Identity

> A project remains valid if a repository is disconnected or changed. A project can contain zero, one, or multiple repository links.

Partial foundation: stable text `projects.id`; generic repository asset currently limited to one per type. Plan: separate repository child rows; never derive project ID from URL. Test zero/two repositories, disconnect all, rename/change repository, same ID/URL throughout.

### R3.05 - Canonical Shared Project

> A collaborative project is one shared record referenced by multiple student profiles, not separately duplicated project copies for each contributor.

Partial foundation: legacy project/contributor joins. Gap: R2 profiles return no project evidence. Plan: accepted R2 memberships reference existing canonical projects; both public profiles resolve the same ID. Test one database project and two accepted profile references; no copy-on-accept.

### R3.06 - Initial Maintainer

> The creator becomes the initial project maintainer and can edit shared project information.

Official clarification: Who else may edit shared project fields is your team's decision, but it must be a decision: state it in your release notes. "Authorized editor" below means whoever your model grants that right to. Accepted contributors always control their own contribution statement (R3.11) whether or not they can edit shared fields.

Gap: no maintainer identity. Team decision: maintainer-only shared editing; creator is initial accepted contributor and maintainer. Test forged creator/maintainer values rejected; accepted non-maintainer cannot edit shared fields. Existing unmanaged legacy projects are not claimable by arbitrary verified users.

### R3.07 - Transfer Maintenance

> The maintainer can transfer maintenance to another accepted contributor without creating a new project record or URL.

Plan: pending transfer offer accepted by the target, transactionally rechecking current maintainer, accepted target membership, and project version. Test invalid/pending recipient rejected; old maintainer loses shared edit permission; ID unchanged. Target confirmation is a team safeguard, not an explicit course requirement.

### R3.08 - Invite Contributor

> A maintainer can invite an existing platform student and propose a standardized role.

Plan: invite an existing account-owned student profile with a required proposed standard role. Private dashboard inbox; no email system required. Test non-maintainer/unknown target/unknown role rejection; no duplicate active membership. Legacy fixture identities cannot receive actionable invitations because they have no authenticated owner; preserve them as historical contributors, not fabricated accounts.

### R3.09 - Accept / Decline

> The invited student can accept or decline. They must not be publicly represented as an accepted contributor before acceptance.

Plan: recipient-only response after reviewing project and proposed role. Test accept, decline, wrong recipient, replay, no pending identity/role/count leak. Viewing an invitation privately must not publish a draft project.

### R3.10 - Contributor Role

> An accepted contributor has a standardized role plus an optional personal role/contribution description.

Plan: one required standard role per new membership and optional owner-authored description; accepted contributor can select their own standard role. Import all 12 fixture labels with stable IDs. Preserve original legacy role labels without pretending they match the vocabulary. Test valid role, invalid ID, optional description, legacy labels unchanged. Multiple simultaneous roles are optional and deferred.

### R3.11 - Personal Contribution Control

> A contributor controls their own personal contribution statement. No other contributor or maintainer can silently rewrite it.

Plan: separately versioned contribution data, session-derived owner, narrow write schema. Test maintainer/other contributor cannot write statement even through forged IDs or shared-field payloads; invitation updates never overwrite an accepted statement.

### R3.12 - Feature/Hide Personally

> A contributor can choose whether the project is featured in their portfolio presentation without deleting the underlying accepted relationship.

Plan: owner-controlled `featured` flag, independent of accepted status. Hiding from personal portfolio does not revoke membership or automatically hide public attribution on the shared project. Optional separate attribution visibility is a privacy control, distinct from featuring. Test toggle leaves membership and other portfolios unchanged; evidence count follows displayed evidence consistently.

### R3.13 - Removal Protection

> A maintainer cannot silently erase an accepted contributor and their historical relationship. A contributor may remove themselves from personal display.
>
> A disputed removal of the canonical relationship must be recoverable: the relationship is not destroyed by a single unilateral action, and it can be restored. A soft-delete a maintainer can reverse satisfies this; so does a two-party confirmation. Choose one and say which in your release notes.

Team decision: reversible membership soft removal. Preserve accepted timestamp, role, statement, and feature choice; record remover/time/reason; show removal/restoration in private project and member views; maintainer can restore same membership. Contributor can hide personally without canonical removal. Test removal/restoration preserves history and authored data; no physical delete endpoint; last-maintainer removal guarded. Whole-project deletion is not demanded by this requirement.

### R3.14 - Project Technologies Are Separate

> Project-level technologies describe the project and do not automatically become personal skills for every contributor.

Existing foundation: distinct project technologies and personal skill tables, explicit UI explanation. Extend without cross-writing. Test manual/imported technology updates leave all student skills unchanged and do not create directory filter vocabulary.

### R3.15 - Contributor Evidence

> Public project presentation makes each accepted contributor's role understandable.

Existing public contributor section shows legacy roles. Extend with accepted account-owned contributors, standard role and optional personal description. Respect cumulative profile privacy: unpublished or explicitly hidden identities are excluded, not leaked as IDs. Test role/statement rendering and pending/unpublished suppression.

### R3.16 - Duplicate Warning

> When creating a project with a repository URL already connected to an existing project, the user is warned and can view/join the existing project instead of accidentally creating a duplicate.
>
> Name similarity may be used as an additional warning but must not automatically merge records.

Plan: normalize and check every repository URL in manual/import paths, recheck on create, return structured warning with public view and request-to-join actions. Request to join is pending until maintainer approval and student acceptance of a proposed role; it is not ownership or automatic accepted membership. Explicit duplicate acknowledgement may continue distinct creation. Test all three fixture cases plus URL variants and creation races. Title similarity is optional; no merging. Private matches must not disclose restricted project or membership data.

### R3.17 - No Silent Lost Update

> If two authorized users edit the same shared project from stale versions, one save must not silently overwrite the other's newer change. A conflict warning/reload/merge approach is acceptable.

Plan: atomic integer project version check covering child changes; return 409 and retain local draft with reload action. Maintainer-only editing still requires concurrency protection for two sessions and transfer boundaries. Test two concurrent saves from same version, one winner, no mixed child data; old maintainer save after transfer fails.

### R3.18 - Add Demo

> A project can store presentation links separately for at least: - playable web URL; - video/demo URL; - source/repository URL.
>
> Not every project must have every type.

Plan: typed playable/video/source links, multiple repository rows, optional fallback image/video/link. Test independent fields, absent types accepted, source never inferred to be playable. Preserve legacy assets without silently reclassifying old demo URLs.

### R3.19 - No Arbitrary Embed Code

> Students provide URLs/structured information, not arbitrary raw iframe/script HTML that is injected into public pages.

Plan: strict URL-only schemas, no raw embed HTML field; safe React text rendering; sandboxed fixed player component if embedded. Test markup payloads, unsafe schemes, lookalike hosts, credentials and local/private destinations. No `dangerouslySetInnerHTML` path for student media.

### R3.20 - Visitor Action

> Where a playable URL exists, the public page offers a clear action such as Play Demo or Launch Experience.

Plan: clearly named keyboard-operable Play Demo button and external launch option; no automatic execution. Test visible accessible action and actual supplied fixture interaction count. Launching externally also fits the wording; embedding is a team implementation choice.

### R3.21 - Fallback Evidence

> A project can provide a fallback image/video/link so that it remains understandable when the playable experience is unavailable or unsupported.

Plan: support fallback image, video, or link, with human description/alt text; use hosted `fallback.svg` for required QA example. Test visible reachable fallback with demo disabled/broken and missing fallback asset recovery. Requiring fallback on every project is not in the PDF.

### R3.22 - Broken Demo Isolation

> A missing/broken demo URL does not destroy the project page, student profile, or site navigation. The visitor can continue using the platform and reach fallback evidence.

Plan: independent client demo panel, reserved layout, timeout/retry/stop controls and always reachable fallback. No server-render dependency on demo host. Test unavailable URL, framing refusal, slow runtime and script failure; details/profile/navigation/inquiry remain usable. Do not mistake iframe `load` for proof of successful execution.

### R3.23 - Mobile Project Page

> At 390 CSS pixels, project details, contributor roles, and fallback evidence remain usable even if the interactive demo itself is unsuitable for mobile.

Plan: preserve premium layout/motion, responsive stacked controls, bounded IDs/URLs, fallback accessible without demo. Test exact 390px details/roles/fallback, keyboard, no horizontal overflow; demo compatibility itself is not required on every device.

### R3.24 - Project Authorization

> An authenticated student who is neither the maintainer nor an authorized editor cannot update another project's shared fields by changing a project identifier in a request.

Plan: verified session guard plus in-transaction maintainer authorization on every shared mutation including child rows. Test forged path/body IDs, contributor/outsider, mass assignment, revoked/old maintainer. Explicitly test legacy null-maintainer projects fail closed.

### R3.25 - Profile and Discovery Regression

> R1/R2 directory, privacy, profile publication, customization, and employer inquiry continue working.

Known gap first: UUID self-service profile inquiry POST resolves only legacy students and returns 404 despite a working form page. Repair before R3 features with real persisted-submission tests. Preserve R1 search/filter behavior, fixture IDs, hidden fields, resume review, presets, and motion/accessibility fallbacks. Historical R2 passes are not new R3 evidence.

### R3.26 - Stable Project URL

> The canonical project retains one stable public identity/URL when maintenance is transferred or repositories change.

Plan: retain existing `projects.id` and `/projects/{id}`; new UUID strings fit current text key. No rename, repository replacement, transfer or restoration can allocate a new project ID. Test old IDs and relationship FKs before/after upgrade and full shared journey.

### R3.27 - Assessed Version

> The release is tagged R3-submission or instructor-approved equivalent.

Gap: only R1/R2 tags currently exist. Later, after separately authorized release operations, tag exact verified deployed commit; record full SHA and verify remote tag. Never move R1/R2 tags. No tagging in this planning task.

## Required release evidence (PDF page 5)

| Official item | Current state | Planned completion |
| --- | --- | --- |
| Deployed URL | R2 URL documented; R3 not deployed | Verify public R3 deployment and build SHA |
| Repository URL | Existing GitHub remote | Retain and verify assessed source access |
| `R3-submission` tag | Absent | Immutable tag on assessed commit after authorization |
| Release notes/known issues | R2 docs only | `docs/release-3-release-notes.md`, `docs/release-3-known-issues.md`; state shared-editor and removal decisions |
| Shared published project, at least two accepted contributors | No account-owned R3 evidence | Two consenting verified accounts; same project on both portfolios; record public URL/ID |
| Project containing working demo/fallback | Local fixtures only | Host `working_demo.html` and `fallback.svg` publicly; record project and both asset URLs |
| Public repository demonstrating import | Fixture URLs are examples | Choose actual public repository, show editable suggestion review and saved result |
| `release_submission.md` from template | Existing R2 submission | Preserve template fields; update R3 tag, test setup, known issues, evidence links, assessed SHA |
| Completed `evaluation_adapter.json` | R1/R2 mappings exist | Preserve existing keys; extend creation/claiming, roles, duplicate warning, demo/fallback routes and QA setup |

Moodle explicitly requires public hosting: local file paths and Moodle login-protected downloads do not qualify. The small fixture is sufficient; an XR application is not required.

The adapter is route/setup evidence, not proof of passing behavior. The current official `evaluation_adapter_template.json` is not present locally; `evaluation_adapter_r1_template.json` exists. Obtain the current template before freezing final key names; this does not block feature design. "Claiming" in the evidence paragraph is mapped to consent-based joining/accepting a project relationship, not arbitrary takeover of a legacy project; seek instructor clarification if their template uses a different meaning.

## Explicit non-requirements and optional work

The PDF excludes staff verification of official projects, company/partner administration, full audit-history UI, sophisticated duplicate merging, universal XR/device support, advanced capability detection, and heavy-runtime optimization. Do not add these to release acceptance.

Optional/deferred: whole-project soft deletion, multi-role memberships, drag ordering, repository browser, fuzzy title scoring, audit-history UI. Minimal lifecycle timestamps, separate contribution versions, transfer target consent, safe URL validation and sandbox isolation are team safeguards supporting required behavior, not additional Moodle requirements.

## QA status and blockers

No test, migration, application build or production action ran for this documentation task. All R3 feature rows remain planned, not implemented/passed. Actual gaps include date/status fields, role proposal, explicit duplicate view/join path, all private project writes, R2-profile shared evidence, import, demos and release evidence. Existing source supports stable IDs, legacy shared relationships, technologies/skills separation and responsive motion.

Operational prerequisites: revalidate GitHub authentication before authenticated Git operations (previous audit reported invalid token); repair/replace unavailable isolated test DB configuration; resolve documented Windows Playwright teardown before claiming clean exit. Two consenting verified accounts and a public import repository are needed for final release QA. Production and deployed R2 repair status remain unverified here. None blocks writing these plans. Official R3 numbered requirements are now available and no longer a blocker.
