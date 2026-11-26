import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

import type { PlaceId } from "../world-content";
import { accent, brand } from "./palette";
import { mulberry32 } from "./noise";
import { bayCentre, frames, placeOnSurface, stepAlong, WATER_RADIUS } from "./terrain";

export type Building = {
  id: PlaceId;
  group: THREE.Group;
  /** Extra objects positioned in world space (e.g. the ferry). */
  extras: THREE.Object3D[];
  /** Height of the label anchor above the plaza. */
  height: number;
  /** Collision radius in world units around the place centre. */
  footprint: number;
  update: (time: number, dt: number) => void;
};

/* ---------- materials & textures ---------- */

const solid = (color: number, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.7, metalness: 0.08, ...extra });

const glass = (color: number, emissive = color, intensity = 0.25) =>
  new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: intensity, roughness: 0.12, metalness: 0.7, flatShading: true });

/** Unlit and over-bright so the bloom pass picks it up. */
const neon = (color: number, boost = 2.2) => new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(boost), toneMapped: false });

const FONT = '"Bricolage Grotesque Variable", "Onest", Arial, sans-serif';

function canvasTexture(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  draw(ctx);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function edges(geometry: THREE.BufferGeometry, color: number, opacity = 1) {
  return new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry, 20),
    new THREE.LineBasicMaterial({ color: new THREE.Color(color).multiplyScalar(2), transparent: opacity < 1, opacity, toneMapped: false }),
  );
}

function mesh(geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[], x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  return m;
}

function light(color: number, intensity: number, distance: number, y: number) {
  const point = new THREE.PointLight(color, intensity, distance, 1.6);
  point.position.y = y;
  return point;
}

function lamp(x: number, z: number) {
  const group = new THREE.Group();
  group.add(mesh(new THREE.CylinderGeometry(0.06, 0.08, 2.2, 6), solid(0x1b1830), 0, 1.1, 0));
  group.add(mesh(new THREE.SphereGeometry(0.2, 8, 6), neon(accent.warmWindow, 1.6), 0, 2.3, 0));
  group.position.set(x, 0, z);
  return group;
}

function roundTree(x: number, z: number, scale = 1) {
  const group = new THREE.Group();
  group.add(mesh(new THREE.CylinderGeometry(0.1, 0.14, 1, 5), solid(0x2a1f2f), 0, 0.5, 0));
  group.add(mesh(new THREE.IcosahedronGeometry(0.75, 0), solid(0x1d5c66, { emissive: new THREE.Color(0x0b2a33), emissiveIntensity: 1 }), 0, 1.45, 0));
  group.position.set(x, 0, z);
  group.scale.setScalar(scale);
  return group;
}

/* ---------- The X (hub) ---------- */

function buildHub(): Omit<Building, "id"> {
  const group = new THREE.Group();
  const plinth = new THREE.CylinderGeometry(4.2, 4.9, 0.8, 8);
  group.add(mesh(plinth, solid(0x221b45), 0, 0.4, 0));
  const ring = mesh(new THREE.TorusGeometry(4.25, 0.06, 6, 8), neon(brand.pink), 0, 0.82, 0);
  ring.rotation.x = Math.PI / 2;
  ring.rotation.z = Math.PI / 8;
  group.add(ring);

  const x = new THREE.Group();
  x.position.y = 5.3;
  const blade = new RoundedBoxGeometry(1.15, 9.2, 0.8, 2, 0.18);
  const bladeMaterial = glass(0x241035, brand.plum, 0.35);
  for (const angle of [0.62, -0.62]) {
    const b = mesh(blade, bladeMaterial);
    b.rotation.z = angle;
    const outline = edges(new THREE.BoxGeometry(1.15, 9.2, 0.8), angle > 0 ? brand.pink : brand.warmPurple, 0.9);
    outline.rotation.z = angle;
    x.add(b, outline);
  }
  x.add(mesh(new THREE.IcosahedronGeometry(0.55, 1), neon(accent.bone, 2.6)));
  group.add(x);

  const gate = new THREE.Group();
  gate.position.y = 5.3;
  const octagon = mesh(new THREE.TorusGeometry(6.2, 0.13, 6, 8), neon(brand.warmPurple, 2));
  octagon.rotation.z = Math.PI / 8;
  const octagonInner = mesh(new THREE.TorusGeometry(5.7, 0.04, 4, 8), neon(brand.pink, 1.6));
  octagonInner.rotation.z = Math.PI / 8;
  gate.add(octagon, octagonInner);
  group.add(gate);
  group.add(light(brand.pink, 60, 26, 5.3));

  return {
    group,
    extras: [],
    height: 11.8,
    footprint: 5,
    update: time => {
      gate.rotation.y = time * 0.25;
      x.position.y = 5.3 + Math.sin(time * 0.8) * 0.18;
      x.rotation.y = Math.sin(time * 0.3) * 0.25;
    },
  };
}

