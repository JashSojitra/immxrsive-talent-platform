# Project credits and screenshots

## Production prerequisite

This PR is stacked on `feat/updates-home-world` (#21) and requires PR A's media storage. **Apply the new generated migration `0015_purple_hiroim.sql` before merging/deploying this PR.** It adds the private `admin_credit_emails` and `project_screenshots` tables, RLS/grant hardening, and the `project_screenshot` media kind. No production migration or data write was performed for this PR.

Use the same verified procedure as [the production bootstrap](../production-admin-bootstrap-2026-11-17.md) and [Updates migration evidence](../production-updates-migration-2026-11-26.md): independently verify the exact production project and committed journal hashes; take an encrypted, restricted backup and verify its restore; use the migration connection to apply only missing migration(s); then verify tables, constraints, RLS/grants and the journal count. Do not run fixtures against production. With only 0015 pending after PR A's migration, the journal should advance from 15 to 16 entries.

## Staff credits

- Every credit has a required public display name and role. Those remain visible even before a student joins. Published admin-managed projects remain in the showcase independently of student accounts.
- Assign either an existing profile ID or an Algoma email. The picker searches all profiles by name and never returns account emails. Email validation uses the same approved-domain configuration as student affiliation verification; addresses are normalized to lowercase.
- Email values are stored separately from public project JSON and audit snapshots. Only the authenticated staff editor receives them. Public pages, APIs, student credit cards and public client props contain display names/roles and eligible profile URLs, never credit emails.
- Bulk entry accepts one `email, role` pair per line. Add each person's public display name to the resulting row before saving. No name is invented from an email address.
- Saved rows show “Linked to <name>”, “Profile not public yet”, or “Waiting for this student to join”. Existing private or unverified profiles can be assigned directly; public links still require a published, verified profile.
- Matching verified email affiliations are resolved at read time and persisted in `admin_credit_links` on verification, session creation and staff credit saves. The operation is idempotent and serialized with project edits. Changing/removing an email removes its old stored match; other legitimate credits are preserved. A matched verified account without a profile receives a blank **private** profile, so its link can be stored without publishing personal information.
- “Projects you're credited on” is read-only and remains on the student's private dashboard while their profile is unpublished. Unpublished project titles are plain text there. Public profile credits and contributor links follow both project and profile publication filters. Credits grant no project membership or editing rights and require no student approval.

## Screenshots

Save the project first. In **Screenshots**, choose several images or drop them into the upload area, enter required alt text, optionally add captions, then upload. Up to ten images can be attached; the limit is checked under a project lock, including concurrent uploads. Alt text is required and limited to 300 characters; captions have the same limit.

Uploads reuse the existing authenticated, origin-checked, rate-limited Sharp pipeline: JPG/PNG/WebP up to 8 MB and 40 megapixels, metadata removed, WebP output, maximum width 1920. Maintainers use the project editor; accepted contributors use the same control in their team workspace. Pending/removed members and outsiders cannot edit. Staff manage screenshots on admin-managed projects. Reordering, description edits and deletion save separately, with conflict detection to preserve another editor's work.

Uploaded images join the public gallery; existing HTTPS gallery URLs continue to work. The first uploaded screenshot supplies the card thumbnail when no explicit thumbnail exists. A native modal lightbox supports Escape, arrow keys, keyboard focus containment and focus return, with no animation to disable for reduced motion. Private screenshot bytes require authorized access; published screenshot responses revalidate so unpublishing is respected.

Verification covers future credits, verification/sign-in persistence, email replacement/removal, mixed team visibility, email exclusion from public projections, screenshot image processing and permissions, concurrent capacity, reorder/delete conflicts, and desktop/mobile gallery/lightbox journeys. All screenshot evidence uses disposable local fixtures.
