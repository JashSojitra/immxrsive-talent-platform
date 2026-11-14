# R3.1 release readiness and operational handoff

Remote audit prepared 2026-11-12; local Windows verification completed 2026-11-13. **No production step below has been executed or authorized.** Audit: [pre-merge review](r3-1-premerge-security-review.md). Source: `feat/r3-1-xr-studio`, caller original HEAD `388497c`; integration target `main`. Do not use the sanitized transport commit as release provenance. Existing `R3-submission` is immutable.

## Release gates

PR disposition: **GO for a final reviewed commit/PR**. Production disposition: **NO-GO** until remaining gates have evidence and the owner separately authorizes production actions.

- [x] Verify original branch and baseline `388497c2b5d99f402071af9e79311c4fe7a6f5bd`; review/apply the seven-file independent audit patch. Local lock review found no new cycle or privilege inconsistency in supported paths. Nothing committed, staged, merged, pushed or deployed.
- [x] Run all six Studio PostgreSQL concurrency regressions in fresh labelled loopback PostgreSQL 17: three writer-first audit cases plus three local read-first lifetime cases. Studio integration 21/21, no skips.
- [x] Complete Windows matrix using the unchanged safe runner: 200 unit, 100 frontend, 179 integration, 135 browser passed; five unchanged intentional desktop exclusions for mobile-only scenarios. Migrations, typecheck, lint and production build passed. No failures/flakes.
- [x] Verify the four original tracked resume PDFs are present and tested. No fixture fabrication or source restoration was needed.
- [x] Preserve all 24 migration SQL/metadata bytes, `.env.local`, unrelated `docs/course/r2/`, branch HEAD and `R3-submission` target `cadaa1301583ea9884ebf3c8ffa16529d7d1792f`.
- [x] Preserve the pre-existing Docker container. Fresh test containers cleaned up with exit 0; persistent sanitized logs and results are linked in the security report.
- [ ] Resolve or document an approved evidence-based disposition for current dependency advisories. Read-only npm audit reported 11 package entries (7 moderate / 3 high / 1 critical); not all are proven runtime-reachable. See the security report for Sharp mitigation and remaining Next/Zod assessment. No dependencies changed.
- [ ] Complete authenticated staff lifecycle, populated-gallery, long-content, mobile and screen-reader/focus QA below. Browser smoke is not complete staff-persona certification.
- [ ] Verify hosted database identity, journal/checksums, effective roles/grants, backup integrity, timed restoration and compatible rollback build. Obtain separate production migration/bootstrap/deployment authorization.
- [ ] Confirm product expectations for reviewer access to canonical title/description after withdrawal; retained audit/history is intentional.
- [ ] Track R3 issues #3/#5 and official course evidence separately; no issue updates, production-data repairs or evidence closure are claimed.

## Migration 0011 preflight

1. Freeze the approved full commit SHA and migration SHA-256 manifest. Compare all 0000–0011 SQL, snapshots and journal with the audited source. Never edit historical migrations or insert fake journal rows. The hardening patch itself needs no new migration.
2. Under separately approved read-only production access, conclusively verify service/project/environment identity, PostgreSQL version, current database/user and connection route. Record redacted identity and operator, not credentials. Confirm normal runtime and migration accounts are distinct where supported and know the RLS/table-owner boundary.
3. Inspect actual `drizzle.__drizzle_migrations` and reconcile timestamps/hashes through 0010. If 0011 already exists, verify its exact hash and installed objects; do not reapply blindly. Stop for missing/conflicting entries or partial/manual objects. The source presence of 0011 does not establish deployment state.
4. Verify `public.projects` and `auth_users`, their referenced columns/keys and existing migration prerequisites; PostgreSQL gen_random_uuid availability; existing `anon` and `authenticated` roles. Migration's REVOKE statements depend on those roles. Inspect effective inherited/default privileges, schema CREATE rights, and trusted role memberships. Never grant browser access to repair a server configuration failure.
5. Rehearse all forward migrations once against a fresh disposable target with equivalent PostgreSQL roles/version using existing guards (`src/db/safety.ts`). Inspect constraints, indexes, RLS, all table privileges and operational/trigger function execute rights. Exercise insert/update provenance, stale-owner publish denial, audit UPDATE/DELETE/TRUNCATE denial, assignment/revocation, last-super-admin preservation and concurrent requests.
6. Confirm backup and restore evidence below, maintenance/change window, application rollback build, migration duration/lock expectations and stop owner. The trusted runtime must support short transactions and row locking; don't replace transaction behavior with untrusted browser RPC.
7. After separate migration authorization, use the owning project's approved journal-aware production process, applying only missing 0011 once. Development migration guards intentionally reject protected production; do not bypass them by editing safety code or setting test flags. Do not use `db:migrate:test`, fixture import or validation cleanup against production.
8. Inspect object definitions and effective grants after migration. Expect three new RLS tables, no permissive policies, RESTRICT FKs, guarded submissions, append-only audit trigger, invoker-rights role function and denied PUBLIC/anon/authenticated access. Record sanitized verification and actual journal/hash. Stop rollout on any mismatch.

