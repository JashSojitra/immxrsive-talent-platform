import * as THREE from "three";

import { latLonToUnit, places, type PlaceId } from "../world-content";
import { brand, accent } from "./palette";
import { fbm, mulberry32, smoothstep } from "./noise";

export const PLANET_RADIUS = 40;
export const WATER_RADIUS = PLANET_RADIUS + 0.05;
/** Height of every flattened plaza above the base radius. */
export const PLAZA_LIFT = 0.55;

export type PlaceFrame = {
  id: PlaceId;
  /** Unit normal at the place centre. */
  n: THREE.Vector3;
  /** Tangent the building faces (towards the hub / north pole). */
  front: THREE.Vector3;
  right: THREE.Vector3;
  /** Angular radius (radians) that is flattened for the building and its plaza. */
  plaza: number;
};

const plazaSize: Record<PlaceId, number> = { hub: 0.2, queen: 0.26, stories: 0.2, showcase: 0.2, dock: 0.2, launchpad: 0.18 };

function frameFor(id: PlaceId, lat: number, lon: number): PlaceFrame {
  const n = new THREE.Vector3(...latLonToUnit(lat, lon)).normalize();
  let front: THREE.Vector3;
  if (lat > 89) {
    // The hub sits on the pole; it faces the Queen St plaza (longitude 0).
    front = new THREE.Vector3(0, 0, 1);
  } else {
    const north = new THREE.Vector3(0, 1, 0);
    front = north.sub(n.clone().multiplyScalar(n.y)).normalize();
  }
  const right = new THREE.Vector3().crossVectors(n, front).normalize();
  return { id, n, front, right, plaza: plazaSize[id] };
}

export const frames: Record<PlaceId, PlaceFrame> = Object.fromEntries(
  places.map(place => [place.id, frameFor(place.id, place.lat, place.lon)]),
) as Record<PlaceId, PlaceFrame>;

/** Rotate unit vector `n` along tangent `t` by `angle` radians (great-circle step). */
export function stepAlong(n: THREE.Vector3, t: THREE.Vector3, angle: number, out = new THREE.Vector3()) {
  return out.copy(n).multiplyScalar(Math.cos(angle)).addScaledVector(t, Math.sin(angle)).normalize();
}

/** The bay sits behind (south of) the Industry Dock. */
export const bayCentre = (() => {
  const dock = frames.dock;
  return stepAlong(dock.n, dock.front.clone().negate(), 0.36);
})();
const BAY_RADIUS = 0.2;

/** Radius of the ground at direction `n`. Shared by the mesh and everything placed on it. */
export function surfaceRadius(n: THREE.Vector3) {
  const base = fbm(n.x * 2.4 + 11, n.y * 2.4 + 3, n.z * 2.4 + 7);
  const detail = fbm(n.x * 7 + 1, n.y * 7 + 5, n.z * 7 + 9, 2);
  let h = 0.35 + (base - 0.5) * 2.4 + (detail - 0.5) * 0.5;
  h = Math.max(0.12, h + 0.25);
  for (const frame of Object.values(frames)) {
    const angle = n.angleTo(frame.n);
    const w = smoothstep(frame.plaza * 0.7, frame.plaza * 1.35, angle);
    h = PLAZA_LIFT + (h - PLAZA_LIFT) * w;
  }
  const bayAngle = n.angleTo(bayCentre);
  h -= (1 - smoothstep(BAY_RADIUS * 0.45, BAY_RADIUS, bayAngle)) * 2.2;
  return PLANET_RADIUS + h;
}

export function surfacePoint(n: THREE.Vector3, lift = 0, out = new THREE.Vector3()) {
  return out.copy(n).multiplyScalar(surfaceRadius(n) + lift);
}

/** Orient an object so its local +Y is the surface normal and +Z is `front`. */
export function placeOnSurface(object: THREE.Object3D, n: THREE.Vector3, front: THREE.Vector3, lift = 0) {
  const up = n.clone().normalize();
  const z = front.clone().sub(up.clone().multiplyScalar(front.dot(up))).normalize();
  const x = new THREE.Vector3().crossVectors(up, z).normalize();
  object.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, up, z));
  surfacePoint(up, lift, object.position);
}

