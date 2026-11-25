# Phase 1 — "The Crossing": spatial identity, homepage and motion system

Scope owned by Phase 1: homepage, global tokens/styles, shared header / navigation / mobile menu / footer, motion and spatial infrastructure. Talent directory, project detail, showcase, partners, student and admin dashboards are untouched and belong to Phase 2.

No schema, migration, auth-policy or API changes. Homepage content comes from the same published-only queries as before (`listPublicProjects`, `queryTalentDirectory`) plus `publicCompanies` (published partners). Only public fields are passed to client components.

## 1. Concept and selection

The ImmXrsive name already contains its symbol: the **X** is the crossing point between physical and digital. The identity treats it as a dimensional object inside an octagonal light gate (the octagon echoes the former brand mark's clipped corners), lit by a two-light rig.

Three WebGL hero concepts were prototyped as original fragment shaders and rendered at 1440/768/390 (`screenshots/phase-1/concept-*.jpg`):

| Concept | Idea | Verdict |
| --- | --- | --- |
| A — The Crossing | Raymarched glass X monolith in an octagonal gate over a point-field floor; pointer orbits camera and key light | **Selected.** Ownable (it *is* the brand), true dimensional depth, reactive lighting. First pass read as flat brown bars with a cropped gate; refined with dielectric shading, studio softbox reflections, spectral gate, aspect-aware framing |
| B — Scan Field | Lidar-style point terrain receding to a horizon ring | Atmospheric but generic "synthwave portal"; its point field was kept as A's floor |
| C — Aperture | Octagonal light tunnel; pointer moves the vanishing point | Flat, decorative, weakest depth; rejected |

## 2. Visual identity

**Two-light rig.** Warm *flare* is the key light and the action colour; cold *ion* is the rim light and the evidence colour. Everything else is a blue-black void. Gradients are only used where light would physically blend (the serif headline, the gate, the rail progress), never as generic backgrounds.

**Typography (all OFL-1.1, self-hosted via `@fontsource`):**

| Role | Family | Token | Notes |
| --- | --- | --- | --- |
| Display | Bricolage Grotesque Variable (wdth 75–100, wght 200–800) | `--font-display` | Condensed (`font-stretch` 76–88%) for cinematic headlines; width axis drives kinetic type |
| Editorial | Instrument Serif (italic) | `--font-serif` | Human counterpoint: *possibilities*, *proof*, *an audience*. Previously referenced but never loaded; now loaded |
| Interface | Onest (existing embedded) | `--font-sans` | Body and controls |
| HUD / metadata | JetBrains Mono Variable | `--font-mono` | Eyebrows, telemetry, labels |

**Imagery.** No stock or third-party assets. All imagery is generated: the WebGL scene, its SVG poster, procedural `SpatialGlyph` project studies, per-person auras derived from record ids, the `BrandMark`, and an SVG film-grain layer.

## 3. Tokens (`src/app/globals.css`)

Legacy names are the public API and keep working on every page: `--ink`, `--bone`, `--muted`, `--signal` (= `--flare`), `--electric` (= `--ion`), `--surface`, `--surface-raised`, `--line`, `--control-border`, `--danger`, `--success`, `--content`, `--radius-sm/md`, `--shadow-panel`, `--motion-fast/panel/exit`, `--ease-out/in/move`.

New: `--void`, `--flare`, `--flare-hot`, `--ion`, `--line-strong`, `--glass`, `--glass-line`, `--glow-flare`, `--font-*`, fluid scale `--step--1 … --step-5`, `--header-h`, `--radius-lg`, `--radius-pill`, `--motion-scene`, `--ease-spring` (CSS `linear()` spring).

| Pair | Contrast |
| --- | --- |
| `--bone` #f4f0e8 on `--ink` #0a0c12 | 17.2:1 |
| `--muted` #a9b0bc on `--ink` / on `--surface` | 9.0:1 / 8.4:1 |
| `--ink` on `--flare` #ff7a59 (primary button) | 7.6:1 |
| `--flare` on `--ink` / on `--surface` | 7.6:1 / 7.1:1 |
| `--ion` #8ef0d4 on `--ink` | 14.5:1 |

Shared utility classes (use these instead of re-styling): `.ui-button`, `.ui-button-primary`, `.ui-eyebrow` (now mono), `.ui-empty`, `.ui-display`, `.ui-serif`, `.ui-mono`, `.ui-glass`, `.ui-hud`, `.ui-visually-hidden`.

## 4. Motion system

Rules: motion must explain space (depth, light, travel), never decorate. No generic fade-ups. Every effect has a reduced-motion resting state, and nothing hides content from assistive technology.

**Division of labour**
- *CSS* for entrances that must paint before hydration (hero headline rise with `--ease-spring`, staggered mobile menu with `@starting-style`). The LCP heading never waits for JavaScript.
- *Motion for React* (`motion@14.14.0`, MIT) for spring physics, pointer input and scroll linkage.
- *Lenis* (`lenis@1.3.27`, MIT) for inertial wheel scrolling, homepage only.

**Components (`src/components/motion/`)**

| Component | Purpose | Notes |
| --- | --- | --- |
| `tokens.ts` | `springs.snappy/soft/scene` (transitions), `follow.magnetic/tilt/scroll` (useSpring options), `ease`, `stagger` | Single source for spring feel |
| `MotionRoot` | `MotionConfig reducedMotion="user"` + default spring | Wrap a Motion page tree (home uses it) |
| `SmoothScroll` | Lenis root instance | Mounted only for `pointer: fine` + no reduced motion; `anchors: false`, `syncTouch: false`, `autoToggle` (stops when a dialog locks scroll) |
| `Magnetic` | Spring pull toward a mouse pointer | Wrap a link/button; semantics unchanged |
| `TiltSurface` | 3D tilt + `--light-x/--light-y` pointer light | Child CSS reads the light vars |
| `ScrollWords` | Words brighten as the passage crosses the viewport | Full sentence exposed once as visually-hidden text |
| `ScanReveal` | Clip-path "scan" section entry | Replaces fade-up |
| `CountUp` | Counts to a real value when visible | Final value is server-rendered |
| `KineticText` | Pointer-proximity variable-font type (`--k` → width/weight/colour) | No Motion dependency; one listener per `[data-kinetic-field]`, rAF-batched; off for touch/reduced motion |

**Reduced motion.** Global CSS already disables CSS animation/transition. Motion-driven elements carry `data-motion-static`; under `prefers-reduced-motion: reduce` they are forced to opacity 1 / no transform / no clip. This keeps SSR and client markup identical (branching on `useReducedMotion()` would leave SSR inline styles stuck because it is `null` on the server).

## 5. Spatial hero (`src/components/spatial/`)

- `shaders.ts` — original GLSL ES 3.0 scene "The Crossing" (raymarched SDF X, octagonal gate, point-field floor, environment reflections).
- `SpatialCanvas` — dependency-free WebGL2 renderer. **Render policy:** draws only while intersecting and the tab is visible; 60 fps during pointer/scroll input, 30 fps ambient, and a full stop after 9 s idle; DPR capped at 1.5 (1 under 700px); adaptive resolution drops to 55% if frames run slow; listens for context loss; reads scroll progress from its parent for the camera dolly.
- `SpatialStage` — always renders the SVG/CSS poster (the no-JS and no-WebGL hero), then code-splits the canvas (4 KB gzip) and requests it on `requestIdleCallback`. Skipped for Save-Data; a single still frame for reduced motion. `data-status="poster|ready|unsupported"` and `data-still` support tests.

Bundle impact: Motion + Lenis + home sections ship in a chunk referenced only by `/` (~74 KB gzip). Header, footer and all other routes ship no Motion.

## 6. Homepage composition (`src/app/page.tsx`, `src/components/home/`)

1. **Hero — "enter the crossing"**: full-bleed WebGL, HUD, kinetic headline (copy unchanged), magnetic CTAs, focus-area chips, glass showcase portal (pointer parallax on an opposite depth layer), real telemetry (published projects / public portfolios / industry partners), scroll-linked exit (copy recedes and blurs while the camera dollies through the gate).
2. **Manifesto**: scroll-lit statement plus two discipline rows drifting in opposite directions (scroll-linked, not an endless marquee).
3. **01 / The work — spatial index**: editorial rows (not cards); a sticky 3D viewer with a procedural `SpatialGlyph` follows hover/focus on wide screens. Descriptions and technologies stay in the rows for touch and screen readers.
4. **02 / The people — portfolio plates**: native horizontal scroll + snap, 3D tilt, id-derived aura, scroll-progress line.
5. **03 / The connection**: scroll-linked band of real published partner names (falls back to collaboration verbs when none are published), partner chips, inquiry CTAs.
6. **Your next chapter**: student workspace CTA inside an SVG gate.

All original copy, headings, ids (`home-title`, `work-title`, `talent-title`, `collaborate-title`) and destinations are preserved.

## 7. Shared chrome

- **Header**: sticky; utility bar (Talent & Industry Platform · Staff / Admin Portal) scrolls away while the glass bar pins. New `BrandMark`. Server-side session/role logic is unchanged.
- **Navigation**: same destinations, `aria-current`, dialog semantics, labels, focus containment, Escape and focus return. Mobile menu is a full-screen native modal dialog with staggered display-type links (`data-lenis-prevent`, scroll lock via `html:has(dialog[open])`). Mobile breakpoint is now 1100px.
- **Footer**: same links, COSC note, developer credit and secure social links (unchanged hrefs, `target`, `rel`, labels). Adds an oversized kinetic `FooterWordmark`. The global independent-project disclaimer is unchanged.

## 8. Validation

| Check | Result |
| --- | --- |
| `npm run typecheck` | pass |
| `npm run lint` | pass |
| `npm test` (unit + frontend) | 51 files / 419 tests pass |
| `npm run build` | pass |
| Homepage-related browser specs (new `home-experience.spec.ts` + talent, branding, ux-overhaul), desktop + mobile-390 | 56 passed, 2 skipped by design (Lenis check skipped on coarse pointers) |
| Full browser suite (`npx playwright test`, desktop + mobile-390) | 180 passed, 6 skipped (5 pre-existing mobile-only skips + 1 new coarse-pointer skip), 0 failed |
| Responsive captures 390 / 768 / 1440, WebGL fallback, reduced motion, mobile menu, kinetic states | `screenshots/phase-1/` |

Browser checks used a disposable loopback PostgreSQL 17 container seeded with the course fixtures. WebGL captures used Chromium SwiftShader; real GPUs render the same scene faster.

## 9. Handoff for Phase 2

Reuse, don't fork:

1. **Tokens first.** Use `var(--flare)` / `var(--ion)` / `var(--void)` / `--font-display|serif|mono` and `--step-*`. Legacy names keep working, so existing modules need no mass rename; migrate opportunistically.
2. **Headlines**: `font-family: var(--font-display); font-stretch: 84%; font-weight: 520–560; letter-spacing: -.045em; line-height: .94` with one serif italic emphasis in `--flare` (`.sectionHeading h2` in `home.module.css` is the reference). Eyebrows: `.ui-eyebrow` with a `NN / Label` index.
3. **Motion on a page**: wrap the page body in `<MotionRoot>` (client boundary only around what needs it) and import from `@/components/motion/*`. Add `data-motion-static=""` to any element whose Motion style could hide or offset content. Prefer `ScanReveal` for section entry, `TiltSurface` for spatial previews, `Magnetic` only on one or two primary actions per view.
4. **Do not mount `SmoothScroll` on pages with iframes/demos** (project detail, XR showcase): Lenis's stylesheet disables iframe pointer events while smoothing.
5. **WebGL**: reuse `SpatialStage` / `SpatialCanvas` (add a scene to `heroScenes`) rather than adding a second render loop. Keep one canvas per page and keep the poster fallback.
6. **Procedural art**: `SpatialGlyph` and `seeded(id, n)` give stable, original visuals for records without media.
7. **Keep**: the NOT ImmXrsive disclaimer, developer credit, staff portal visibility, header session logic, and published-only data access.
8. **Test hooks**: `[data-status]` on the spatial stage; homepage behaviour is covered by `tests/browser/home-experience.spec.ts`.

## 10. References and licensing

Inspected: Motion docs (scroll, springs, reduced motion), Lenis (React adapter, `respectReducedMotion`, `data-lenis-prevent`, iframe caveat), Skiper UI (interaction catalogue; components are mostly paid with no stated licence, so **no code copied**: only the general ideas of magnetic and tilt interaction), Unicorn Studio community (shader-scene compositions as inspiration for a hand-written scene; no exports used). All code is original. Dependencies added: `motion` (MIT), `lenis` (MIT), `@fontsource-variable/bricolage-grotesque`, `@fontsource-variable/jetbrains-mono`, `@fontsource/instrument-serif` (OFL-1.1). None are paid.