## Backup and restore verification plan

Before any separately authorized production migration:

- Identify approved provider snapshot/PITR facilities and retention, plus an encrypted logical backup of the exact database. Use the established credential profile/secret store; do not put secrets on a shell command line, into Git, or in this report. Restrict backup access and record timestamp, database identity, size, checksum and PostgreSQL client/server versions.
- Use approved equivalents of `pg_dump --format=custom --file=<protected-path>` and a schema definition export through the configured service connection. Capture migration journal, extensions, ownership, grants, policies, triggers and function definitions. Where permitted, separately capture role definitions without role passwords; managed-provider roles may require documented mapping rather than recreation.
- Verify the archive can be listed (`pg_restore --list`) and checksum it. A readable archive alone is not restore verification.
- Dispatch a restore rehearsal through `ld` into an isolated, fresh disposable environment. A production backup contains private data: this requires explicit data-handling authorization, restricted access, outbound network/email/OAuth disabled, no public application endpoint, no live provider credentials and approved retention. Never restore it into this sanitized worker snapshot or a normal developer database. A synthetic rehearsal proves mechanics only, not integrity of the real backup.
- Restore using the provider-compatible role/ownership mapping; use stop-on-error and review every error. Verify required tables, counts/constraints, migration journal, representative authorized records, RLS/grants, triggers/functions, and old-application read compatibility. Run privacy-safe integrity queries; do not print student payloads. Record elapsed restore time, recovery point and validated RTO/RPO.
- Obtain the recovery owner's sign-off on actual restore evidence and acceptable data-loss window. Keep the encrypted backup and recovery instructions accessible to the approved operator during deployment. Failed/unperformed restore verification blocks migration.

## First-super-admin bootstrap (preparation only)

No signup field, email domain, GitHub metadata or affiliation status grants staff authority. No role-management web endpoint exists.

1. Obtain explicit bootstrap authorization identifying the environment, intended person, independent approver, privileged operator and ticket/reason. Person signs in through the normal OAuth flow. Verify their internal `auth_users.id` independently against the intended account; do not accept a client-submitted ID as proof. Minimize recorded personal data.
2. Use a trusted, separately authorized operational DB connection after verifying its environment. Keep it outside the runtime/browser credential path. Check role-function/table privileges are unavailable to browser roles and that no first super-admin already exists.
3. Review the exact bootstrap SQL in `r3-1-xr-studio.md` with the verified internal ID and operator/approval reason. Execute as one transaction: exclusive lock on `studio_roles`; abort if any super-admin exists; insert the verified first grant; insert the matching bootstrap event; commit only if both succeed. Require a nonblank reason of at most 2000 characters, no fake approval or consent. Never log secrets. An existing curator grant collision must be explicitly reconciled, not silently overwritten.
4. Verify the resulting grant/event and the normal account's staff access. Verify unrelated accounts still have no role. Record operator, approved target, timestamp, environment and outcome via the local `service-use` procedure.
5. Later grant/revoke operations use reviewed `public.assign_studio_role(actor, subject, desired_role, reason)` through the same trusted operational route. Verify actual acting super-admin identity externally: the actor argument itself is not authentication. NULL desired_role revokes; last-super-admin removal must fail. Do not expose this function to client RPCs or build an ad hoc public endpoint. A revoked staff session must immediately fail new private reads/commands.

