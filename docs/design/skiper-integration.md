# Actual Skiper source integration — 2026-11-19

Implemented in the existing `.design-worktree` on `feat/immxrsive-ux-overhaul`, based on Claude's Phase 1 commit `9a689ff`. No merge, push, deployment, production access, schema change, authentication change, or permission change was performed. PR #14 was read and confirmed draft. Visual acceptance belongs to the user.

## Installed source and route map

The following files are adapted **from the actual public shadcn registry payloads**, not newly written imitations. The complete upstream payloads, including original source, are retained under `docs/design/skiper-registry/`. The documented installation names are `@skiper-ui/skiper28`, `@skiper-ui/skiper31`, `@skiper-ui/skiper34`, `@skiper-ui/skiper47`, and `@skiper-ui/skiper58`. Direct source installation used `https://skiper-ui.com/r/skiper<ID>.json`.

| Installed file | Functional import | Rendered routes and conditions |
| --- | --- | --- |
| `src/components/v1/skiper47.tsx` | `Carousel_001` in `components/home/ProjectExhibition.tsx` | `/`, `/projects` without filters, `/showcase` for records in the existing published showcase collections; requires nonempty published project data |
| `src/components/v1/skiper58.tsx` | `TextRoll` in `components/layout/SiteNavigation.tsx` | Shared desktop/mobile header on every route, including all public routes |
| `src/components/v1/skiper28.tsx` | `Skiper28` in `app/page.tsx` and `app/partners/page.tsx` | `/` editorial project/contribution narrative; `/partners` with names from `publicCompanies()` |
| `src/components/v1/skiper31.tsx` | `Skiper31`, internally using upstream `CharacterV1`, in `app/page.tsx`, `components/talent/TalentDirectory.tsx`, `app/showcase/page.tsx` | `/`, `/talent`, `/showcase` |
| `src/components/v1/skiper34.tsx` | `StickyCard_003` in `components/home/ProjectExhibition.tsx` | Same exhibition routes as #47, **only if published, permitted media exists**. Not claimed as visibly demonstrated in the current image-free local dataset. |