/* ---------- 24 Queen St E (Algoma University, Brampton) ---------- */

type FacadeDraw = (ctx: CanvasRenderingContext2D, glow: boolean) => void;

/** Colour + glow maps from one drawing: glow=true paints only what is lit at night. */
function facadeMaps(width: number, height: number, draw: FacadeDraw) {
  const map = canvasTexture(width, height, ctx => draw(ctx, false));
  const emissiveMap = canvasTexture(width, height, ctx => {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, width, height);
    draw(ctx, true);
  });
  return new THREE.MeshStandardMaterial({ map, emissiveMap, emissive: 0xffffff, emissiveIntensity: 0.9, roughness: 0.62 });
}

/** Cream precast tower with a grid of blue-tinted punched windows (24 Queen St E, from Street View). */
function towerFacade(columns: number, floors: number, seed: number) {
  const rng = mulberry32(seed);
  const lit = Array.from({ length: columns * floors }, () => rng() > 0.62);
  return facadeMaps(512, 1024, (ctx, glow) => {
    if (!glow) {
      ctx.fillStyle = "#ddd3c1";
      ctx.fillRect(0, 0, 512, 1024);
      ctx.fillStyle = "rgba(0,0,0,.06)";
      for (let f = 0; f <= floors; f++) ctx.fillRect(0, f * (1024 / floors) - 2, 512, 4);
    }
    const cellW = 512 / columns;
    const cellH = 1024 / floors;
    for (let f = 0; f < floors; f++) {
      for (let c = 0; c < columns; c++) {
        const x = c * cellW + cellW * 0.16;
        const y = f * cellH + cellH * 0.2;
        const on = lit[f * columns + c];
        if (glow) {
          if (!on) continue;
          ctx.fillStyle = "#ffcf94";
        } else {
          const gradient = ctx.createLinearGradient(x, y, x, y + cellH * 0.6);
          gradient.addColorStop(0, on ? "#f3c993" : "#3b5684");
          gradient.addColorStop(1, on ? "#d9a56d" : "#1b2a4a");
          ctx.fillStyle = gradient;
        }
        ctx.fillRect(x, y, cellW * 0.68, cellH * 0.6);
      }
    }
  });
}

/** Two-storey podium: upper windows, ground-floor storefronts and the Algoma University sign band. */
function podiumFront() {
  return facadeMaps(1024, 512, (ctx, glow) => {
    if (!glow) {
      ctx.fillStyle = "#e2d8c6";
      ctx.fillRect(0, 0, 1024, 512);
    }
    // Second-floor windows.
    for (const x of [40, 250, 640, 850]) {
      ctx.fillStyle = glow ? "#ffd7a3" : "#33507f";
      ctx.fillRect(x, 40, 134, 120);
    }
    // Ground floor: stone piers between dark storefront glass.
    const bays = [[20, 300], [330, 370], [654, 370]] as const;
    if (!glow) {
      ctx.fillStyle = "#b48d87";
      ctx.fillRect(0, 230, 1024, 282);
    }
    for (const [x, w] of bays) {
      ctx.fillStyle = glow ? "#8fb6ff" : "#1b2338";
      ctx.fillRect(x, 300, w, 212);
      if (!glow) {
        ctx.fillStyle = "rgba(255,255,255,.08)";
        for (let m = x + 60; m < x + w; m += 70) ctx.fillRect(m, 300, 4, 212);
      }
    }
    // Black sign band; only the Algoma University sign is shown.
    ctx.fillStyle = glow ? "#000" : "#111118";
    ctx.fillRect(0, 238, 1024, 52);
    ctx.fillStyle = "#e31c79";
    ctx.fillRect(655, 246, 18, 36);
    ctx.fillStyle = "#f4f0e8";
    ctx.font = `600 30px ${FONT}`;
    ctx.textBaseline = "middle";
    ctx.fillText("ALGOMA UNIVERSITY", 690, 265);
    // Entrance doors under the canopy.
    ctx.fillStyle = glow ? "#ffe6c2" : "#2a2f40";
    ctx.fillRect(470, 360, 84, 152);
  });
}

