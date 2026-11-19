# UX audit — 18 November 2026

Base: `34426d89060b500ceeb7f7c9be866fc49cfb09cc`, isolated `feat/immxrsive-ux-overhaul`. At initial discovery, PR #13 was draft/unmerged and untouched by this task. Its later external merge is recorded in the handoff report. No production writes or deployment.

## Evidence and coverage

Source inventory covers `/`, `/talent`, `/students/[studentId]`, `/projects/[projectId]`, `/showcase`, `/partners`, `/partners/[companyId]`, `/inquiry/{student,project,partner}/[id]`, `/student`, sign-in, verify, dashboard, profile/edit/preview, projects/new/edit/preview/team/requests/showcase, project-invitations; `/studio` and project review; `/admin/sign-in` and catch-all overview/projects/intake/reviews/activity/settings/access/partner workflows. API implementations and authorization policies are retained.

Baseline local screenshots: `screenshots/before/`, widths 390, 768, 1280, 1440. Talent, student sign-in, admin sign-in rendered. Partner/showcase baseline requests hit database errors because remote environment is unavailable from the sandbox; those initial captures were error-state evidence, not successful journey checks. Final review later replaced them with controlled baseline captures from the unchanged production-base checkout on the same local synthetic database; see baseline-responsive-checks.json. Authenticated routes inspected in source until disposable local fixtures are ready. Visually inspected mobile full-page capture: discovery requires thousands of pixels of scrolling and text becomes faint during reveal. These are observed problems, not hypothetical style preferences.

## Interaction inventory

| Trigger / frequency | Purpose | Decision |
| --- | --- | --- |
| Hover/press, frequent | Confirm clickable controls | 120–150ms color/transform feedback |
| Keyboard focus, frequent | Locate current action | Immediate visible outline; no moving highlight |
| Mobile menu, occasional | Reveal navigation | Native modal focus containment, Escape and return focus; <=240ms |
| Search/filter, frequent | Narrow results | Immediate pending state, abort stale requests; no theatrical grid entrances |
| Save/publish/review, occasional | Confirm durable change | Existing disabled states and inline feedback; no optimistic permissions/publication |
| Page/dashboard load | Expose work | No first-paint concealment or scroll-controlled content |
| XR launch | Start selected experience | Explicit launch and preserved opaque sandbox; device fallback |

## BROKEN

| Principle | Route/component | Before | Solution |
| --- | --- | --- | --- |
| Discoverability | Global navigation | No consistent public destinations or staff entry | Shared responsive navigation with active states and Staff / Admin Portal |
| Task completion | Local test configuration | TEST_DATABASE_URL points remote, rejected by safety guard | Disposable loopback PostgreSQL 17; never bypass safety checks |
| Resilience | Public server pages | Database failures produce route error screen | Meaningful existing error boundaries and explicit retry paths; do not replace real data with invented content |

## FRICTION

| Principle | Route/component | Before | Solution |
| --- | --- | --- | --- |
| Occam / frequency | `/`, `/talent` | Homepage redirects into six cinematic chapters; search buried | Distinct original homepage, compact task-first directory |
| Hierarchy / proximity | Student dashboard | Giant welcome, raw internal account ID, tasks nested in notice | Profile checklist, publication state, project overview, next actions |
| Capability clarity | Student/admin navigation | No clear same-account switch | Query staff role and student affiliation independently; offer both eligible workspaces |
| Hick / Fitts | AdminShell | Nine equal links; duplicate public links; no active destination | Group work navigation, active state, generous controls and mobile wrapping |
| Recognition | Project/profile details | UUIDs, giant section headings and redundant status | Human labels, compact metadata, work and contribution hierarchy |
| Similarity | Partners | Separate blue palette and generic navigation | Shared ink/bone/coral surfaces; relationship and inquiry hierarchy |
| Grouping | Showcase | Student and staff output weakly distinguished | Explicit ownership groups, useful empty states, truthful demo availability |
| Frequency / responsiveness | GSAP wrappers | >500ms entrance/scroll animation hides content | Static content on load, purposeful CSS feedback only |
| Progressive disclosure | Project editing and profile forms | Huge headings/section gaps; low-contrast inputs | Compact shared form patterns, stronger boundaries, retained errors/save protection |

## POLISH

| Principle | Route/component | Before | Solution |
| --- | --- | --- | --- |
| Consistency | Global colors/type/spacing | Neon cyan, red and blue vary by module | Central semantic tokens, warm editorial typography and restrained coral |
| Feedback | Buttons/links/forms | Varying durations and affordances | Named motion tokens, visible focus, consistent press and disabled behavior |
| Serial position | Footer | No developer credit or consolidated links | Global footer retaining independent-course disclaimer and secure SVG social links |
| Motion access | Shared wrappers | Repeated entrances and expensive decorative scenes | Functional without animation; global reduced-motion rule and no dashboard entrances |

## Componentry evaluation

Inspected https://componentry.dev/docs and https://componentry.dev/docs/components/hover-transition plus upstream https://github.com/harshjdhv/componentry (MIT license listed). Hover Transition is editable React source installed through shadcn, requires clsx/tailwind-merge; default .72s timing exceeds product limits. No upstream code copied or package installed. Translate the editorial image/hover idea into original CSS on the homepage showcase only, with an always-visible action and keyboard equivalent. No WebGL, Motion, Tailwind or new dependencies required.

## Acceptance checks

Compare screenshots at all four widths; no horizontal overflow; keyboard and menu focus; reduced motion; real synthetic role journeys (unverified, verified maintainer, curator, XR admin, super admin, dual role); public privacy; iframe restrictions; existing unit/frontend/integration/browser suites; lint, typecheck, production build. Record actual outcomes and limits separately in overhaul report.