## Deployment sequence (requires separate authorization)

1. Integrate reviewed patch into source branch and then `main` using normal approved project workflow; record exact merge/release SHA and CI evidence. Preserve all historical tags. Build through `ld` from that exact source, with no mocks, test preloads, synthetic auth configuration or test-runtime flags.
2. Complete preflight, encrypted backup and actual restore-verification gates. Obtain named production migration approval, apply 0011 through the approved journal process, and verify security objects before activating the new application.
3. Obtain deployment approval for the exact SHA/environment. Deploy that build using the owning Vercel/project workflow, verify deployed commit and canonical URL. Verify BETTER_AUTH_URL origin, GitHub callbacks, cookie/signing configuration, mail behavior and trusted DB role without revealing values. Never deploy `.env` or the test GitHub fetch preload.
4. Separately authorize and perform first staff bootstrap if needed. With no staff grants, ordinary users must see no queue. Use consenting approved accounts, not fabricated consent or production fixture imports.
5. Run the following QA with minimal reversible records and owner consent. Observe auth failures, 409s, lock waits, 5xx rates, public privacy and audit continuity. Record actual time, full deployed SHA, database journal state and sanitized results. Keep rollout limited until these checks pass.

## Post-deployment QA matrix

Use separate browser contexts for each real, approved role. Verify UI and direct API denial; hiding a button is insufficient. Do not record session cookies/tokens or private student prose in evidence.

| Persona / condition | Required checks |
| --- | --- |
| Anonymous visitor | Studio pages require signin; Studio APIs 401/no-store; no private queue/history; showcase contains only approved/public/current-owner content; unrelated private canonical pages remain unavailable |
| Ordinary student | No staff queue or arbitrary submission detail; forged role/actor/acceptedBy/published fields rejected; unrelated owner actions denied; affiliation does not grant staff |
| Project maintainer | Submit their current student project; inspect saved text/history; accept exact saved revision; withdraw and resubmit; cannot approve review or publish without staff grant; unsaved form values never constitute saved approval |
| Contributor | Cannot impersonate maintainer/showcase owner; own R3 contribution and invitation consent remains independently controlled; no other members' private fields leaked |
| Curator | Read only retained submissions, start review, suggest, require change/reject reasons, approve review; cannot publish/moderate/assign roles or forge owner acceptance |
| Administrator | Curator rights plus publish only after approved/current owner revision and canonical publication; moderation requires reason and preserves owner-visible history; no role assignment or canonical/contributor edits through Studio |
| Super administrator | Same content/owner boundaries; approved operational grant/revoke logs accurate previous/new roles; last super-admin removal blocked; no public role assignment route |
| Revoked staff | Keep original signed-in session open, revoke via approved operational flow; subsequent queue/detail/commands denied; no new private events leaked during race. Restore any QA grants only if authorized |
| Ownership transfer | Complete normal accepted-contributor transfer; old owner loses showcase access, new owner gains it, public output hides; acceptance by new owner requires admin republication; canonical URL/ID and contributor consent preserved |
| Full lifecycle | submit → review → changes requested → owner resubmit → review → reject → resubmit → suggest → owner accept + review approve → admin publish; approval alone never publishes. Test withdrawal and moderation; stale/duplicate versions yield 409 without duplicate audit events |
| Public privacy | Inspect populated page/network output signed out; no audit notes, internal actors, grants, private contributor records or unapproved suggestions. Canonical edit/unpublish/transfer immediately removes stale gallery content; reaccept alone does not republish |
| Security boundaries | Wrong/missing origin and cross-site POST fail; oversized/invalid JSON fails; response is no-store; unexpected errors reveal no SQL/secrets; unsafe script/http/credential/internal links rejected; external links do not embed arbitrary sites |
| Desktop / 390px | Populated queue, long titles/summary/URLs/history, empty filters, forms, conflict messages and showcase fit without horizontal overflow; keyboard reaches skip/nav/filter/forms/actions/history; visible focus, associated labels, native disclosures, live status and reduced motion work; manually inspect screen-reader announcements and selected desktop/mobile captures |
| R1/R2/R3 | Directory filters, public/private profiles, signin/verification, inquiries, manual project editing/publication, GitHub suggestions/duplicates, invitation/contribution consent, transfer, safe demo/fallback still work; check course evidence separately |