function buildQueen(): Omit<Building, "id"> {
  const group = new THREE.Group();
  const roof = solid(0x2c2a36);

  // Podium (two storeys) across the full frontage.
  const podiumSide = towerFacade(4, 2, 7);
  const podium = mesh(new THREE.BoxGeometry(12, 3.6, 7), [podiumSide, podiumSide, roof, roof, podiumFront(), podiumSide], 0, 1.8, -4.5);
  group.add(podium);
  group.add(mesh(new THREE.BoxGeometry(12.3, 0.22, 7.3), solid(0xcfc4b0), 0, 3.66, -4.5));

  // Tower: nine more storeys, set back from the podium face.
  const front = towerFacade(8, 9, 21);
  const side = towerFacade(6, 9, 33);
  group.add(mesh(new THREE.BoxGeometry(8.4, 9, 5.6), [side, side, roof, roof, front, side], 0, 3.6 + 4.5, -5.2));
  group.add(mesh(new THREE.BoxGeometry(8.7, 0.3, 5.9), solid(0xcfc4b0), 0, 12.75, -5.2));
  group.add(edges(new THREE.BoxGeometry(8.7, 0.3, 5.9), brand.pink, 0.5).translateY(12.75).translateZ(-5.2));
  group.add(mesh(new THREE.BoxGeometry(3.2, 1.1, 2.4), solid(0x3a3846), 1.6, 13.45, -5.6));

  // Full-height blue glass bay down the centre of the tower, with mullions and a cap.
  const bayGlass = new THREE.MeshStandardMaterial({ color: 0x2f5fa6, emissive: new THREE.Color(0x173a7a), emissiveIntensity: 0.7, roughness: 0.12, metalness: 0.65 });
  group.add(mesh(new THREE.BoxGeometry(2.4, 10.4, 0.7), bayGlass, 0, 3.4 + 5.2, -2.2));
  for (let f = 0; f <= 10; f++) group.add(mesh(new THREE.BoxGeometry(2.46, 0.06, 0.74), solid(0x9fb2c9), 0, 3.4 + f * 1.04, -2.2));
  group.add(mesh(new THREE.BoxGeometry(2.8, 0.35, 1.0), solid(0xcfc4b0), 0, 13.8, -2.3));

  // Green glass entrance canopy.
  const canopy = mesh(new THREE.BoxGeometry(3.4, 0.18, 1.8), new THREE.MeshStandardMaterial({ color: 0x4f9a86, emissive: new THREE.Color(0x1f5a4a), emissiveIntensity: 0.5, roughness: 0.2, metalness: 0.3, transparent: true, opacity: 0.85 }), 0, 2.35, -0.3);
  group.add(canopy);

  // Garden Square in front.
  const square = new THREE.Group();
  square.position.z = 5.2;
  square.add(mesh(new THREE.CylinderGeometry(6.2, 6.2, 0.12, 40), solid(0x3b3558, { roughness: 0.95 }), 0, 0.06, 0));
  square.add(mesh(new THREE.TorusGeometry(6.2, 0.05, 4, 64), neon(accent.warmWindow, 0.9), 0, 0.14, 0).rotateX(Math.PI / 2));
  const fountain = mesh(new THREE.CylinderGeometry(1.4, 1.5, 0.45, 24), solid(0x4a4466), 0, 0.3, 0);
  const pool = mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.1, 24), neon(accent.ion, 0.9), 0, 0.5, 0);
  const jet = mesh(new THREE.ConeGeometry(0.25, 1.4, 8), new THREE.MeshBasicMaterial({ color: accent.ion, transparent: true, opacity: 0.5 }), 0, 1.2, 0);
  square.add(fountain, pool, jet);
  for (const [x, z] of [[-4.4, -1.5], [4.4, -1.5], [-3.6, 3.2], [3.6, 3.2]]) square.add(roundTree(x, z, 1.15));
  for (const [x, z] of [[-2.6, 4.6], [2.6, 4.6], [-5.6, 1.6], [5.6, 1.6]]) square.add(lamp(x, z));
  for (const x of [-2.2, 2.2]) square.add(mesh(new THREE.BoxGeometry(1.6, 0.35, 0.5), solid(0x5b4a6e), x, 0.3, -2.4));
  group.add(square);
  const plazaLight = light(accent.warmWindow, 22, 20, 5);
  plazaLight.position.z = 5;
  group.add(plazaLight);

  return {
    group,
    extras: [],
    height: 14.6,
    footprint: 7,
    update: time => {
      jet.scale.y = 0.85 + Math.sin(time * 3.1) * 0.15;
    },
  };
}