/** Point `distance` world units in front of a place (where visitors stand). */
export function doorstep(id: PlaceId, distance = 7.5) {
  const frame = frames[id];
  return stepAlong(frame.n, frame.front, distance / PLANET_RADIUS);
}

export function buildPlanet() {
  const geometry = new THREE.IcosahedronGeometry(1, 40);
  const position = geometry.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(position.count * 3);
  const n = new THREE.Vector3();
  const low = new THREE.Color(0x2b2670);
  const high = new THREE.Color(0x4b2f94);
  const ridge = new THREE.Color(brand.coldPurple);
  const shore = new THREE.Color(0x5d4a9a);
  const plaza = new THREE.Color(0x3a3170);
  const tint = new THREE.Color();
  for (let i = 0; i < position.count; i++) {
    n.fromBufferAttribute(position, i).normalize();
    const r = surfaceRadius(n);
    position.setXYZ(i, n.x * r, n.y * r, n.z * r);
    const h = r - PLANET_RADIUS;
    const variation = fbm(n.x * 9, n.y * 9, n.z * 9, 2);
    tint.copy(low).lerp(high, smoothstep(0.2, 1.6, h) * 0.8 + variation * 0.25);
    if (h > 1.3) tint.lerp(ridge, smoothstep(1.3, 2.2, h) * 0.6);
    if (h < 0.3) tint.lerp(shore, smoothstep(0.3, 0.05, h) * 0.7);
    for (const frame of Object.values(frames)) {
      const w = 1 - smoothstep(frame.plaza * 0.55, frame.plaza * 0.9, n.angleTo(frame.n));
      if (w > 0) tint.lerp(plaza, w * 0.85);
    }
    colors.set([tint.r, tint.g, tint.b], i * 3);
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.88, metalness: 0.02, emissive: new THREE.Color(0x120c30), emissiveIntensity: 1 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "planet";
  mesh.receiveShadow = false;
  return mesh;
}

export function buildWater() {
  const material = new THREE.MeshStandardMaterial({
    color: 0x0b2a78,
    emissive: new THREE.Color(brand.darkBlue),
    emissiveIntensity: 0.9,
    roughness: 0.18,
    metalness: 0.3,
    transparent: true,
    opacity: 0.94,
    flatShading: true,
  });
  const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(WATER_RADIUS, 20), material);
  mesh.name = "water";
  return mesh;
}

export function buildAtmosphere() {
  const material = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(0x4a3bd0) }, uRim: { value: new THREE.Color(brand.pink) } },
    vertexShader: /* glsl */ `
      varying vec3 vNormal; varying vec3 vView;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vNormal = normalize(mat3(modelMatrix) * normal);
        vView = normalize(cameraPosition - world.xyz);
        gl_Position = projectionMatrix * viewMatrix * world;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform vec3 uRim;
      varying vec3 vNormal; varying vec3 vView;
      void main() {
        float f = pow(1.0 - abs(dot(vNormal, vView)), 4.0);
        gl_FragColor = vec4(mix(uColor, uRim, f) * f * 0.75, f * 0.6);
      }`,
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(PLANET_RADIUS * 1.12, 64, 48), material);
  mesh.name = "atmosphere";
  return mesh;
}

