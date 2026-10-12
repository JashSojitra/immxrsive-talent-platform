# Release 2 private profile design

## M3 boundary

M3 introduces one owner-scoped, structured profile draft for each verified student account. The authenticated GitHub account supplies the internal owner ID; clients cannot select or submit an owner. A unique database constraint prevents duplicate drafts, and every read or update is filtered by that owner ID. Affiliation verification is required at both the page and API boundaries.

Drafts are always stored with `publication_status = unpublished`. The existing Release 1 `students` table and public talent queries remain unchanged, so creating or editing an M3 draft cannot make it discoverable. Profile text is stored as plain text and rendered into form controls, never interpreted as HTML. Skills and availability reference the existing standardized vocabularies; custom skill proposals are deferred.

## Persistence and concurrency

Scalar profile fields live in `student_profiles`. Skills, availability, and professional links use normalized child tables with deterministic display order. Updates replace those child collections inside the same transaction as the owner-scoped profile update. The client sends the last observed `updated_at` value as a revision; stale updates receive a conflict instead of silently overwriting newer work.

## Future milestones

M3 deliberately does not implement resume ingestion, privacy controls, employer preview, publishing, or visual customization. Those later workflows can extend the draft without changing its ownership model.

For M5, publication should be an explicit authenticated state transition with its own validation and audit trail. Public reads can then project only allow-listed fields from published profiles into a public query or view. Because the content already lives in PostgreSQL, publishing changes database state rather than requiring a code redeploy. Until that transition exists, the new tables are private-only and are not joined by any public route.