/* ---------- Stories House ---------- */

function portraitTexture(initials: string | null, photo?: string) {
  const texture = canvasTexture(256, 320, ctx => {
    const gradient = ctx.createLinearGradient(0, 0, 256, 320);
    gradient.addColorStop(0, initials ? "#e31c79" : "#3b2a6e");
    gradient.addColorStop(1, initials ? "#582c83" : "#1d1a3d");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 320);
    ctx.strokeStyle = "rgba(244,240,232,.85)";
    ctx.lineWidth = 8;
    ctx.strokeRect(10, 10, 236, 300);
    ctx.fillStyle = "#f4f0e8";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `600 ${initials ? 104 : 54}px ${FONT}`;
    ctx.fillText(initials ?? "SOON", 128, 150);
    ctx.font = `500 26px ${FONT}`;
    ctx.globalAlpha = 0.8;
    ctx.fillText(initials ? "STUDENT STORY" : "NEXT STORY", 128, 262);
  });
  if (photo) {
    const image = new Image();
    image.onload = () => {
      const ctx = (texture.image as HTMLCanvasElement).getContext("2d")!;
      const scale = Math.max(220 / image.width, 230 / image.height);
      ctx.save();
      ctx.beginPath();
      ctx.rect(18, 18, 220, 230);
      ctx.clip();
      ctx.drawImage(image, 128 - (image.width * scale) / 2, 18, image.width * scale, image.height * scale);
      ctx.restore();
      texture.needsUpdate = true;
    };
    image.src = photo;
  }
  return texture;
}

function buildStories(): Omit<Building, "id"> {
  const group = new THREE.Group();
  group.add(mesh(new THREE.CylinderGeometry(3.5, 3.8, 3.8, 10), solid(0x46204e), 0, 1.9, 0));
  const dome = mesh(new THREE.SphereGeometry(3.7, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), solid(0xa3367a, { emissive: new THREE.Color(brand.plum), emissiveIntensity: 0.35, roughness: 0.4 }), 0, 3.8, 0);
  group.add(dome);
  group.add(mesh(new THREE.TorusGeometry(3.72, 0.07, 6, 40), neon(brand.pink, 2), 0, 3.82, 0).rotateX(Math.PI / 2));

  // Lit doorway facing the hub.
  group.add(mesh(new THREE.BoxGeometry(1.7, 2.5, 0.5), neon(accent.warmWindow, 1.35), 0, 1.25, 3.45));
  group.add(mesh(new THREE.TorusGeometry(0.85, 0.12, 6, 16, Math.PI), neon(brand.pink, 2), 0, 2.5, 3.55));

  // Portrait frames around the facade.
  const frames3d: Array<[number, string | null, string?]> = [[-0.75, "JS", "/world/students/jash-sojitra.jpg"], [0.75, null], [Math.PI, null], [-2, null], [2, null]];
  for (const [angle, initials, photo] of frames3d) {
    const frame = mesh(new THREE.PlaneGeometry(1.25, 1.56), new THREE.MeshBasicMaterial({ map: portraitTexture(initials, photo), toneMapped: false }));
    frame.position.set(Math.sin(angle) * 3.78, 2.05, Math.cos(angle) * 3.78);
    frame.rotation.y = angle;
    group.add(frame);
  }

  // Floating speech-bubble sculpture.
  const bubble = new THREE.Group();
  bubble.position.y = 7.1;
  const quote = canvasTexture(512, 256, ctx => {
    ctx.fillStyle = "#e31c79";
    ctx.fillRect(0, 0, 512, 256);
    ctx.fillStyle = "#fff4fa";
    ctx.font = `700 210px Georgia, serif`;
    ctx.textAlign = "center";
    ctx.fillText("“ ”", 256, 230);
  });
  bubble.add(mesh(new RoundedBoxGeometry(3.4, 1.7, 0.55, 3, 0.4), [solid(brand.pink, { emissive: new THREE.Color(brand.plum), emissiveIntensity: 0.5, roughness: 0.35 })]));
  const face = mesh(new THREE.PlaneGeometry(3.0, 1.5), new THREE.MeshBasicMaterial({ map: quote }), 0, 0, 0.29);
  const back = face.clone();
  back.position.z = -0.29;
  back.rotation.y = Math.PI;
  const tail = mesh(new THREE.ConeGeometry(0.42, 0.9, 4), solid(brand.pink, { emissive: new THREE.Color(brand.plum), emissiveIntensity: 0.5, roughness: 0.35 }), -0.9, -1.1, 0);
  tail.rotation.z = Math.PI + 0.35;
  bubble.add(face, back, tail);
  group.add(bubble);
  for (const [x, z] of [[-4.6, 2.6], [4.6, 2.6], [-4.8, -2.4], [4.8, -2.4]]) group.add(lamp(x, z));
  group.add(light(brand.pink, 45, 22, 2.6));

  return {
    group,
    extras: [],
    height: 9.2,
    footprint: 4.6,
    update: time => {
      bubble.position.y = 7.1 + Math.sin(time * 1.1) * 0.25;
      bubble.rotation.y = Math.sin(time * 0.4) * 0.5;
    },
  };
}