/** Glowing ribbon paths from the hub to every building's doorstep. */
export function buildPaths() {
  const group = new THREE.Group();
  group.name = "paths";
  const material = new THREE.MeshBasicMaterial({ color: brand.pink, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const start = doorstep("hub", 4);
  const arcs: Array<[THREE.Vector3, THREE.Vector3]> = [];
  for (const place of places) {
    if (place.id === "hub") continue;
    const end = doorstep(place.id, 4.5);
    arcs.push([start, end]);
    const steps = 90;
    const vertices: number[] = [];
    const indices: number[] = [];
    const point = new THREE.Vector3();
    const axis = new THREE.Vector3().crossVectors(start, end).normalize();
    const total = start.angleTo(end);
    for (let i = 0; i <= steps; i++) {
      const dir = start.clone().applyAxisAngle(axis, (total * i) / steps);
      const width = 0.2 + 0.05 * Math.sin(i * 0.9);
      surfacePoint(dir, 0.07, point);
      const a = point.clone().addScaledVector(axis, width);
      const b = point.clone().addScaledVector(axis, -width);
      vertices.push(a.x, a.y, a.z, b.x, b.y, b.z);
      if (i < steps) {
        const k = i * 2;
        indices.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    group.add(new THREE.Mesh(geometry, material));
  }
  return { group, arcs };
}

function angleToArc(p: THREE.Vector3, a: THREE.Vector3, b: THREE.Vector3) {
  const m = new THREE.Vector3().crossVectors(a, b).normalize();
  const within = new THREE.Vector3().crossVectors(a, p).dot(m) > 0 && new THREE.Vector3().crossVectors(p, b).dot(m) > 0;
  if (within) return Math.asin(Math.min(1, Math.abs(p.dot(m))));
  return Math.min(p.angleTo(a), p.angleTo(b));
}

/** Crystal trees, rocks and glow-buds scattered away from plazas, paths and the bay. */
export function buildScatter(arcs: Array<[THREE.Vector3, THREE.Vector3]>) {
  const rng = mulberry32(2026);
  const group = new THREE.Group();
  group.name = "scatter";
  const isClear = (n: THREE.Vector3, margin: number) => {
    for (const frame of Object.values(frames)) if (n.angleTo(frame.n) < frame.plaza * 1.15 + margin) return false;
    if (n.angleTo(bayCentre) < BAY_RADIUS + 0.03) return false;
    for (const [a, b] of arcs) if (angleToArc(n, a, b) < 1.5 / PLANET_RADIUS) return false;
    return surfaceRadius(n) > WATER_RADIUS + 0.12;
  };
  const randomDir = () => new THREE.Vector3(rng() * 2 - 1, rng() * 2 - 1, rng() * 2 - 1).normalize();
  const dummy = new THREE.Object3D();
  const tangent = new THREE.Vector3();

  const scatter = (mesh: THREE.InstancedMesh, count: number, margin: number, scale: () => THREE.Vector3, sink: number, tint?: (i: number) => THREE.Color) => {
    let placed = 0, attempts = 0;
    while (placed < count && attempts < count * 40) {
      attempts++;
      const n = randomDir();
      if (!isClear(n, margin)) continue;
      tangent.set(rng() - 0.5, rng() - 0.5, rng() - 0.5).cross(n).normalize();
      placeOnSurface(dummy, n, tangent, -sink);
      dummy.scale.copy(scale());
      dummy.updateMatrix();
      mesh.setMatrixAt(placed, dummy.matrix);
      if (tint) mesh.setColorAt(placed, tint(placed));
      placed++;
    }
    mesh.count = placed;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    group.add(mesh);
  };

  // Crystal trees: tall octahedra with a brighter crystal on top.
  const treeGeometry = new THREE.OctahedronGeometry(0.6, 0);
  treeGeometry.scale(1, 2.6, 1);
  treeGeometry.translate(0, 1.4, 0);
  const treeColors = [new THREE.Color(brand.coldPurple), new THREE.Color(0x3b2f8f), new THREE.Color(brand.warmPurple), new THREE.Color(0x1f3d8f)];
  const trees = new THREE.InstancedMesh(treeGeometry, new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.35, metalness: 0.2, emissive: new THREE.Color(0x12082a), emissiveIntensity: 1 }), 320);
  scatter(trees, 320, 0.02, () => { const s = 0.7 + rng() * 0.9; return new THREE.Vector3(s, s * (0.8 + rng() * 0.5), s); }, 0.1, () => treeColors[Math.floor(rng() * treeColors.length)].clone());

  // Rocks.
  const rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.5, 0), new THREE.MeshStandardMaterial({ color: 0x2d2a4a, flatShading: true, roughness: 0.9 }), 140);
  scatter(rocks, 140, 0.0, () => { const s = 0.4 + rng() * 1.1; return new THREE.Vector3(s, s * 0.6, s); }, 0.15);

  // Glow buds: tiny emissive pods that bloom softly at night.
  const budColors = [new THREE.Color(brand.pink), new THREE.Color(accent.ion), new THREE.Color(0xff6fb3)];
  const buds = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.16, 0), new THREE.MeshBasicMaterial({ toneMapped: false }), 260);
  scatter(buds, 260, -0.04, () => new THREE.Vector3(1, 1, 1).multiplyScalar(0.6 + rng() * 0.8), -0.15, () => budColors[Math.floor(rng() * budColors.length)].clone().multiplyScalar(1.6));

  return group;
}
