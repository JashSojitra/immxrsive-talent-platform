import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

import type { PlaceId } from "../world-content";
import { buildBuildings, type Building } from "./buildings";
import { clamp, damp } from "./noise";
import { brand } from "./palette";
import { buildSky } from "./sky";
import { createSpark } from "./spark";
import { buildAtmosphere, buildPaths, buildPlanet, buildScatter, buildWater, doorstep, frames, PLANET_RADIUS, stepAlong, surfaceRadius, WATER_RADIUS } from "./terrain";

export type WorldMode = "intro" | "explore" | "map" | "focus";
export type FocusLayout = "side" | "bottom";

export type WorldEvents = {
  onNear?: (id: PlaceId | null) => void;
  onArrive?: (id: PlaceId | null) => void;
  onInteract?: (id: PlaceId) => void;
  onMode?: (mode: WorldMode) => void;
  /** Any direct user control (keys, joystick, click). Used to stop the guided tour. */
  onUserInput?: () => void;
};

export type WorldHandle = {
  enter: () => void;
  flyTo: (id: PlaceId) => void;
  focus: (id: PlaceId | null, layout?: FocusLayout) => void;
  setMap: (on: boolean) => void;
  setReducedMotion: (on: boolean) => void;
  setLabel: (id: PlaceId, element: HTMLElement | null) => void;
  /** Analog input from the on-screen joystick, each in [-1, 1]. */
  setStick: (forward: number, turn: number) => void;
  hop: () => void;
  getMode: () => WorldMode;
  dispose: () => void;
};

type Pose = { position: THREE.Vector3; target: THREE.Vector3; up: THREE.Vector3 };
const pose = (): Pose => ({ position: new THREE.Vector3(), target: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0) });
const copyPose = (to: Pose, from: Pose) => { to.position.copy(from.position); to.target.copy(from.target); to.up.copy(from.up); return to; };
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const WALK_SPEED = 9;
const BOOST_SPEED = 15;
const FLY_SPEED = 26;
const TURN_RATE = 2.4;
const HOVER = 1.35;
const CRUISE = 10;
/** Where Spark stops in front of each place (world units from the centre). */
const DOOR_DISTANCE: Record<PlaceId, number> = { hub: 10, queen: 13.5, stories: 9, showcase: 9.5, dock: 9, launchpad: 9 };

/** Tangent at `n` pointing towards `target` (both unit vectors). */
function tangentTowards(n: THREE.Vector3, target: THREE.Vector3, out = new THREE.Vector3()) {
  out.copy(target).addScaledVector(n, -n.dot(target));
  if (out.lengthSq() < 1e-10) out.set(1, 0, 0).addScaledVector(n, -n.x);
  return out.normalize();
}

