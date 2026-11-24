# PR #14 — visual correction review

Design acceptance remains with the user. These are implementation repairs and observed QA results, not a claim of visual acceptance.

The existing uncommitted work was retained on `feat/immxrsive-ux-overhaul`. No new application effects, component libraries, or dependencies were added. Actual Skiper28/31/47/58, Motion, Lenis, the dimensional X scene and their attribution remain in use.

## Before / after

| Issue | Before | Repair and observed result |
| --- | --- | --- |
| Partners | Every company name was concatenated into one perspective paragraph. UUID records created an enormous transformed block that escaped a fixed-height track and covered the cards. | The actual #28 component now contains bounded editorial copy in normal flow. Copy determines section height; modest perspective/Y limits, a reserved reading margin, and a local stacking context keep it above and separate from the directory. Every original published partner title remains in the directory. |
| Animated text | #28 translated 487px inside 180vh/135vh tracks; #31 moved each character by up to hundreds of pixels and rotated it through multiple turns. | #28 translates at most 16px and rotates at most 8°. #31 retains the registry's per-character scroll mapping with subpixel horizontal offsets and rotations capped at ±6°. Stable word wrapping, normal character spacing and readable line height replace scrambled/intersecting letters. Five positions across each mapping are checked. |
| Navigation | Programmatic scrolling could align components directly beneath the sticky bar; large headings showed through its translucent background; rolling labels had tight leading. | Shared scroll padding and component/heading offsets reserve header clearance. The bar is opaque, so scrolled headings no longer ghost behind its labels. TextRoll leading is 1.3. Existing modal semantics, Escape, focus containment, keyboard activation, hover and touch behavior are retained. |
| Vertical rhythm | Content-free scroll tracks and fully clipped offscreen section headings created large empty blocks. | Removed fixed viewport-height text tracks. Entry wrappers now begin readable rather than fully clipped. Manifesto, project/people sections, footer and editorial spacing are reduced. Scroll-copy initial opacity is readable. |
| Mobile/tablet X | Camera framing used the canvas aspect ratio and the copy reserved a large viewport-sized gap. The real WebGL X could become oversized and cropped. | The existing shader receives CSS dimensions and frames the narrow-screen object in a bounded visual field; desktop composition remains dimensional. Mobile copy starts after a deliberate 220px art area, typography is smaller, and both primary actions fit on one row. Poster and reduced-motion fallbacks remain. |
| Carousel | Oversized numbers, compressed copy, and a hidden broken image left weak or missing media treatments. | Actual Skiper47/Swiper coverflow remains. Cards use original static geometric field studies labeled with truthful domain/technology metadata, a quieter typographic hierarchy and responsive slide counts. Permitted published media takes precedence. An image error restores the graphic composition, keeping the project link and metadata visible. No project imagery or achievements were fabricated. |
| Showcase | A large scroll-text panel, launch instructions and redundant empty collections were allocated even when no experiences existed. | Empty collections have no animation, carousel track or launch instructions. A compact explanation and project-index link replace the nonfunctional search; the explicit student availability message remains without a duplicate empty panel. Published rows and their workflows remain intact. |
| Review records | UUID course-review records could be promoted into large public editorial features. | An explicit review-title + UUID predicate excludes these records only from editorial features. It does not rename, unpublish, delete, or remove them from directories, detail routes, or counts. Ordinary project titles and legitimate UUID-only titles are not classified as review fixtures. |

## Screenshot gallery

[Open the new rendered gallery](screenshots/visual-qa/index.html). Its **75 real JPEG captures** include full pages, hero/carousel/navigation viewports, reduced motion, and start/middle/settled text states at **390px, 768px and 1440px**. Actual image dimensions were verified against the manifest. Width and route selectors make the gallery easier to review; each image opens at its original resolution.

Examples: [phone hero](screenshots/visual-qa/home-390-hero.jpg), [desktop hero](screenshots/visual-qa/home-1440-hero.jpg), [phone carousel](screenshots/visual-qa/home-390-carousel.jpg), [partner reading plane](screenshots/visual-qa/partners-1440-skiper28-middle.jpg), [phone text](screenshots/visual-qa/home-390-skiper31-middle.jpg), [empty showcase](screenshots/visual-qa/showcase-390-full.jpg).

Original review evidence remains unchanged in `screenshots/skiper/`, including [partners before](screenshots/skiper/partners-390.png), [perspective before](screenshots/skiper/perspective-1440.png), and [talent before](screenshots/skiper/talent-1440.png).

The capture script uses the running production build, actual browser scrolling and the existing local test database. It exercises section entry before full-page captures, then returns to the top and waits for the hero's resting opacity. Targeted animation captures sample the actual scroll mapping without overriding component props. The screenshots were visually inspected, including full pages and viewport states; exit codes alone were not used as a design review.

## Validation

Final command results are recorded in `visual-qa-validation.txt`.

- `npm run build`, `npm run typecheck`, `npm run lint`.
- Full unit/frontend suite: **53 files, 422 tests passed**. New regressions verify failed-image recovery, empty-showcase recovery, and narrowly scoped review-fixture classification.
- **Complete integration suite: 20 files, 218 tests passed**, using isolated loopback PostgreSQL test databases. Publication, privacy, authentication, student/project/team, administrative and partner workflows remain covered.
- Complete Playwright suite includes the original interaction regressions plus `visual-quality.spec.ts`. The new checks cover document overflow at all three widths, first-page and scrolled header clearance, text containment, adjacent-character intersection, overlap with following content, unjustified section heights, title clipping, loaded media or a visible graphic fallback, and absence of review UUIDs in editorial features. Existing tests cover dragging, genuine emulated touch swipes, pagination/arrows, hover, keyboard activation, focus containment, Escape, reduced motion, native scrolling and WebGL failure.
- **Final complete browser run: 198 passed, 6 existing viewport-specific skips, 0 failed, exit status 0 (4.5 minutes).** The restored empty-state information passes on desktop and mobile.
- After the last visual inspection identified headings ghosting through the bar, its background was made opaque. The rebuilt final version passed **29 focused browser regressions, 1 existing mobile Lenis skip**, including all geometry widths, header paint, Skiper interactions, Studio and homepage checks.

Full-page capture cases use a separate 120-second budget for five routes and their screenshots. Functional interaction tests retain their existing timeout. A full-browser regression caught the lost explicit student-showcase availability message; the application message was restored while keeping the empty layout compact.

## Limits and protected scope

- Existing local published records are course/test data; they are not presented as proof of authentic student achievements or image permissions. No new application records were invented for this design pass. Metadata graphics are explicitly field studies, not project screenshots. Real permitted project imagery remains conditional on published media being supplied.
- The previous no-JavaScript streamed project-detail limitation remains; this pass does not claim full no-JavaScript support for that existing route. Native scrolling, reduced motion and missing WebGL remain supported.
- Frozen `R4-submission` remains `4d41de783069b4afcad8e43e87a26f19648e6d38`. No production, schema, authentication or authorization code was modified. Existing test migrations run only on isolated test targets.
- No push, merge, PR promotion or deployment was performed. PR #14 remains draft. Current uncommitted work and unrelated files were preserved.