Four actual components (#28, #31, #47, #58) are visibly rendered and exercised in Chromium. A fifth (#34) is installed and conditionally integrated. #34 is not counted toward the four demonstrated components.

## Adaptations to the registry source

- Replaced `framer-motion` imports with the already installed official `motion/react` API. Motion `14.14.0` and Lenis `1.3.27` remain installed and used from Phase 1. Added and actually used Swiper `14.4.0` (lockfile included).
- Converted upstream Tailwind utility styling to `skiper.module.css`, preserving the existing CSS Modules architecture. Tailwind and `cn` utility packages are unnecessary after this conversion. No missing utility classes remain in installed components.
- Removed demo-only stock images, arbitrary demo copy, and duplicated page-level Lenis roots. No upstream demo illustration is presented as student work.
- #28 retains upstream scroll progress → Y mapping, `useMotionTemplate`, X rotation and sticky perspective stage; accepts editorial text, uses a less extreme 700px perspective, and has a shorter mobile track.
- #31 retains upstream `CharacterV1` scroll → X/rotateX mappings. Removed unused icon-demo variants and demo wrappers. Added typed Motion values, word grouping, accessible sentence text and a real editorial wrapper.
- #47 retains upstream Swiper coverflow settings, centered slides and pagination. Adds real project links, optional published imagery, title/description cards when images are absent, responsive slide counts, instance-scoped generated navigation, keyboard/A11y modules, and reduced-motion remounting with zero transition duration. Autoplay is off in every integration.
- #58 retains the actual duplicated character rows, stagger timing and Motion hover variants. Adds one screen-reader text label, hidden decorative copies, valid inline markup, and instant keyboard focus feedback.
- #34 retains the sticky stack's scroll-based scale/rotation and counter-rotated image. Replaced the original render-time subscription with `useMotionValueEvent` for cleanup and the initial infinite threshold/state update with a finite Motion value. Adds proper alt text, a project caption/link, and reduced-motion resting styles.
- Preserved upstream author/license notices and added visible site-footer attribution linking to Skiper UI.

References: [Motion installation](https://motion.dev/docs/react-installation), [Lenis React/native scrolling](https://github.com/darkroomengineering/lenis), [#47](https://skiper-ui.com/v1/skiper47), [#58](https://skiper-ui.com/v1/skiper58), [#28](https://skiper-ui.com/v1/skiper28), [#31](https://skiper-ui.com/v1/skiper31), [#34](https://skiper-ui.com/v1/skiper34).

## R4 and Phase 1 preservation

Inspected frozen `R4-submission` (`4d41de783069b4afcad8e43e87a26f19648e6d38`) directly with `git show`, including `TalentDirectory.tsx`, `ImmersiveField.tsx` and `useCinematicMotion.ts`. Reviewed the existing `screenshots/before/talent-1440.png`; these three source files match the captured baseline revision `34426d8`. R4 used a Three.js wireframe core, halo, particle field and grid, with GSAP chapter timelines, camera movement and Flip-assisted filtering.

Recovered the spatial landing → kinetic editorial transition → searchable evidence rhythm. `/talent` now reuses Phase 1's pointer/scroll-reactive WebGL spatial stage and complete poster fallback, then displays the actual #31 transition before the directory. Search, advanced expressions, URL/history restoration, filters, errors, focus handoff, privacy gates and account links remain the existing implementation. The skip-to-directory link remains available.

Claude's homepage shader, typography, manifesto, WorkIndex, PeopleRail, partner connection, tokens, fonts, Motion infrastructure and Lenis lifecycle are preserved. The new registry exhibition augments those sections. Lenis remains homepage-only, fine-pointer-only and off for reduced motion; showcase/demo routes retain native scrolling. No duplicated smooth scroller is introduced.

## Data and licensing limits

Client props originate in the existing `listPublicProjects()` publication/lifecycle-gated query and `publicCompanies()`. Added only an explicitly projected `media` array from published admin thumbnails/gallery with existing `safeAdminUrl()` checks and nonempty alt text. No credits, private drafts, email addresses, authentication fields or whole admin content objects are passed to the exhibition.

**The local database contains course sample records, and no approved project images.** Screenshots are browser evidence using those existing sample records, not evidence of authentic student work or proof of image rights. Titles such as Industrial Safety VR Trainer and Museum Quest Experience are existing fixtures; no invented client-side portfolio records or unrelated stock photography were added. Existing private/public profile behavior is unchanged. A permitted published collection/media source was requested from the user; authentic-content acceptance remains open until that source is available. #34 remains conditional rather than filling the page with invented screenshots.

**#35 Hover Expand is currently Pro**, despite being listed as free in the request: [current official page](https://skiper-ui.com/v1/skiper35) identifies “Pro Login Required” and a license-key installation. No authorized Pro entitlement was found or used. #35, #36, #80, #71 and #73 were not installed or claimed. The spatial hero is Claude's original WebGL scene; the exhibition uses actual free #47/#34 plus Motion. It is not a Pro implementation.

Investigated [Unicorn Studio's official embed guide](https://www.unicorn.studio/docs/embed/) and [SDK](https://github.com/hiunicornstudio/unicornstudio.js). A real published project ID or authorized exported scene JSON is required. No usable scene was supplied or present in this codebase. No Unicorn embed, placeholder ID, SDK-only claim, paid scene or license workaround was added.

This supersedes the earlier Phase 1/reference-only statement about Skiper usage: actual free source is now installed and attributed. Earlier original-code descriptions remain historical descriptions of their respective commits.

## Verification

- `npm run typecheck`: pass.
- `npm run lint`: pass, no warnings.
- `npm run build`: pass.
- `npm test`: 51 files / 419 tests passed.
- Publication/detail/privacy integration regressions: 3 files / 21 tests passed. The publication lifecycle test now verifies that approved thumbnail/gallery data appears only for published staff-curated projects and vanishes when unpublished/archived. Synthetic image URLs exist only inside this isolated test, not site content.
- Full browser suite: **192 passed, 6 skipped, 0 failed; exit status 0 (4.2 minutes)**. See `skiper-browser-results.txt` for the final run. The six skips are existing platform/viewport-specific cases, including the fine-pointer-only Lenis test on mobile; none of the new integration cases is skipped. New `skiper-exhibition.spec.ts` exercises actual rendered imports, carousel buttons/pagination, keyboard arrows, mouse dragging, mobile touch swiping via Chromium touch events, navigation hover/focus/tap, scroll-dependent transforms, reduced motion, JavaScript-disabled index fallback, horizontal overflow and runtime errors. The sandboxed run completed its cases but stalled during Windows process cleanup; the definitive full rerun outside the sandbox exited successfully against the same isolated loopback database.
- Real Chromium captures at 390×844 and 1440×1000: `screenshots/skiper/`, including home/talent/projects/showcase/partners plus carousel, perspective, scroll-text and navigation detail captures. Eighteen PNGs total; `skiper-screenshot-manifest.json` records their actual dimensions. These are rendered application screenshots, not generated mockups. Full-page images can show scroll components at intermediate states; detail images show their viewport states. The mobile menu capture explicitly waits for its final link to reach full opacity and its resting position.
- Existing WebGL-unavailable tests verify the complete poster and usable navigation. Existing Lenis tests verify native scrolling on coarse pointers, reduced motion and after leaving home. Added a no-JavaScript resting stylesheet so exhibition text/cards and the server-rendered project index remain readable without animation.

Known pre-existing fallback limit: `/projects/[projectId]` uses a Next.js streamed `loading.tsx` boundary; with JavaScript fully disabled, Chromium can remain on that loading state. This change does not claim full no-JavaScript project-detail or talent-API support. Normal JavaScript with WebGL unavailable, reduced motion, touch or Lenis disabled remains supported and tested.

No visual acceptance is asserted. Genuine project imagery and any Pro/Unicorn integration remain dependent on authorized source assets.

## Brand refresh attribution placement

Interactive components adapted from [Skiper UI](https://skiper-ui.com) by Gurvinder Singh. Attribution and the original upstream author/license notices remain in the repository (component source and `docs/design/skiper-registry/`). The brand refresh removes the public footer credit; it does not remove or change those notices. The homepage now uses shared Student stories; project exhibitions remain on `/projects` and `/showcase`.
