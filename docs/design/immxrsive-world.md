# ImmXrsive World (`/world`)

A standalone, explorable 3D world for events and first meetings. It does not change the main site: it lives at `/world`, and its 3D code is only loaded on that page.

## Experience

- **Intro:** a slowly orbiting planet with the title and "Enter the world". The camera then swoops down to Spark.
- **Spark:** an original, gender-neutral guide (a floating ball of energy with an X-shaped core, eyes and a light trail). It is deliberately *not* the Algoma Thunderbird (a sacred Anishinaabe symbol and the university's dodem) or Boomer the Thunderbolt (an official mascot that would need university approval).
- **Places** (`src/components/world/world-content.ts`):
  - **The X** (hub, north pole): what ImmXrsive is.
  - **24 Queen St E**: Algoma University's Brampton campus with Garden Square, modelled from Google Street View: a cream 11-storey tower with a full-height blue glass bay, a two-storey podium, a green glass canopy and the Algoma University sign band. Other tenants' signs are left blank on purpose.
  - **Stories House**: opens the **student shelf** full screen (see below). The list view keeps the story cards.
  - **Showcase Lab**: SYNC, Canon DNA, Project Nexus, plus a "coming soon" slot.
  - **Industry Dock**: partners and inquiries (bay, ferry, lighthouse).
  - **Launchpad**: join and sign in, with a real QR code (`public/world/join-qr.svg`).
- **Controls:** WASD/arrows to move, Shift to boost, Space to hop, E/Enter to go inside, M for the map, Esc to close. Click a building or label to fly there; on touch devices, use the joystick and tap.
- **Tour:** the "Tour" button flies to every place with a caption. It also starts by itself after 45 s idle.
- **Kiosk mode:** `/world?kiosk` enters automatically and starts the tour after 25 s idle. Use it at event tables.
- **List view:** `/world?list`, or the "List" button. The same content without WebGL. This is also the automatic fallback when WebGL is unavailable.
- **Quality:** resolution and then bloom drop automatically on slow devices. `/world?hq` locks full quality (use it for recordings).

## Stories House shelf (`/world/stories-shelf.html`)

An adaptation of ThreeUI's **Complete Shelf** (`complete-shelf-v2.html`, SHA-256 `606f200fed8602c243f40a11c8c364f0e625c57f80e7c97dc76419da207f198e`), taken from the MIT-licensed npm package `@designcodeio/threeui@1.2.0` (© 2026 Meng To; licence in `public/world/THREEUI-LICENSE.txt`). Its scene, shaders, motion and interactions are kept verbatim. `scripts/threeui/adapt-complete-shelf.py` records every change and can regenerate the page from the original HTML:

```
npm pack @designcodeio/threeui@1.2.0 && tar -xzf designcodeio-threeui-1.2.0.tgz
python3 scripts/threeui/adapt-complete-shelf.py package/lib-dist/assets/landing-pages/complete-shelf-v2.html public/world/stories-shelf.html
```

Changes made:
- Seven student volumes replace the seven tools: Jash Sojitra (with photo), plus six explicit **Coming Soon** volumes.
- The tool cover-art atlas was removed. Covers are drawn in code from each volume's colours and motif, and a student photo goes in an arched window.
- The ImmXrsive accent replaces copper, and the editorial copy is rebranded.
- A hover preview card (avatar, name, preview text) for mouse users. On touch devices the selected volume's preview shows in the bottom bar instead.
- Flat-printed cover text instead of the floating foil text, so covers stay readable on any GPU.
- three.js r165 is self-hosted in `public/world/vendor/three-0.165.0` (MIT), so it doesn't depend on a CDN.
- Escape with no open volume tells the parent world to close the shelf, and the world stops rendering while the shelf is open.

To add a student, edit the `books` list in the adaptation script (`photo` points to `public/world/students/<id>.jpg`, about 720×792) and regenerate. Also update `world-content.ts`.

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