## Rollback and incident response

Stop rollout for wrong environment/SHA/hash, failed migration, grant/RLS drift, audit mutation, unauthorized publication/access, broken authentication, private data exposure or meaningful error/lock regression.

- Preserve sanitized timestamps, request IDs, deployed SHA and approved audit evidence. Limit exposure with an authorized maintenance state or compatible application rollback. Revoke affected staff grants through the approved function; unpublish affected curated records through moderation when appropriate. Suspected backend credential compromise requires authorized credential rotation and session impact assessment.
- Roll application back to the rehearsed compatible previous R3 build; retain additive 0011 tables and all new submissions/events. Verify prior build tolerates RESTRICT auth/project FKs. Do not drop tables, disable RLS/audit triggers, rewrite journals or move release tags. There is no down migration in this patch.
- If a privacy incident is suspected, restrict access and preserve evidence under the incident owner's process; investigate data exposure and notification obligations through the owner. Do not erase events or post private payloads in issues.
- Whole-database restore is a separately approved last resort after explicit post-backup data-loss assessment. Export/preserve legitimate new records and audit material, select the verified recovery point and follow the rehearsed recovery runbook. Never restore over production merely to reverse an additive migration.
- After recovery, verify identity/SHA/journal, auth, private/public projections, inquiries, canonical IDs, consent and audit integrity. Document cause, recovery time, remaining exposure and required fixes before restarting rollout.

## Completed local Windows verification and remaining handoff

The user's explicit authorization permitted local Docker/build execution for this integration, superseding the sanitized worker's dispatcher-only handoff. No `ld` job or production action was launched.

1. Verified original branch, full baseline SHA, clean tracked state and immutable tag. Applied the reviewed patch after `git apply --check`, seven-file scope review and canonical committed-blob comparison against the 24-entry migration manifest. Historical SQL was not rewritten for CRLF differences.
2. Added three read-first regressions to the existing Studio test file. Focused security harness derived from the unchanged safe runner passed 58 unit/frontend and 21 Studio integration cases, zero skips. The first copied-dependency preflight stopped safely; one isolated locked installation repaired it.
3. Ran `scripts/validate-r31.ps1 -ExpectedBranch feat/r3-1-security-validation-16d6ed59` on Windows in `C:/Users/JASH2/AppData/Local/Temp/immxrsive-r31-security-validation-16d6ed59`. The original checkout's dotenv files were never loaded. Complete results: 200 unit / 100 frontend / 179 integration / 135 browser passes, five unchanged intentional browser exclusions; all matrix checks and cleanup exit 0.
4. Preserved results at `C:/Users/JASH2/AppData/Local/Temp/immxrsive-r31-results-1dd3714792b842fbbe47461c10641bd9`; source/resource hashes, dependency audit and local review at `C:/Users/JASH2/AppData/Local/Temp/immxrsive-r31-security-local-16d6ed5957404934bbd7272a44de5275`. Check counts overlap focused runs; do not add them together as unique coverage. The original feature branch remains at the baseline with the reviewed seven-file working-tree change, ready for the user's final review and separately authorized commit/PR.
5. Current dependency disposition, authenticated/manual QA, hosted privilege/journal checks and actual backup/restore evidence remain open production gates. No commit/push/merge/tag/issue update, real staff bootstrap, staging/production connection or deployment was performed. R3.2 AutoDemo remains excluded.
