# Release 3 release notes — review draft

Date: 2026-11-01. Branch `feat/release-3`. The assessed commit, deployment and `R3-submission` tag are not established. See [final QA](release-3-final-qa.md) and [traceability](release-3-final-traceability.md).

Verified students can manually create, preview, edit and explicitly publish canonical projects. Permanent project IDs support zero, one or multiple independent repository links. Drafts stay private. Shared edits and publication use optimistic revisions; stale saves return recoverable conflicts and retain unsaved input.

Public GitHub metadata is explicitly applied as editable suggestions. Failed imports leave manual creation available. Normalized repository matches warn before creation and are rechecked transactionally. Eligible public matches offer View Project and Request to Join. Maintainer approval creates an invitation; the student must independently accept its proposed role. Similar titles are advisory. No automatic merging or legacy ownership claiming occurs.

**Shared-field editing decision (R3.06): maintainer only.** The creator is the initial maintainer. Accepted contributors own their standardized role, optional role description, personal statement, portfolio featuring and public attribution preferences. Maintainers cannot silently rewrite those fields. Maintenance transfer requires an accepted eligible recipient's consent, rechecks the revision, preserves the canonical URL and revokes the outgoing maintainer's shared editing authority.

**Removal decision (R3.13): maintainer-reversible membership soft removal.** Removal preserves membership ID, original acceptance, authored contribution and display preferences, with latest removal/restoration metadata. The maintainer can restore the same relationship. Contributors can independently hide personal presentation. There is no unilateral hard-delete endpoint or whole-project deletion feature.

Public evidence requires a published project, accepted visible relationship and eligible published contributor profile. Featuring is independent of shared attribution. Project technologies never automatically become personal skills; GitHub contributors never automatically become accepted platform contributors. Legacy fixture IDs, relationships and role labels are preserved without arbitrary account ownership.

Playable, video, source/repository and fallback image/video/link evidence are stored separately. Explicit Play/Launch, video, source and fallback actions preserve visitor choice. Reviewed iframe providers and the supplied course demo use a scripts-only sandbox. Students cannot inject embed HTML. Load completion is not proof of a working demo; uncertainty retains fallback, stop/retry, details and navigation. Static course assets under `/fixtures/r3/` await public deployment verification.

The R2 UUID inquiry repair supports eligible published account-owned profiles, legacy students and project-only inquiries. Additive migrations `0008`–`0010` preserve historical SQL/checksums and existing relationships. No production migration occurred here.

Fresh Phase 7: 158 integration/API, 230 unit/frontend and 125 browser cases passed; 5 intentional desktop skips for mobile-only assertions; zero failures/flaky cases. Migration, security, fixture and build results are in final QA. [Known issues](release-3-known-issues.md) distinguish limitations from mandatory missing submission evidence. This draft does not authorize a release action.
