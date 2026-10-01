# Release 1 Requirement Traceability

Audit date: 2026-10-01  
Baseline: `d4cad4d` plus uncommitted M7 QA hardening  
Workflow: unauthenticated directory → student profile → canonical project → contextual inquiry

Status meanings: **Pass** means implementation, automated evidence, and M7 manual/browser evidence agree. **Ready** means the release-identification prerequisite is satisfied but the M8 action has intentionally not occurred.

| ID | Requirement | Implementation | Automated evidence | M7 manual/browser evidence | Status | Notes |
|---|---|---|---|---|---|---|
| R1.01 | Public Talent Directory | `TalentDirectory.tsx`, `GET /api/v1/talent` | `talent-api.test.ts`: 17 published, S16 excluded; directory tests | Scenario A/B, unfiltered 17-result audit | Pass | PostgreSQL-backed. |
| R1.02 | No Login Required | Public App Router pages and APIs contain no auth gate | Full Playwright suite | Scenarios A–I in clean browser contexts | Pass | No account/session dependency. |
| R1.03 | Data-Backed Implementation | `src/db/queries/*`, runtime database client | API tests change cwd away from fixtures | Direct/reload scenarios resolve database content | Pass | Fixture JSON used only by import/tests. |
| R1.04 | Search | `parseTalentQuery`, `queryTalentDirectory` | Name, headline, skill, case-insensitive, substring tests | Scenario A searches Unity; Scenario G searches Avery | Pass | SQL wildcard characters escaped. |
| R1.05 | Skill Filter | `student_skills` predicates | Explicit skill matching and technology-separation tests | Scenario A and B | Pass | Project technologies never match skills. |
| R1.06 | Multiple Skills | One `EXISTS` condition per selected skill | Unity + Blender AND test | Scenario B returns four matches | Pass | AND semantics. |
| R1.07 | Availability | Structured availability predicates | OR-within/AND-across API tests | Scenario A applies Internship with other filters | Pass | All three official values verified. |
| R1.08 | Status | Structured status predicate | Current/alumni OR and cross-category tests | Directory component/browser tests | Pass | Both official values verified. |
| R1.09 | Clear Active Filters | Active-filter controls in `TalentDirectory` | Frontend removal/Clear All tests | Scenario B removes Blender and clears all | Pass | Active filters have understandable names. |
| R1.10 | Deterministic Results | Lower-case name then ID ordering | Repeated-query equality/order test | Stable results throughout A/B | Pass | Nested values retain display order. |
| R1.11 | Student Cards | `StudentCard` | Frontend directory shell tests | Scenario A/B card inspection | Pass | Name, headline, skills, availability, project count present. |
| R1.12 | Stable Student URL | `/students/[studentId]` | Student browser direct/reload test | Scenario C direct-open and reload | Pass | Shareable canonical route. |
| R1.13 | Professional Shell | `StudentProfileView` | Student API/frontend/browser tests | Scenario A/C/H | Pass | All required profile fields and evidence present. |
| R1.14 | Project Evidence | Student project evidence query/UI | Student API project evidence test | Scenario A opens P01 from profile | Pass | Contributor-specific role shown. |
| R1.15 | Contributor Role Matters | Separate skill/technology tables and queries | Fixture, talent, student, project tests | Scenario A role and technology inspection | Pass | No inferred student skills. |
| R1.16 | Shared Projects | Canonical `projects` row and `/projects/{id}` | Canonical P01 API tests | Scenario A/C canonical P01 navigation | Pass | Multiple contributors share one project. |
| R1.17 | Project Page | `ProjectDetailView`, project API | Project API/frontend/browser tests | Scenario A/E/H/I | Pass | Title, description, roles, technologies, assets present. |
| R1.18 | Student Inquiry | Student CTA and inquiry page | Inquiry persistence/frontend/browser tests | Scenario B submits student inquiry | Pass | Student context server-derived. |
| R1.19 | Project Inquiry | Project CTA and inquiry page | Project inquiry persistence/browser tests | Scenario A submits project inquiry | Pass | No contributor selected. |
| R1.20 | Unpublished Records | Published-only student queries | S16 directory/profile/inquiry tests | Scenario D checks S16 routes | Pass | Project relationship retains role but hides profile details. |
| R1.21 | Invalid Routes | Segment-specific `not-found.tsx` files | Route-state tests | Scenario D checks all required invalid routes | Pass | Useful navigation, no crash. |
| R1.22 | Mobile Usability | Responsive CSS across all public surfaces | Route-specific 390 px tests | Scenario F complete workflow at 390 px | Pass | No required horizontal scrolling. |
| R1.23 | Accessible Basic Interaction | Semantic controls, labels, focus/error/status handling | Frontend and browser keyboard/focus tests | Scenario G completes core navigation by keyboard | Pass | Manual semantics audit found no keyboard trap. |
| R1.24 | Error Isolation | Optional links are not fetched; graceful motion fallbacks | P07, WebGL, GSAP, backend error tests | Scenarios E and I | Pass | Broken external asset remains isolated. |
| R1.25 | Release Identification | Repository structure and quality gates | Full M7 gate and secret/status audit | No release tag present; M8 intentionally deferred | Ready | Structurally ready for M8 tagging after review. |

## API contract audit

| Endpoint | Success | Invalid input/source | Visibility/security | Ordering/runtime evidence |
|---|---|---|---|---|
| `GET /api/v1/talent` | `200` envelope | Structured `400` | Published students only; public fields only | Deterministic API tests; concurrent request regression test |
| `GET /api/v1/skills` | `200` metadata | Database failure becomes structured `500` | Standardized skills only | Database display order; concurrent with talent endpoint |
| `GET /api/v1/students/{id}` | `200` profile | Non-disclosing `404` | S16 indistinguishable from unknown; no `profileStatus` | Skills, availability, links, projects ordered |
| `GET /api/v1/projects/{id}` | `200` project | Structured `404`; database `500` | Unpublished contributor details withheld | Contributors, technologies, assets ordered |
| `POST /api/v1/inquiries` | `201` confirmation | `400/413/422/404/500` structured errors | Server derives source snapshots; no listing endpoint | PostgreSQL persistence and FK exclusivity verified |

## Manual accessibility and performance audit

- Heading order, landmarks, skip links, fieldsets/legends, labels, link names, focus styles, live regions, error association, and focus movement were inspected against the rendered workflow.
- Scenario G traverses search → result → profile project → project inquiry using keyboard focus and activation.
- Reduced-motion scenarios keep all content immediately available; WebGL failure retains the workflow.
- Motion cleanup tests verify the talent ScrollTrigger lifecycle on unmount; no duplicate canvases or required client-side data waterfall was observed.
- The optional axe package is not installed, so no dependency was added during release QA. Existing semantic/component/Playwright checks and manual inspection provide the recorded accessibility evidence.
