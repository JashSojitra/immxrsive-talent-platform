# Release 3 Phase 4 — contributor journey

Date: October 31, 2026. Branch: `feat/release-3`. Result: implemented and ready for review; final complete verification passed. No later-phase work started.

## Scope and decisions

Implemented the contributor journey on the existing Phase 2 model and Phase 3 project workspace. No schema migration was needed. Shared fields remain maintainer-only. Each accepted contributor owns one standard role and an optional contribution statement/role description, plus independent portfolio featuring and public-attribution choices. The existing statement column covers the official optional personal description; no redundant field or multi-role abstraction was added.

Add Teammate searches published, verified account-owned profiles, or resolves an exact privately shared profile UUID. It does not search email or enumerate unpublished profiles. Both search and invitation creation check maintainer authority on the server. Invitations propose an official standard role and create pending relationships only. All twelve fixture labels remain unchanged; the existing role rows populate the UI.

The private inbox shows project title, description, proposed role, relationship state and pending maintenance notices. Only the intended recipient can accept or decline. Acceptance explicitly discloses default public attribution and featuring on published profiles. Pending and declined relationships never become public contributor evidence.

The private team page lets accepted contributors change only their own role, statement and visibility. Hiding portfolio evidence leaves acceptance and other portfolios intact. Attribution hiding also suppresses personal portfolio evidence, consistent with the existing privacy projection. Unpublished or unverified profiles remain excluded from public attribution. Project technologies never write personal skills.

Maintainers can reversibly remove and restore others. Relationship ID, original acceptance, statement, role and preferences survive. The contributor sees a private removal notice/reason and a restoration notice. No physical-delete endpoint exists. Current maintainers cannot remove themselves. This is the documented soft-removal decision; it must appear in final release notes.

Maintenance transfer is offered to another active accepted, verified contributor. The recipient must consent. Acceptance checks the offered project revision and current ownership atomically. Shared changes invalidate acceptance of an old offer; a fresh offer replaces/cancels the prior one. A stale offer can still be declined. The outgoing maintainer retains their contribution but loses shared editing, invitation and removal powers. Canonical project ID and URL remain unchanged.

## Files changed in Phase 4

The working tree already contained Phase 1–3 changes. This manifest lists only Phase 4 additions/edits, rather than attributing the entire uncommitted diff to this phase.

| Files | Change |
| --- | --- |
| `src/projects/service.ts` | Verified invitation/transfer targets; stale-transfer decline; private team DTO, relationships/inbox summaries and eligible student search |
| `src/projects/http.ts` | Export existing strict body parser, error adapter and dependency type for reuse |
| `src/projects/team-http.ts`, `team-types.ts` | Verified-session HTTP adapters, strict action schemas, private allowlisted responses and client-safe types |
| `src/components/project-editor/ProjectTeam.tsx` | Invitation consent, own evidence controls, teammate selection, relationship removal/restoration and transfer UI |
| `src/components/project-editor/project-editor.module.css` | Team typography, checkbox layout and long-content wrapping |
| `src/app/student/projects/[projectId]/team/page.tsx` | Authorized private team page |
| `src/app/student/project-invitations/page.tsx` | Private invitation/shared-relationship inbox |
| `src/app/student/projects/page.tsx` | Includes accepted/pending/declined/removed relationships and team navigation |
| `src/app/student/projects/[projectId]/edit/page.tsx` | Contribution/team navigation from shared editor |
| `src/app/student/dashboard/page.tsx` | Invitation inbox access |
| `src/app/student/profile/edit/page.tsx`, `src/app/student/auth.module.css` | My Projects navigation with wrapping on small screens |
| Ten new route files listed below | Team lifecycle API |
| `tests/integration/project-team-api.test.ts` | Seven targeted database/API tests |
| `tests/frontend/project-team.test.tsx` | Five contribution/consent/conflict/removal component tests |
| `tests/browser/project-team.spec.ts` | Two independent verified accounts in desktop and 390px journeys |
| `scripts/verify-project-team.mjs` | Bounded, identity-verified disposable full verification |
| `docs/release-3-phase4-verification.md` | This report |

Existing public project/profile projections are reused, rather than introducing a second contributor representation. Accepted membership and owner preferences feed the same canonical record and existing public response contracts.

## New routes

Each row corresponds to a new `route.ts` under `src/app/api/v1/`.