/* ---------- Showcase Lab ---------- */

function holoTexture(title: string, subtitle: string) {
  return canvasTexture(512, 320, ctx => {
    ctx.fillStyle = "rgba(10,30,48,.55)";
    ctx.fillRect(0, 0, 512, 320);
    ctx.strokeStyle = "#8ef0d4";
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, 500, 308);
    ctx.fillStyle = "#8ef0d4";
    ctx.font = `500 26px ${FONT}`;
    ctx.fillText(subtitle.toUpperCase(), 32, 60);
    ctx.fillStyle = "#f4f0e8";
    ctx.font = `700 ${title.length > 9 ? 64 : 84}px ${FONT}`;
    ctx.fillText(title, 30, 190);
    ctx.fillStyle = "rgba(142,240,212,.5)";
    for (let i = 0; i < 5; i++) ctx.fillRect(32, 236 + i * 14, 120 + ((i * 73) % 260), 5);
  });
}

function buildShowcase(): Omit<Building, "id"> {
  const group = new THREE.Group();
  group.add(mesh(new THREE.CylinderGeometry(4.7, 4.9, 0.6, 24), solid(0x1d2244), 0, 0.3, 0));
  const domeGeometry = new THREE.SphereGeometry(4.3, 12, 7, 0, Math.PI * 2, 0, Math.PI / 2);
  const dome = mesh(domeGeometry, new THREE.MeshStandardMaterial({ color: 0x123a55, emissive: new THREE.Color(0x0c2e44), emissiveIntensity: 0.7, roughness: 0.15, metalness: 0.6, transparent: true, opacity: 0.88, flatShading: true }), 0, 0.6, 0);
  const lattice = edges(domeGeometry, accent.ion, 0.75);
  lattice.position.y = 0.6;
  group.add(dome, lattice);
  group.add(mesh(new THREE.BoxGeometry(1.8, 2.4, 1), neon(accent.ion, 0.8), 0, 1.6, 3.85));

  // Headset sculpture on the roof.
  const headset = new THREE.Group();
  headset.position.y = 6.1;
  headset.add(mesh(new RoundedBoxGeometry(3, 1.4, 1.4, 3, 0.45), solid(0x3a3a5e, { roughness: 0.3, metalness: 0.4 })));
  headset.add(mesh(new RoundedBoxGeometry(2.7, 0.9, 0.2, 2, 0.12), glass(0x1a0b24, brand.pink, 0.9), 0, 0.02, 0.68));
  headset.add(mesh(new THREE.BoxGeometry(2.4, 0.06, 0.05), neon(brand.pink, 2.2), 0, -0.36, 0.8));
  const strap = mesh(new THREE.TorusGeometry(1.15, 0.12, 6, 24, Math.PI), solid(0x2c2c44), 0, 0, -0.4);
  strap.rotation.set(Math.PI / 2, 0, 0);
  headset.add(strap);
  group.add(headset);

  // Orbiting holo exhibits.
  const orbit = new THREE.Group();
  orbit.position.y = 3.6;
  const exhibits: Array<[string, string]> = [["SYNC", "Exhibit 01"], ["Canon DNA", "Exhibit 02"], ["Nexus", "Exhibit 03"], ["Soon", "Exhibit 04"]];
  exhibits.forEach(([title, subtitle], index) => {
    const angle = (index / exhibits.length) * Math.PI * 2;
    // Two back-to-back faces so the text never reads mirrored.
    const material = new THREE.MeshBasicMaterial({ map: holoTexture(title, subtitle), transparent: true, toneMapped: false, depthWrite: false });
    const panel = new THREE.Group();
    const face = mesh(new THREE.PlaneGeometry(2.8, 1.75), material);
    const back = mesh(new THREE.PlaneGeometry(2.8, 1.75), material);
    back.rotation.y = Math.PI;
    panel.add(face, back);
    panel.position.set(Math.sin(angle) * 6.6, (index % 2) * 0.6, Math.cos(angle) * 6.6);
    panel.rotation.y = angle;
    orbit.add(panel);
  });
  group.add(orbit);
  group.add(light(accent.ion, 45, 22, 4));

  return {
    group,
    extras: [],
    height: 8.6,
    footprint: 4.9,
    update: time => {
      orbit.rotation.y = time * 0.22;
      headset.rotation.y = Math.sin(time * 0.5) * 0.6;
      headset.position.y = 6.1 + Math.sin(time * 0.9) * 0.15;
    },
  };
}

