# ImmXrsive World (`/world`)

A standalone, explorable 3D world for events and first meetings. It does not change the main site: it lives at `/world`, and its 3D code is only loaded on that page.

## Experience

- **Intro:** a slowly orbiting planet with the title and "Enter the world". The camera then swoops down to Spark.
- **Spark:** an original, gender-neutral guide (a floating ball of energy with an X-shaped core, eyes and a light trail). It is deliberately *not* the Algoma Thunderbird (a sacred Anishinaabe symbol and the university's dodem) or Boomer the Thunderbolt (an official mascot that would need university approval).
- **Places** (`src/components/world/world-content.ts`):
  - **The X** (hub, north pole): what ImmXrsive is.
  - **24 Queen St E**: Algoma University's Brampton campus with Garden Square. A stylized building; replace it with a closer model once reference photos are approved.
  - **Stories House**: student story cards (Jash Sojitra; the others say "coming soon").
  - **Showcase Lab**: SYNC, Canon DNA, Project Nexus, plus a "coming soon" slot.
  - **Industry Dock**: partners and inquiries (bay, ferry, lighthouse).
  - **Launchpad**: join and sign in, with a real QR code (`public/world/join-qr.svg`).
- **Controls:** WASD/arrows to move, Shift to boost, Space to hop, E/Enter to go inside, M for the map, Esc to close. Click a building or label to fly there; on touch devices, use the joystick and tap.
- **Tour:** the "Tour" button flies to every place with a caption. It also starts by itself after 45 s idle.
- **Kiosk mode:** `/world?kiosk` enters automatically and starts the tour after 25 s idle. Use it at event tables.
- **List view:** `/world?list`, or the "List" button. The same content without WebGL. This is also the automatic fallback when WebGL is unavailable.
- **Quality:** resolution and then bloom drop automatically on slow devices. `/world?hq` locks full quality (use it for recordings).

## Content rules

Everything in `world-content.ts` is real, approved content or an explicit placeholder. Do not add student names, quotes, photos or project claims without approval. To add a student story, change a `{ kind: "coming-soon" }` entry to a `student` entry (with `photo` once a photo is supplied).

## Code map

| File | Purpose |
|---|---|
| `src/app/world/page.tsx` | Route + metadata |
| `src/components/world/WorldExperience.tsx` | UI shell: intro, labels, panels, tour, kiosk, joystick, list view |
| `src/components/world/PlaceContent.tsx` | Place content shared by the panel and the list view |
| `src/components/world/engine/world.ts` | three.js renderer, camera rig, movement, autopilot flight, picking, labels, adaptive quality |
| `src/components/world/engine/terrain.ts` | Planet surface function, water, atmosphere, paths, scatter |
| `src/components/world/engine/buildings.ts` | The six procedural buildings |
| `src/components/world/engine/spark.ts` | Spark character |
| `src/components/world/engine/sky.ts` | Stars, nebulae, moon, particle ring, drones |
| `scripts/generate-world-qr.ts` | Regenerates the QR code (`npx tsx scripts/generate-world-qr.ts [url]`) |

All geometry is generated in code: no paid 3D services and no external model files. `three` (MIT) is the only new runtime dependency.

## Visual pipeline

- Multisampled HDR composer: bloom → output → colour grade (purple-lifted shadows, gentle S-curve, vignette, fine grain).
- A key light follows the camera so whatever you look at is lit from the upper left, with soft PCF shadows near Spark.
- A holographic grid and a pulse that ripples out from the hub on the planet. Paths carry light flowing outward. Fireflies, slow clouds, twinkling stars and a fresnel glass shell on Spark.
- Environment-map reflections (PMREM) were tried and dropped: they rendered lit materials black on software/older GPUs, a risk for event laptops and projectors.
- Adaptive quality ladder: lower resolution → shadows off → bloom off.

## Credits

- The magnetic dock (`WorldDock.tsx`) and the kinetic title reveal are native reimplementations inspired by [Componentry](https://componentry.dev) (MIT, © 2026 Harsh Jadhav). No Componentry source is copied, and no Tailwind/shadcn was added.
- The world reuses the three.ui-derived architecture already documented in `docs/threeui-kage-provenance.md`: a full-viewport WebGL scene behind semantic DOM, damping, adaptive pixel ratio, reduced motion and explicit cleanup.

## Tests

- `tests/unit/world-content.test.ts`: content integrity, no invented content
- `tests/frontend/world-list-view.test.tsx`: accessible list view
- `tests/browser/world.spec.ts`: `/world` intro and the list fallback on desktop and 390 px