| Path | Method / purpose |
| --- | --- |
| `student/projects/[projectId]/team` | GET authorized private team |
| `student/projects/[projectId]/teammates?q=…` | GET bounded eligible student selection |
| `student/projects/[projectId]/invitations` | POST versioned invitation |
| `student/project-invitations` | GET own relationships and incoming-offer notices |
| `student/project-memberships/[membershipId]/response` | POST recipient accept/decline |
| `student/project-memberships/[membershipId]/contribution` | PATCH versioned owner-only personal evidence |
| `student/project-memberships/[membershipId]/removal` | POST versioned maintainer soft removal |
| `student/project-memberships/[membershipId]/restore` | POST versioned maintainer restoration |
| `student/projects/[projectId]/maintainer-transfer` | POST versioned maintenance offer |
| `student/project-transfers/[transferId]/response` | POST recipient transfer consent/decline |

All use existing verified-session guards and independent domain authorization. Actor identity comes exclusively from the session. Strict bodies reject ownership/state mass assignment; mutation parsing reuses the trusted-origin check and 64 KiB limit. Success/error responses are `private, no-store`. Mutation acknowledgements contain no raw invitation or transfer domain rows. Non-maintainers see only their own private membership metadata and incoming offers. Roles are included in the authorized team DTO; a separate role endpoint was unnecessary.

## Requirement coverage

| Official IDs | Evidence |
| --- | --- |
| R3.05, R3.26 | Two published profiles reference the same project ID/URL; transfer preserves identity |
| R3.06, R3.24 | Maintainer-only shared editing; outgoing/outsider/anonymous/unverified denial |
| R3.07 | Offer, accept/decline, stale/replaced offers and atomic authority transfer |
| R3.08, R3.09 | Eligible platform student selection, standard proposed role, recipient-only consent and no pending/declined public evidence |
| R3.10, R3.11 | One standard role, optional own description/statement, server-enforced authorship |
| R3.12 | Personal feature/hide independent of accepted relationship |
| R3.13 | Reversible removal preserving evidence/history and owner visibility preferences |
| R3.14, R3.15 | Technology/skill separation, understandable accepted roles and personal statements |
| R3.17 | Project/membership/contribution revisions; conflicts retain unsaved input and require confirmed reload |
| R3.23, R3.25 | 390px private/public journeys and cumulative R1/R2 regression matrix |

No GitHub importer, duplicate warning/join-request workflow, player, project deletion, multiple-role feature, legacy ownership reassignment, or release operation was added.

## Database verification and migration integrity

Both runs created new PostgreSQL 18.6 containers with unique random credentials, localhost-only dynamic ports and tmpfs data. No existing container/database was reused. Passwords remained in process environment and were not printed. All runtime/migration/development/test database variables were overridden with isolated URLs; build guard and test databases were distinct. Normal `.env.local` database settings were never used as test targets or modified.

| Run | Container/cluster | ID | Local port |
| --- | --- | --- | --- |
| Initial, exposed hydration bug | `immx-phase4-10b5ca650bd7` | `3937c9910296e0c76c21f2f00e21894fdb82bfd3581711c0a97c2f53d856c29b` | 65294 |
| Final rerun | `immx-phase4-fbb561d9a9e3` | `20b404ffeb9dd509df3967cfb9666e4159fe1316d97bf130b2c83fd3c56e2a44` | 58902 |

The final dedicated user is `phase4_fbb561d9a9e3`; databases end in `_fresh`, `_upgrade`, and `_guard`. Before migration/test operations the driver matches exact container ID/run label, `127.0.0.1` binding, database/user, server port 5432 and unique cluster name. Image: `sha256:979bccfde35445db618c65107d27d08c6c21339d8dc3ad4c830c6633947be0e4`.

Fresh 0000–0009 applied with ten journal entries. Populated 0000–0008→0009 rehearsal preserved legacy student/project/contributor/technology and existing inquiry snapshots. Legacy projects remained published, unmanaged and version 1; project-only inquiry still persisted. Historical SQL migrations and planning inputs were hash-checked. Existing Phase 2 tests verified all seven new tables' RLS/client privilege denial. No migration/schema/checksum was changed in Phase 4.

## Validation commands and results

