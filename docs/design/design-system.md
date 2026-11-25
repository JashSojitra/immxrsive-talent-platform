# ImmXrsive design system

> **Phase 1 update (2026-11-19):** identity, tokens, typography, motion system, homepage, header, navigation and footer are now defined in [phase-1-spatial-identity.md](phase-1-spatial-identity.md), which supersedes the token table, the homepage interaction notes and the header/footer notes below. Legacy token names remain valid. Operational guidance for directory, student and staff screens below still applies until Phase 2.

## Identity and surfaces

The product retains its independent student-course identity and dark theme. Use warm editorial typography with quiet, precise working surfaces. Coral identifies the primary action; sage communicates published evidence and positive status. Do not use student skills or affiliations inferred from project technologies.

| Token | Value | Use |
| --- | --- | --- |
| `--ink` | `#101214` | Application canvas |
| `--bone` | `#f1eee7` | Primary text |
| `--muted` | `#b0b4af` | Secondary text, readable help |
| `--signal` | `#ff806b` | Primary actions and editorial emphasis |
| `--electric`, `--success` | `#b9d3bf` | Evidence and positive status |
| `--danger` | `#ff9e91` | Error feedback |
| `--surface` | `#191d20` | Cards and forms |
| `--surface-raised` | `#22272a` | Nested or elevated content |
| `--line` | `#3b4143` | Decorative dividers |
| `--control-border` | `#6c7475` | Input boundaries |
| `--radius-sm`, `--radius-md` | `5px`, `12px` | Controls / public cards |
| `--shadow-panel` | restrained 20px/60px shadow | Modal elevation |

Existing local Onest supplies interface text; Instrument Serif supplies selected editorial emphasis. Operational headings are compact and use normal sans-serif. Public hero type scales fluidly; never conceal headings for an entrance. Typical body text is 14-17px with 1.6-1.8 line height. Metadata remains subordinate without competing colors.

Spacing uses a 4px foundation: 8/12/16px within controls, 20/24/28/32px for groups, 48/56/64/80px between public sections. Operational screens use shorter 24-40px section gaps. The main canvas is at most 1320px, with 40px desktop gutters and 20px mobile gutters. Existing local CSS Modules consume global semantic tokens; avoid a second component library.

## Shared components and layouts

- `SiteHeader` reads session, student verification, and staff role on the server. No user identity or private profile is passed to client navigation. Verified student and staff capability checks are independent. A verified dual-role account gets both dashboard links; staff privileges alone never imply student verification.
- `SiteNavigation` provides active public destinations and a native modal mobile dialog. Browser focus containment, Escape, labeled close and focus return are retained. Staff entry remains discoverable above every page.
- `SiteFooter` provides contextual paths and the requested secure SVG social links for Jash Sojitra. Independent-course disclaimer remains global.
- `ProjectCard` is a reusable public record with discipline, technology, management mode and real project status. Staff credits remain distinct from actual student ownership.
- `ProjectWorkspace`, `AdminShell`, student dashboard and local inquiry/profile modules share surfaces, controls and type while preserving their different tasks.
- Public loading/error/empty states explain the next action. Forms retain their existing validation, disabled submission protection, private draft saves and inline outcomes.

## Interaction decisions

| Token | Value | Use |
| --- | --- | --- |
| `--motion-fast` | 140ms | Hover and press |
| `--motion-panel` | 240ms | Mobile dialog entry, spatial exhibit focus/hover |
| `--motion-exit` | 180ms | Dialog exit |
| `--ease-out` | cubic-bezier(.32,.72,0,1) | Response / appearance |
| `--ease-in` | cubic-bezier(.55,0,1,.45) | Exit |
| `--ease-move` | cubic-bezier(.77,0,.175,1) | Reserved spatial movement |

Public homepage: one original static SVG spatial study. A 2.5% scale on hover/focus signals the showcase link. The entire destination and caption are always visible on touch devices. No autoplay, WebGL render loop, scroll hijacking or content-reveal prerequisite.

Directory, student and staff screens: no heading, row or page entrance choreography. Filter updates and saves use existing pending/error logic. Keyboard highlights appear immediately. CSS transitions name their properties and reverse from their current values. The native dialog uses progressive discrete display transitions; browsers without support still provide working native modal behavior. Global reduced-motion CSS disables every animation/transition and smooth scrolling; content remains functional.

## Responsive behavior and accessibility

- Public home collapses at 700px; project cards at 1000/650px; working forms at 650-820px.
- Header switches to mobile menu at 1050px; account links wrap before that threshold.
- Main controls target 44-48px or more; footer social links and home identity have 44px targets.
- Visible keyboard focus uses high-contrast sage/coral. Inputs have stronger boundaries than decorative dividers. Errors pair text with color.
- No implicit embed execution: project demo launch, opaque `sandbox="allow-scripts"`, referrer and device restrictions remain in the original components.
- Checks cover 390, 768, 1280 and 1440px; automated coverage is not a claim of full assistive-technology certification.

## Reference and source decision

Applied `charles-ux-animation`, including recipes and techniques; `ponytail`; React best practices and end-to-end verification guidance. Sites local-only workflow used; no hosting registration or publication.

Inspected Componentry documentation, Hover Transition usage and actual `packages/ui/src/components/hover-transition.tsx`, registry requirements, and MIT license (Harsh Jadhav, 2026). Its React wrapper handles focus/blur and reduced-motion changes, but supplies duplicate visual layers, pointer tracking, Tailwind utility styling and a default 720ms effect. Its utility dependencies are clsx/tailwind-merge. Importing that wrapper would add unnecessary styling machinery for this application. No upstream source copied and no Componentry package adopted; an original CSS-only showcase interaction applies the useful editorial idea. No new dependencies or package-lock changes.
