# Release 3 controlled deployment and rollback checklist

**NOT EXECUTED. No deployment, commit, push, production migration or tag is authorized by this document.** Date: 2026-11-01. Stop for review after Phase 7.

## Before requesting a release action

- Review the complete existing uncommitted R3 diff and Phase 7 evidence, including new/untracked application files and migrations. Obtain the latest official adapter template and reconcile the provisional extension. Resolve any assessor contract differences without inventing endpoints or claiming legacy ownership.
- Obtain approval for the exact source freeze and later release actions. Keep `feat/release-3`, R1/R2 tags and prior work intact. Record full assessed commit SHA only after an authorized commit exists; current HEAD is not an R3 release artifact. Re-run applicable QA if application/schema changes after this report.
- Identify the exact deployment project/environment and database using a separate explicit operational approval. Never run the disposable driver or its test cleanup against that environment. Inspect environment presence without printing values: canonical auth origin, signing secret, OAuth callbacks, approved verification mail configuration, runtime and migration connection roles. No test preload/mock flags or synthetic credentials may enter deployment.
- Review additive 0008–0010 SQL and current target migration journal/checksums read-only under authorization. Take an approved backup and verify a restoration procedure and maintenance window before any production migration. Confirm applicable PostgreSQL/Supabase role/extension behavior in an authorized staging environment; local emulated client roles are not proof of hosted configuration.

## Controlled release sequence, only after approval

1. Freeze/review the assessed source, authorize commit/push and record full SHA. Produce the build from that exact SHA. Review dependency/environment differences and configuration drift.
2. Authorize the named database change separately. Conclusively verify target identity and backup readiness. Apply only missing forward migrations once through the migration journal; never rewrite checksums, reset databases or import QA fixtures into production. Validate existing legacy IDs/contributors, inquiry sources, new constraints, all new-table RLS/privileges and legacy null ownership.
3. Authorize deployment of the exact SHA. Verify deployment-reported source identity and public URL, auth/callback/mail behavior, private route no-store/noindex, directory/privacy/inquiries and project operations. If identity or authorization is uncertain, stop rather than inferring success from cached refs or a build log.
4. Through normal UI with consenting human accounts, establish the persistent two-accepted-contributor shared project and both published profiles. Verify transfer and repository edits preserve URL, and ensure no pending/private identity is exposed. Record evidence without credentials.
5. Demonstrate real public GitHub import with editable suggestions, duplicate View/Request to Join, course HTML `Interactions: 2`, accessible public fallback and 390px navigation. Verify static asset/CSP headers on this deployment. A local fixture path or authenticated Moodle download is insufficient public hosting evidence.
6. Update submission and reconciled adapter with verified deployed URL, SHA, actual project/profile/media/repository evidence and appropriately private evaluator access instructions. Validate JSON/contract and verify all links. Preserve provenance of local versus public screenshots.
7. Only with tagging authorization, create immutable `R3-submission` (or instructor-approved equivalent) on the exact assessed/deployed SHA; verify local and remote peeled tag targets. Do not move R1/R2 tags. Recheck submission points to that SHA and tag before course submission.

## Stop and rollback conditions

Stop rollout for identity/checksum mismatch, failed migration/constraint, unauthorized writes, private data exposure, failing UUID/project inquiries, broken auth, or user-visible navigation/demo isolation failures. Record sanitized diagnostics; never expose connection strings or student private data.

- Prefer application rollback to a reviewed compatible build while retaining additive database schema and new records. Test compatibility before selecting that build: an R2 build has neither R3 behavior nor the UUID inquiry repair, so blindly reverting to the old baseline is not a satisfactory recovery plan.
- Disable affected operations or use an approved maintenance state if compatibility or privacy cannot be assured. Restore app/environment configuration from the recorded known-good state under operational approval.
- There are no down migrations in this release. Do not drop R3 tables/columns or erase new contributions/inquiries to simulate rollback. A full database restoration is a separate last-resort approved recovery action, with explicit assessment of post-backup data loss and preservation/export of new legitimate records.
- Verify auth, privacy, public directory/profile/project contracts, existing IDs, inquiry persistence and security privileges after recovery. Document actual deployed SHA/database journal and communicate unresolved issues through the authorized release process.

This checklist is preparation, not evidence that backup, migration, production QA or rollback rehearsal has occurred.