```powershell
npm run typecheck
npm run lint
node node_modules/drizzle-kit/bin.cjs check
git diff --check
node --import tsx scripts/verify-project-team.mjs --run-disposable
```

The last command owns container creation, identity checks, migration rehearsals, test/build subprocess environments and cleanup. Do not run its database child commands against normal environment files.

| Check | Completed result |
| --- | --- |
| Typecheck / lint | Passed |
| Drizzle metadata / diff checks | Passed; existing LF/CRLF informational warnings |
| Team + manual + shared/security + fixture + inquiry integration | 64 passed in five files |
| Existing directory/profile/project/private-profile API regressions | 63 passed in four files |
| Unit/frontend suite | 185 passed in 27 files |
| Production build | Passed |
| Full browser matrix | 121 passed, five intentional skips, 126 entries, 2.9 minutes |

Final totals: **127 database/API tests, 185 unit/frontend tests, 121 browser tests passed; five skipped**. The five skips are existing 390px-only checks excluded from the desktop project. Both new contributor journeys passed (desktop and mobile-390) with no browser page errors. All child commands exited 0 without timeout. No selected integration or unit cases were skipped.

The final runner removed its exact labeled container and disposable volumes in `finally`; a subsequent Phase 4 Docker label inventory was empty. Both run containers/data were removed. It verified 63 pre-existing untracked inputs and all historical SQL migrations unchanged across the final run. Planning-document and 0008 hashes also matched the prior-phase values. Sanitized command/result logs remain at `tmp/phase4-verification-last.log`; the failed initial attempt is retained at `tmp/phase4-verification-attempt1.log`.

Desktop and 390px screenshots in `test-results/project-team-independent-s-947d6-ps-and-transfer-maintenance-{desktop,mobile-390}/contributor-team.png` were visually inspected. Long text, UUIDs, role controls, contributor evidence and actions remain within the viewport and retain the existing expressive visual system.

The new seven API tests cover consent, duplicate invitations, search privacy/eligibility, forged authorship, roles, two-profile association, featuring/attribution, removal/restoration, stale personal writes, rejected/stale/replaced transfer offers, outgoing maintainer denial, same-origin enforcement and legacy refusal. Existing shared-project tests retain true concurrent-write and live RLS/ACL checks.

The browser journey uses two independently authenticated verified synthetic accounts and sessions in each viewport. It exercises actual invite/accept/decline forms, public role/statement rendering, both profile links to one project, owner-only statement writes, real stale conflict with unsaved-input preservation and cancel/confirm reload, independent portfolio/attribution switches, unpublished identity suppression, reversible removal/restoration, rejected then accepted maintenance, outgoing write denial, incoming shared editing, canonical ID stability, long unbroken text, profile navigation, keyboard activation and reduced motion. Both accounts/projects are removed from their disposable database after each case.

The initial full run passed 127 database/API tests, 185 unit/frontend tests and 119 browser regressions, but failed both new browser cases on the final no-page-errors assertion. All functional assertions had completed. The removal notice used `toLocaleDateString()`; Node defaulted to `en-CA`, while Chromium rendered another locale, causing a React text hydration mismatch. It now renders the deterministic ISO calendar date, with a component regression assertion. The browser page-error assertion was retained. No tests were weakened.

As in Phase 3, the full regression server can log `The destination stream closed early` during navigation. This is recorded separately from browser page errors. No runner timeout/hang or production fallback was accepted. Single-worker test execution remains bounded; no unrelated configuration was weakened.

## Review limits and preservation

The inbox is an in-app workflow; no email delivery, public private-profile directory, invitation resend after decline, full historical event log, or project hard deletion was added. Declined relationships remain recorded; duplicate invitations return a recoverable error rather than silently resetting consent. Removal/restoration retains the documented latest removal metadata and original acceptance, not an unlimited audit log. These are deliberate scope decisions.

Public two-human release evidence is still outstanding: synthetic disposable test accounts prove the flow but are not the final deployed submission example. Import/duplicate/demo work and final submission/adapter/notes/tag remain later phases. No concrete blocker to continuing after review has been identified.

HEAD remains `4c8a64d7313c1401889ae97a1223090d059008de`; author remains Jash Sojitra `<jash221434@gmail.com>`. R1/R2 tag refs and existing uncommitted/untracked course documents, fixtures and prior-phase implementation remain intact. No commit, push, deployment or tag occurred.