export function createWorld(canvas: HTMLCanvasElement, options: { reducedMotion: boolean; fixedQuality?: boolean }, events: WorldEvents): WorldHandle {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance", alpha: false });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  let pixelRatio = Math.min(window.devicePixelRatio || 1, 1.75);
  renderer.setPixelRatio(pixelRatio);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05051a);
  scene.fog = new THREE.Fog(0x080724, 70, 330);
  const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 1400);

  scene.add(new THREE.HemisphereLight(0x9a8cff, 0x1a1240, 1.7));
  const moonLight = new THREE.DirectionalLight(0xd9ccff, 2.2);
  moonLight.position.set(-180, 120, -220);
  const rimLight = new THREE.DirectionalLight(brand.pink, 1.1);
  rimLight.position.set(160, -40, 200);
  scene.add(moonLight, rimLight);

  const planet = buildPlanet();
  scene.add(planet, buildWater(), buildAtmosphere());
  const { group: paths, arcs } = buildPaths();
  scene.add(paths, buildScatter(arcs));
  const buildings = buildBuildings();
  for (const building of buildings) scene.add(building.group, ...building.extras);
  const buildingById = new Map<PlaceId, Building>(buildings.map(b => [b.id, b]));
  const sky = buildSky();
  scene.add(sky.group);

  const spark = createSpark();
  scene.add(spark.root, spark.trail, spark.shadow);

  // Post-processing: bloom makes the neon and Spark glow.
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.62, 0.5, 0.86);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  let bloomEnabled = true;

  /* ---------- state ---------- */
  let reducedMotion = options.reducedMotion;
  let mode: WorldMode = "intro";
  let focusId: PlaceId | null = null;
  let focusLayout: FocusLayout = "side";
  const hub = frames.hub;
  const n = doorstep("hub", 10);
  const f = tangentTowards(n, hub.n);
  let speed = 0;
  let altitude = HOVER;
  let turnInput = 0;
  type Autopilot = { target: THREE.Vector3; placeId: PlaceId | null; face: THREE.Vector3 | null; far: boolean };
  let autopilot: Autopilot | null = null;
  let facingGoal: THREE.Vector3 | null = null;
  let near: PlaceId | null = null;
  const keys = new Set<string>();
  const stick = { forward: 0, turn: 0 };
  let mapYaw = 0.6, mapPitch = 0.55;

  const current = pose();
  const fromPose = pose();
  let transition = { active: false, t: 0, duration: 1 };
  const labels = new Map<PlaceId, HTMLElement>();

  const sparkPosition = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  const tmp2 = new THREE.Vector3();

  const setMode = (next: WorldMode, duration: number) => {
    if (next === mode && next !== "focus") return;
    copyPose(fromPose, current);
    transition = { active: !reducedMotion && duration > 0, t: 0, duration };
    mode = next;
    events.onMode?.(mode);
  };

  /* ---------- camera poses ---------- */
  const desired = pose();
  const computeDesired = (time: number) => {
    const up = n;
    if (mode === "intro") {
      const a = reducedMotion ? 0.9 : 0.9 + time * 0.045;
      const elevation = 0.62;
      desired.position.set(Math.sin(a) * Math.cos(elevation), Math.sin(elevation), Math.cos(a) * Math.cos(elevation)).multiplyScalar(150);
      desired.target.set(0, 4, 0);
      desired.up.set(0, 1, 0);
    } else if (mode === "map") {
      desired.position.set(Math.sin(mapYaw) * Math.cos(mapPitch), Math.sin(mapPitch), Math.cos(mapYaw) * Math.cos(mapPitch)).multiplyScalar(128);
      desired.target.set(0, 0, 0);
      desired.up.set(0, 1, 0);
    } else if (mode === "focus" && focusId) {
      const frame = frames[focusId];
      const centre = tmp.copy(frame.n).multiplyScalar(surfaceRadius(frame.n));
      const height = buildingById.get(focusId)!.height;
      if (focusLayout === "side") {
        desired.position.copy(centre).addScaledVector(frame.front, 17).addScaledVector(frame.n, height * 0.55 + 2).addScaledVector(frame.right, 2.5);
        desired.target.copy(centre).addScaledVector(frame.n, height * 0.45).addScaledVector(frame.right, 6.5);
      } else {
        desired.position.copy(centre).addScaledVector(frame.front, 19).addScaledVector(frame.n, height * 0.5 + 3);
        desired.target.copy(centre).addScaledVector(frame.n, height * 0.18);
      }
      desired.up.copy(frame.n);
    } else {
      const flying = altitude > 4;
      const back = flying ? 13 : 9.5;
      const lift = flying ? 6.5 : 4.2;
      desired.position.copy(sparkPosition).addScaledVector(up, lift).addScaledVector(f, -back);
      desired.target.copy(sparkPosition).addScaledVector(f, 4).addScaledVector(up, 0.9);
      desired.up.copy(up);
    }
  };

  const applyCamera = (dt: number) => {
    if (transition.active) {
      transition.t = Math.min(1, transition.t + dt / transition.duration);
      const k = easeInOut(transition.t);
      // Blend in spherical terms so the camera swings around the planet instead of through it.
      const fromLen = fromPose.position.length();
      const toLen = desired.position.length();
      const fromDir = tmp.copy(fromPose.position).normalize();
      const toDir = tmp2.copy(desired.position).normalize();
      const q = new THREE.Quaternion().setFromUnitVectors(fromDir, toDir);
      const partial = new THREE.Quaternion().slerp(q, k);
      current.position.copy(fromDir).applyQuaternion(partial).multiplyScalar(THREE.MathUtils.lerp(fromLen, toLen, k));
      current.target.lerpVectors(fromPose.target, desired.target, k);
      current.up.lerpVectors(fromPose.up, desired.up, k).normalize();
      if (transition.t >= 1) transition.active = false;
    } else {
      const s = reducedMotion ? 1 : damp(mode === "explore" ? 5 : 3, dt);
      current.position.lerp(desired.position, s);
      current.target.lerp(desired.target, s);
      current.up.lerp(desired.up, s).normalize();
    }
    camera.position.copy(current.position);
    camera.up.copy(current.up);
    camera.lookAt(current.target);
  };

  /* ---------- movement ---------- */
  const rotateHeading = (angle: number) => {
    tmp.crossVectors(n, f);
    f.multiplyScalar(Math.cos(angle)).addScaledVector(tmp, Math.sin(angle)).normalize();
  };
  const orthonormalise = () => {
    f.addScaledVector(n, -f.dot(n)).normalize();
  };

  const arrive = () => {
    const done = autopilot;
    autopilot = null;
    speed = 0;
    if (done?.face) facingGoal = done.face.clone();
    events.onArrive?.(done?.placeId ?? null);
  };

  const step = (dt: number) => {
    if (mode !== "explore") { speed = 0; return; }
    const kForward = (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0) - (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0) + stick.forward;
    const kTurn = (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) - (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0) + stick.turn;
    const manual = Math.abs(kForward) > 0.05 || Math.abs(kTurn) > 0.05;
    if (manual && autopilot) autopilot = null;
    if (manual) facingGoal = null;

    let targetSpeed = 0;
    let targetAltitude = HOVER;
    if (autopilot) {
      const remaining = n.angleTo(autopilot.target) * PLANET_RADIUS;
      if (remaining < 0.35) {
        arrive();
      } else {
        const want = tangentTowards(n, autopilot.target, tmp2);
        const signed = Math.atan2(tmp.crossVectors(f, want).dot(n), f.dot(want));
        const maxTurn = 3.6 * dt;
        rotateHeading(clamp(signed, -maxTurn, maxTurn));
        turnInput = clamp(signed, -1, 1);
        const cruise = autopilot.far ? FLY_SPEED : 11;
        targetSpeed = Math.min(cruise, remaining * 2.4 + 1.5) * (Math.abs(signed) > 1.1 ? 0.25 : 1);
        if (autopilot.far && remaining > 14) targetAltitude = CRUISE;
      }
    } else {
      const boost = keys.has("ShiftLeft") || keys.has("ShiftRight");
      targetSpeed = clamp(kForward, -1, 1) * (boost ? BOOST_SPEED : WALK_SPEED);
      turnInput = clamp(kTurn, -1, 1);
      rotateHeading(turnInput * TURN_RATE * dt);
      if (facingGoal) {
        const goal = tangentTowards(n, tmp2.copy(n).add(facingGoal), tmp2);
        const signed = Math.atan2(tmp.crossVectors(f, goal).dot(n), f.dot(goal));
        rotateHeading(clamp(signed, -2 * dt, 2 * dt));
        if (Math.abs(signed) < 0.01) facingGoal = null;
      }
    }

    speed += (targetSpeed - speed) * damp(autopilot ? 3 : 7, dt);
    altitude += (targetAltitude - altitude) * damp(altitude > targetAltitude ? 1.6 : 1.2, dt);
    const radius = PLANET_RADIUS + altitude;
    const angle = (speed * dt) / radius;
    if (Math.abs(angle) > 1e-7) {
      tmp.copy(n);
      n.multiplyScalar(Math.cos(angle)).addScaledVector(f, Math.sin(angle)).normalize();
      f.multiplyScalar(Math.cos(angle)).addScaledVector(tmp, -Math.sin(angle)).normalize();
    }

    // Keep Spark out of buildings while it is near the ground.
    if (altitude < 6) {
      for (const building of buildings) {
        const frame = frames[building.id];
        const min = (building.footprint + 0.6) / PLANET_RADIUS;
        const between = n.angleTo(frame.n);
        if (between < min) {
          const away = tangentTowards(frame.n, n, tmp2);
          stepAlong(frame.n, away, min, n);
        }
      }
    }
    orthonormalise();

    // Nearest place within reach.
    let nearest: PlaceId | null = null;
    let best = Infinity;
    for (const building of buildings) {
      const distance = n.angleTo(frames[building.id].n) * PLANET_RADIUS;
      if (distance < DOOR_DISTANCE[building.id] + 3 && distance < best && altitude < 4) { best = distance; nearest = building.id; }
    }
    if (nearest !== near) { near = nearest; events.onNear?.(near); }
  };

  /* ---------- labels ---------- */
  const projected = new THREE.Vector3();
  const updateLabels = (width: number, height: number) => {
    const show = mode === "explore" || mode === "map";
    for (const [id, element] of labels) {
      const building = buildingById.get(id)!;
      const frame = frames[id];
      const anchor = tmp.copy(frame.n).multiplyScalar(surfaceRadius(frame.n) + building.height + 1.2);
      const toAnchor = tmp2.copy(anchor).sub(camera.position);
      const length = toAnchor.length();
      toAnchor.divideScalar(length);
      const b = camera.position.dot(toAnchor);
      const c = camera.position.lengthSq() - (PLANET_RADIUS + 0.5) ** 2;
      const disc = b * b - c;
      const occluded = disc > 0 && -b - Math.sqrt(disc) > 0 && -b - Math.sqrt(disc) < length - 1;
      projected.copy(anchor).project(camera);
      const onScreen = projected.z < 1 && Math.abs(projected.x) < 1.1 && Math.abs(projected.y) < 1.1;
      const visible = show && !occluded && onScreen;
      element.dataset.visible = visible ? "true" : "false";
      if (!visible) continue;
      const x = (projected.x * 0.5 + 0.5) * width;
      const y = (-projected.y * 0.5 + 0.5) * height;
      const scale = clamp(46 / length, 0.62, 1.05);
      element.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -100%) scale(${scale.toFixed(3)})`;
      element.dataset.near = id === near ? "true" : "false";
    }
  };

  /* ---------- input ---------- */
  const isTyping = (target: EventTarget | null) => target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
  const controlKeys = new Set(["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "ShiftLeft", "ShiftRight"]);
  const onKeyDown = (event: KeyboardEvent) => {
    if (isTyping(event.target) || event.metaKey || event.ctrlKey || event.altKey) return;
    if (mode === "focus" || mode === "intro") return;
    const onControl = event.target instanceof HTMLElement && event.target.closest("button, a");
    if (controlKeys.has(event.code)) {
      if (onControl && event.code.startsWith("Arrow")) return;
      keys.add(event.code);
      if (event.code.startsWith("Arrow")) event.preventDefault();
      events.onUserInput?.();
      if (mode === "map") setMode("explore", 1.6);
      return;
    }
    if (event.code === "Space" && !onControl) { event.preventDefault(); spark.hop(); events.onUserInput?.(); return; }
    if ((event.code === "KeyE" || (event.code === "Enter" && !onControl)) && near) { events.onUserInput?.(); events.onInteract?.(near); return; }
    if (event.code === "KeyM" && !onControl) { events.onUserInput?.(); handle.setMap(mode !== "map"); }
  };
  const onKeyUp = (event: KeyboardEvent) => { keys.delete(event.code); };
  const onBlur = () => keys.clear();

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let down: { x: number; y: number; id: number } | null = null;
  let dragged = false;
  const onPointerDown = (event: PointerEvent) => {
    down = { x: event.clientX, y: event.clientY, id: event.pointerId };
    dragged = false;
  };
  const onPointerMove = (event: PointerEvent) => {
    if (!down || down.id !== event.pointerId) return;
    const dx = event.clientX - down.x, dy = event.clientY - down.y;
    if (Math.hypot(dx, dy) > 6) dragged = true;
    if (dragged && mode === "map") {
      mapYaw -= event.movementX * 0.005;
      mapPitch = clamp(mapPitch + event.movementY * 0.005, -1.25, 1.25);
    }
  };
  const onPointerUp = (event: PointerEvent) => {
    if (!down || down.id !== event.pointerId) return;
    down = null;
    if (dragged || mode === "intro" || mode === "focus") return;
    const rect = canvas.getBoundingClientRect();
    pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    events.onUserInput?.();
    const hits = raycaster.intersectObjects(buildings.map(b => b.group), true);
    const placeId = hits[0]?.object.userData.placeId as PlaceId | undefined;
    if (placeId) {
      if (placeId === near && mode === "explore" && !autopilot) events.onInteract?.(placeId);
      else handle.flyTo(placeId);
      return;
    }
    const ground = raycaster.intersectObject(planet, false)[0];
    if (ground) {
      if (mode === "map") setMode("explore", 1.8);
      const target = ground.point.clone().normalize();
      autopilot = { target, placeId: null, face: null, far: n.angleTo(target) * PLANET_RADIUS > 22 };
      if (reducedMotion) { n.copy(target); orthonormalise(); arrive(); }
    }
  };

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);
  canvas.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);

  /* ---------- sizing & loop ---------- */
  let width = 1, height = 1;
  const resize = () => {
    const rect = canvas.parentElement!.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    composer.setPixelRatio(pixelRatio);
    composer.setSize(width, height);
    bloom.resolution.set(width, height);
    camera.aspect = width / height;
    camera.fov = width < 700 ? 62 : 52;
    camera.updateProjectionMatrix();
    (spark.trail.material as THREE.ShaderMaterial).uniforms.uPixel.value = pixelRatio * (height / 900);
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas.parentElement!);
  resize();

  let frame = 0;
  let last = performance.now();
  let ambientTime = 0;
  let clockTime = 0;
  let slowFrames = 0, sampled = 0;
  const groundPoint = new THREE.Vector3();

  const tick = (now: number) => {
    frame = requestAnimationFrame(tick);
    if (document.hidden) { last = now; return; }
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    clockTime += dt;
    if (!reducedMotion) ambientTime += dt;

    step(dt);
    const ground = Math.max(surfaceRadius(n), WATER_RADIUS);
    sparkPosition.copy(n).multiplyScalar(ground + altitude);
    // Orient Spark: +Y = normal, +Z = heading.
    const x = tmp.crossVectors(n, f).normalize();
    spark.root.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, n, f));
    spark.root.position.copy(sparkPosition);
    spark.animate(clockTime, dt, { speed: Math.abs(speed), turn: turnInput, dashing: altitude > 3 || Math.abs(speed) > 12, still: reducedMotion });
    spark.root.updateMatrixWorld(true);
    spark.pushTrail(spark.body.getWorldPosition(groundPoint), clamp(Math.abs(speed) / 20, 0, 1));
    spark.shadow.position.copy(n).multiplyScalar(ground + 0.06);
    spark.shadow.quaternion.copy(spark.root.quaternion).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2));
    const shadowScale = clamp(1.4 - altitude * 0.08, 0.3, 1.2);
    spark.shadow.scale.setScalar(shadowScale);

    for (const building of buildings) building.update(ambientTime, dt);
    sky.update(ambientTime);
    computeDesired(clockTime);
    applyCamera(dt);
    updateLabels(width, height);
    if (bloomEnabled) composer.render(dt); else renderer.render(scene, camera);

    // Adaptive quality: drop resolution, then bloom, if frames are consistently slow.
    sampled++;
    if (dt > 0.028) slowFrames++;
    if (sampled >= 90 && !options.fixedQuality) {
      if (slowFrames > 45) {
        if (pixelRatio > 1) { pixelRatio = Math.max(1, pixelRatio - 0.35); resize(); }
        else if (bloomEnabled) bloomEnabled = false;
      }
      sampled = 0; slowFrames = 0;
    }
  };
  computeDesired(0);
  copyPose(current, desired);
  frame = requestAnimationFrame(tick);

  const handle: WorldHandle = {
    enter: () => { if (mode === "intro") setMode("explore", 3.2); },
    flyTo: id => {
      if (mode !== "explore") setMode("explore", 2);
      const target = doorstep(id, DOOR_DISTANCE[id]);
      const face = tangentTowards(target, frames[id].n).clone();
      facingGoal = null;
      if (reducedMotion) {
        n.copy(target);
        f.copy(face);
        autopilot = { target, placeId: id, face, far: false };
        arrive();
        return;
      }
      autopilot = { target, placeId: id, face, far: n.angleTo(target) * PLANET_RADIUS > 22 };
    },
    focus: (id, layout = "side") => {
      focusLayout = layout;
      if (id) { focusId = id; setMode("focus", 1.4); }
      else if (mode === "focus") { focusId = null; setMode("explore", 1.2); }
    },
    setMap: on => {
      if (on && mode !== "map") {
        const dir = sparkPosition.clone().normalize();
        mapYaw = Math.atan2(dir.x, dir.z);
        mapPitch = clamp(Math.asin(dir.y), -1.1, 1.1);
        autopilot = null;
        setMode("map", 1.8);
      } else if (!on && mode === "map") setMode("explore", 1.8);
    },
    setReducedMotion: on => { reducedMotion = on; },
    setLabel: (id, element) => { if (element) labels.set(id, element); else labels.delete(id); },
    setStick: (forward, turn) => {
      stick.forward = forward;
      stick.turn = turn;
      if (Math.abs(forward) + Math.abs(turn) > 0.05) events.onUserInput?.();
    },
    hop: () => spark.hop(),
    getMode: () => mode,
    dispose: () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      canvas.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      scene.traverse(object => {
        const m = object as THREE.Mesh;
        m.geometry?.dispose?.();
        const materials = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
        for (const material of materials) {
          for (const value of Object.values(material)) if (value instanceof THREE.Texture) value.dispose();
          material.dispose();
        }
      });
      composer.dispose();
      renderer.dispose();
    },
  };
  return handle;
}
