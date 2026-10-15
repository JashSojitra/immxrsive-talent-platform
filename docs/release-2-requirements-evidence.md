# Release 2 requirements and Peer QA evidence

Status: **reviewed against the final Moodle requirements and Peer QA plan**.

Both final four-page Moodle PDFs were readable and extractable. The final changes
clarified Secondary point allocation, allowed original-PDF disposal, bounded
rate-limit testing, and the optional instructor-approved verification test mode;
they introduced no unmet product requirement.

Legend: **Covered** means implementation and test evidence exist; **Pending** means
a required release-freeze action remains.

## R2.01–R2.32 matrix

| ID | Status | Implementation and evidence |
| --- | --- | --- |
| R2.01 | Covered | GitHub sign-in at `/student/sign-in`; `src/auth/auth.ts`; browser and frontend auth tests. |
| R2.02 | Covered | Database-backed Better Auth user, account, and session tables; `src/db/schema.ts`; `tests/integration/auth-identity.test.ts`. |
| R2.03 | Covered | OAuth scope is exactly `user:email`; `src/auth/config.ts`; unit/integration assertions. |
| R2.04 | Covered | Exact configured institutional-domain validation and email challenge flow; verification unit, integration, frontend, and browser tests. |
| R2.05 | Covered | Non-approved domains return `INVALID_EMAIL` without delivery; `src/verification/validation.ts`. |
| R2.06 | Covered | Atomic token consumption and replay rejection; `src/verification/service.ts`; single-use integration/browser scenarios. |
| R2.07 | Covered | Configurable TTL capped at 30 minutes; config and expiry tests. |
| R2.08 | Covered | Durable limits by user/email and user/network address; 15-minute recovery guidance; request/confirm integration tests. |
| R2.09 | Covered | Verified affiliation persists across sessions and further request attempts fail closed. |
| R2.10 | Covered | Verified owner creates an unpublished private draft; profile service and integration/browser tests. |
| R2.11 | Covered | Structured headline, biography, program, status, location, skills, availability, links, education, and experience fields. |
| R2.12 | Covered | Skills are selected from database-backed standardized IDs; unknown IDs rejected server-side. |
| R2.13 | Covered | Authenticated multipart PDF upload endpoint accepts only bounded PDF input. |
| R2.14 | Covered | Deterministic candidates for standardized skills, bounded education/experience sections, GitHub, and protocol-less LinkedIn URLs; resume unit tests include a synthetic Word-export structure and four approved PDF fixtures. |
| R2.15 | Covered | Candidate review supports accept/edit/reject and explicit application; frontend and browser tests. |
| R2.16 | Covered | Existing values remain unchanged until apply; merge/replace is explicit; frontend tests. |
| R2.17 | Covered | Corrupt, spoofed, empty, excessive, and timeout cases return safe recovery errors and do not mutate profiles. |
| R2.18 | Covered | Original PDF bytes exist only for the request and are not persisted or publicly downloadable; field visibility is projected server-side. |
| R2.19 | Covered | `src/profile/public-projection.ts` allowlists output; hidden values, auth data, affiliation, and owner IDs never enter public responses. |
| R2.20 | Covered | Owner-only `/student/profile/preview` uses the public projection while the public route remains unavailable. |
| R2.21 | Covered | Explicit revision-bound publish/unpublish actions with confirmation; integration/frontend/browser tests. |
| R2.22 | Covered | Published self-service profiles enter `/api/v1/talent`; unpublish removes directory and direct public access. |
| R2.23 | Covered | Three presentation presets, four allowlisted hero treatments, and semantic section ordering satisfy the final Secondary criteria. |
| R2.24 | Covered | Presentation fields are separate from the structured search projection; tests exercise customized public rendering without altering search fields. |
| R2.25 | Covered | Strict schemas and React text rendering reject arbitrary presentation markup/scripts; validation and integration tests. |
| R2.26 | Covered | Full editor, resume, preview, publish, public profile, inquiry, and unpublish journey runs in the `mobile-390` browser project with overflow assertion. |
| R2.27 | Covered | Semantic labels, associated errors, keyboard controls, focus behavior, and keyboard browser paths have automated coverage. |
| R2.28 | Covered | Dedicated Release 1 acceptance coverage passed inside the final 117-pass browser run; public API, frontend, and integration regression suites also passed. |
| R2.29 | Covered at freeze | R1 remains frozen; the submitted `R2-submission` annotated tag identifies the exact verified deployment commit. |
| R2.30 | Covered | Every profile write derives `ownerUserId` from `requireVerifiedRequestStudent`; forged identifiers and cross-owner updates are tested. |
| R2.31 | Covered | PDF header/trailer, byte, page, text, and time bounds; parser stop-on-error; file/URL content is not fetched; malicious-text fixture is inert. |
| R2.32 | Covered | Extraction uses only text actually present and exact case-insensitive standardized-skill matches; unsupported grounded skills are disclosed separately, while minimal/untrusted fixtures verify no invented facts. |