/* ---------- Industry Dock ---------- */

function buildDock(): Omit<Building, "id"> {
  const group = new THREE.Group();
  // Warehouse with a gabled roof.
  group.add(mesh(new THREE.BoxGeometry(6.4, 3.2, 4.4), solid(brand.coldPurple), 0, 1.6, -0.6));
  const gable = new THREE.Shape([new THREE.Vector2(-2.4, 0), new THREE.Vector2(2.4, 0), new THREE.Vector2(0, 1.7)]);
  const roofGeometry = new THREE.ExtrudeGeometry(gable, { depth: 6.8, bevelEnabled: false });
  roofGeometry.translate(0, 0, -3.4);
  const roof = mesh(roofGeometry, solid(0x2b2b3f), 0, 3.2, -0.6);
  roof.rotation.y = Math.PI / 2;
  group.add(roof);
  const sign = canvasTexture(512, 128, ctx => {
    ctx.fillStyle = "#14112b";
    ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = "#e31c79";
    ctx.fillRect(0, 118, 512, 10);
    ctx.fillStyle = "#f4f0e8";
    ctx.font = `700 58px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("WORK WITH US", 256, 62);
  });
  group.add(mesh(new THREE.PlaneGeometry(4.2, 1.05), new THREE.MeshBasicMaterial({ map: sign }), 0, 2.65, 1.62));
  group.add(mesh(new THREE.BoxGeometry(2.6, 1.9, 0.2), neon(brand.pink, 1.1), 0, 0.95, 1.65));
  group.add(edges(new THREE.BoxGeometry(6.4, 3.2, 4.4), brand.pink, 0.5).translateY(1.6).translateZ(-0.6));

  // Containers.
  const containerColors = [brand.pink, brand.darkBlue, brand.warmPurple, brand.plum, 0x2e6a7a];
  containerColors.forEach((color, i) => {
    const c = mesh(new THREE.BoxGeometry(2.4, 1.1, 1.1), solid(color, { roughness: 0.5 }), 4.6 + (i % 2) * 0.2, 0.55 + Math.floor(i / 2) * 1.1, 1.4 - (i % 2) * 1.3);
    group.add(c);
  });

  // Crane.
  const crane = new THREE.Group();
  crane.position.set(-4.6, 0, -1.5);
  crane.add(mesh(new THREE.BoxGeometry(0.5, 7, 0.5), solid(0xe0b14a), 0, 3.5, 0));
  const arm = new THREE.Group();
  arm.position.y = 7;
  arm.add(mesh(new THREE.BoxGeometry(0.4, 0.4, 7), solid(0xe0b14a), 0, 0, -2));
  const beacon = mesh(new THREE.SphereGeometry(0.18, 8, 6), neon(0xff3355, 2.5), 0, 0.35, -5.4);
  arm.add(beacon);
  crane.add(arm);
  group.add(crane);

  // Pier into the bay (behind the warehouse).
  // The planet curves away, so the pier tilts down to meet the water.
  const pier = new THREE.Group();
  pier.position.set(1.5, 0.05, -2.6);
  pier.rotation.x = 0.17;
  pier.add(mesh(new THREE.BoxGeometry(2.2, 0.3, 7), solid(0x4b3a5a), 0, 0, -3.5));
  for (let i = 0; i < 4; i++) for (const x of [-1, 1]) pier.add(mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.4, 5), solid(0x2a2236), x, -1.1, -1 - i * 1.8));
  group.add(pier);

  // Lighthouse at the end of the pier.
  const lighthouse = new THREE.Group();
  lighthouse.position.set(1.5, -1.25, -9.4);
  for (let i = 0; i < 4; i++) {
    const r0 = 0.9 - i * 0.12;
    lighthouse.add(mesh(new THREE.CylinderGeometry(r0 - 0.12, r0, 1.3, 10), solid(i % 2 ? 0xf4f0e8 : brand.pink), 0, 0.65 + i * 1.3, 0));
  }
  lighthouse.add(mesh(new THREE.SphereGeometry(0.42, 10, 8), neon(accent.warmWindow, 2.4), 0, 5.6, 0));
  const beam = mesh(new THREE.ConeGeometry(1.2, 9, 16, 1, true), new THREE.MeshBasicMaterial({ color: accent.warmWindow, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  beam.rotation.z = Math.PI / 2;
  beam.position.x = 4.5;
  const beamPivot = new THREE.Group();
  beamPivot.position.y = 5.6;
  beamPivot.add(beam);
  lighthouse.add(beamPivot);
  group.add(lighthouse);
  group.add(light(brand.pink, 35, 20, 4));

  // A little ferry that loops around the bay (world space).
  const ferry = new THREE.Group();
  ferry.add(mesh(new THREE.BoxGeometry(1.4, 0.6, 3.2), solid(0xf4f0e8), 0, 0.2, 0));
  ferry.add(mesh(new THREE.BoxGeometry(1.1, 0.7, 1.4), solid(brand.darkBlue, { emissive: new THREE.Color(0x335dff), emissiveIntensity: 0.5 }), 0, 0.85, -0.2));
  ferry.add(mesh(new THREE.SphereGeometry(0.12, 6, 4), neon(brand.pink, 2.5), 0, 1.35, -0.2));
  const ferryTangent = new THREE.Vector3();
  const ferryNormal = new THREE.Vector3();
  const bayAxisA = new THREE.Vector3().crossVectors(bayCentre, new THREE.Vector3(0, 1, 0)).normalize();
  const bayAxisB = new THREE.Vector3().crossVectors(bayCentre, bayAxisA).normalize();

  return {
    group,
    extras: [ferry],
    height: 8,
    footprint: 4.6,
    update: time => {
      beamPivot.rotation.y = time * 1.4;
      arm.rotation.y = Math.sin(time * 0.35) * 0.8;
      beacon.visible = Math.sin(time * 5) > 0;
      const a = time * 0.16;
      ferryTangent.copy(bayAxisA).multiplyScalar(Math.cos(a)).addScaledVector(bayAxisB, Math.sin(a));
      stepAlong(bayCentre, ferryTangent, 0.08, ferryNormal);
      const heading = bayAxisA.clone().multiplyScalar(-Math.sin(a)).addScaledVector(bayAxisB, Math.cos(a));
      placeOnSurface(ferry, ferryNormal, heading, 0);
      ferry.position.copy(ferryNormal).multiplyScalar(WATER_RADIUS + 0.1 + Math.sin(time * 2) * 0.05);
    },
  };
}

/* ---------- Launchpad ---------- */

function buildLaunchpad(): Omit<Building, "id"> {
  const group = new THREE.Group();
  group.add(mesh(new THREE.CylinderGeometry(3.5, 3.9, 0.5, 24), solid(0x1c1838), 0, 0.25, 0));
  group.add(mesh(new THREE.TorusGeometry(3.1, 0.08, 6, 48), neon(brand.pink, 2.2), 0, 0.52, 0).rotateX(Math.PI / 2));
  group.add(mesh(new THREE.TorusGeometry(2.2, 0.05, 6, 48), neon(brand.warmPurple, 2), 0, 0.52, 0).rotateX(Math.PI / 2));
  const beamMaterial = new THREE.MeshBasicMaterial({ color: brand.pink, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  group.add(mesh(new THREE.CylinderGeometry(1.1, 1.7, 15, 24, 1, true), beamMaterial, 0, 8, 0));

  const rings = Array.from({ length: 3 }, () => {
    const ring = mesh(new THREE.TorusGeometry(1.6, 0.06, 6, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color(brand.pink).multiplyScalar(2), transparent: true, toneMapped: false, depthWrite: false }));
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
    return ring;
  });

  // Paper plane circling the beam.
  const plane = new THREE.Group();
  const planeGeometry = new THREE.BufferGeometry();
  planeGeometry.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0.9, -0.6, 0, -0.6, 0, 0.12, -0.4, 0, 0, 0.9, 0, 0.12, -0.4, 0.6, 0, -0.6], 3));
  planeGeometry.computeVertexNormals();
  plane.add(mesh(planeGeometry, new THREE.MeshBasicMaterial({ color: new THREE.Color(accent.bone).multiplyScalar(1.5), side: THREE.DoubleSide, toneMapped: false })));
  group.add(plane);

  // "Scan to join" tablet facing visitors.
  // The real, scannable QR code (generated by scripts/generate-world-qr.ts).
  const tablet = canvasTexture(256, 384, ctx => {
    ctx.fillStyle = "#14112b";
    ctx.fillRect(0, 0, 256, 384);
    ctx.strokeStyle = "#e31c79";
    ctx.lineWidth = 8;
    ctx.strokeRect(8, 8, 240, 368);
    ctx.fillStyle = "#f4f0e8";
    ctx.textAlign = "center";
    ctx.font = `600 30px ${FONT}`;
    ctx.fillText("SCAN TO JOIN", 128, 330);
  });
  const qrImage = new Image();
  qrImage.onload = () => {
    const ctx = (tablet.image as HTMLCanvasElement).getContext("2d")!;
    ctx.drawImage(qrImage, 38, 38, 180, 180);
    tablet.needsUpdate = true;
  };
  qrImage.src = "/world/join-qr.svg";
  const stand = new THREE.Group();
  stand.position.set(-3.1, 0, 3.6);
  stand.rotation.y = -0.55;
  stand.add(mesh(new THREE.BoxGeometry(1.5, 2.2, 0.18), solid(0x221d3e), 0, 1.4, 0));
  stand.add(mesh(new THREE.PlaneGeometry(1.32, 1.98), new THREE.MeshBasicMaterial({ map: tablet, toneMapped: false }), 0, 1.4, 0.1));
  group.add(stand);
  group.add(light(brand.warmPurple, 40, 20, 3));

  return {
    group,
    extras: [],
    height: 8,
    footprint: 3.9,
    update: time => {
      rings.forEach((ring, i) => {
        const t = (time * 0.35 + i / rings.length) % 1;
        ring.position.y = 0.6 + t * 12;
        ring.scale.setScalar(1 + t * 0.6);
        (ring.material as THREE.MeshBasicMaterial).opacity = (1 - t) * 0.9;
      });
      const a = time * 0.7;
      plane.position.set(Math.cos(a) * 3.2, 5 + Math.sin(time * 1.3) * 1.2, Math.sin(a) * 3.2);
      plane.rotation.set(0, -a, Math.sin(time * 1.3) * 0.3);
    },
  };
}

const builders: Record<PlaceId, () => Omit<Building, "id">> = {
  hub: buildHub,
  queen: buildQueen,
  stories: buildStories,
  showcase: buildShowcase,
  dock: buildDock,
  launchpad: buildLaunchpad,
};

export function buildBuildings(): Building[] {
  return (Object.keys(builders) as PlaceId[]).map(id => {
    const built = builders[id]();
    const frame = frames[id];
    placeOnSurface(built.group, frame.n, frame.front);
    built.group.name = `place:${id}`;
    built.group.traverse(object => {
      object.userData.placeId = id;
      const mesh = object as THREE.Mesh;
      if (mesh.isMesh) {
        const basic = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) instanceof THREE.MeshBasicMaterial;
        mesh.castShadow = !basic;
        mesh.receiveShadow = !basic;
      }
    });
    return { id, ...built };
  });
}