## Peer QA A–K matrix

| Plan | Status | Evidence / remaining human work |
| --- | --- | --- |
| A — onboarding and verification | Covered | Auth, domain rejection, single-use verification, and initial private draft are automated; the production profile workflow was user-confirmed. |
| B — clean resume review | Covered | Clean fixture, candidate review, edit/apply, and presentation paths have unit/frontend/browser coverage. |
| C — no silent overwrite | Covered | Existing data remains until explicit merge/replace apply; cancel/failure preservation is tested. |
| D — privacy and public API | Covered | Public projection and hidden-field behavior have integration, frontend, and browser evidence. |
| E — publish/unpublish persistence | Covered | Publish, directory presence, direct access, inquiry handoff, unpublish, and preserved draft are in the browser journey. |
| F — customization | Covered | Presets, hero treatments, section order, keyboard controls, and public rendering are tested. |
| G — verification persistence/reuse | Covered | Replay, wrong account, repeat request, sign-out, and database-backed session behavior are tested; manual cross-browser confirmation remains useful. |
| H — 390px and keyboard | Covered | Playwright runs desktop and `mobile-390`; core controls are keyboard-operated and overflow checked. |
| I — Release 1 regression | Covered | `release-1-acceptance.spec.ts` and the public route suites passed in the final complete browser run. |
| J — untrusted/minimal fixtures | Covered | Clean, minimal, layout, malicious-text, spoofed, corrupt, and oversized fixtures have deterministic tests. |
| K — exploratory | Partial/manual | Automated coverage includes back/reload, malformed links, failed saves, duplicate inquiry submission, resume cancel/failure, refresh persistence, and limits. Human exploratory execution remains required. |

## Traceable test entry points

- Authentication: `tests/unit/auth-config.test.ts`,
  `tests/integration/auth-identity.test.ts`, `tests/browser/auth.spec.ts`
- Verification: `tests/unit/affiliation-verification.test.ts`,
  `tests/frontend/affiliation-verification.test.tsx`,
  `tests/integration/affiliation-verification.test.ts`,
  `tests/browser/affiliation-verification.spec.ts`
- Private profile/privacy/publication: `tests/unit/student-profile-validation.test.ts`,
  `tests/frontend/private-student-profile.test.tsx`,
  `tests/integration/private-student-profile.test.ts`,
  `tests/browser/private-student-profile.spec.ts`
- Resume: `tests/unit/resume-extraction.test.ts`,
  `tests/frontend/resume-import.test.tsx`, and approved synthetic PDFs under
  `data/fixtures/r2/`
- Release 1: `tests/browser/release-1-acceptance.spec.ts` and the talent, student,
  project, and inquiry API/UI suites.

## Latest local verification

On October 15, 2026, the complete local gate set passed: typecheck, lint, 95
unit tests, 64 frontend tests, 91 API tests, 98 integration tests, 117 browser
tests with 5 intentional skips, and a standalone production build. The browser
run covered desktop and 390 CSS px projects and used a fresh production-mode
Next.js server. This evidence does not replace live provider or deployed testing.

## Release-freeze rule

Production security migration `0007_harden_data_api` passed its complete read-only
postcheck on October 15, 2026. The immutable `R2-submission` tag must point to the
exact final commit that Vercel reports READY; Moodle submission text records that
full target SHA.
