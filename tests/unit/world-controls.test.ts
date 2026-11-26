// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import * as THREE from "three";
import { createWorld, type WorldHandle } from "@/components/world/engine/world";
import { doorstep, frames } from "@/components/world/engine/terrain";
import { places } from "@/components/world/world-content";

// Keep real movement, camera geometry and Spark animation; replace only GPU rendering and scenery.
vi.mock("three", async importOriginal => {
  const actual = await importOriginal<typeof import("three")>();
  return { ...actual, WebGLRenderer: class {
    shadowMap = {};
    setPixelRatio() {} setSize() {} dispose() {}
  } };
});
vi.mock("three/addons/postprocessing/EffectComposer.js", () => ({ EffectComposer: class {
  addPass() {} setPixelRatio() {} setSize() {} render() {} dispose() {}
} }));
vi.mock("three/addons/postprocessing/RenderPass.js", () => ({ RenderPass: class {} }));
vi.mock("three/addons/postprocessing/OutputPass.js", () => ({ OutputPass: class {} }));
vi.mock("three/addons/postprocessing/UnrealBloomPass.js", () => ({ UnrealBloomPass: class {
  resolution = new THREE.Vector2();
} }));
vi.mock("three/addons/postprocessing/ShaderPass.js", () => ({ ShaderPass: class {
  uniforms = { uRes: { value: new THREE.Vector2() }, uTime: { value: 0 } };
} }));
vi.mock("@/components/world/engine/terrain", async importOriginal => ({
  ...await importOriginal<typeof import("@/components/world/engine/terrain")>(),
  buildPlanet: () => new THREE.Group(), buildWater: () => new THREE.Group(),
  buildAtmosphere: () => new THREE.Group(), buildScatter: () => new THREE.Group(),
  buildPaths: () => ({ group: new THREE.Group(), arcs: [] }),
}));
vi.mock("@/components/world/engine/buildings", () => ({ buildBuildings: () => [] }));
vi.mock("@/components/world/engine/sky", () => ({ buildSky: () => ({ group: new THREE.Group(), update() {} }) }));
vi.mock("@/components/world/engine/ambient", () => ({ buildAmbient: () => ({ group: new THREE.Group(), update() {} }) }));
vi.mock("@/components/world/engine/spark", async importOriginal => {
  const actual = await importOriginal<typeof import("@/components/world/engine/spark")>();
  return { createSpark: vi.fn(actual.createSpark) };
});
import { createSpark } from "@/components/world/engine/spark";

let world: WorldHandle;
let tick: FrameRequestCallback;
let now: number;
const advance = (seconds: number) => {
  for (let i = 0; i < seconds * 60; i++) tick(now += 1000 / 60);
};
const spark = () => vi.mocked(createSpark).mock.results.at(-1)!.value;
const heading = () => new THREE.Vector3(0, 0, 1).applyQuaternion(spark().root.quaternion);
const normal = () => spark().root.position.clone().normalize();

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  vi.stubGlobal("IntersectionObserver", class { observe() {} disconnect() {} });
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { tick = callback; return 1; });
  vi.stubGlobal("cancelAnimationFrame", () => {});
  vi.spyOn(document, "hidden", "get").mockReturnValue(false);
  const parent = document.createElement("div");
  const canvas = document.createElement("canvas");
  parent.append(canvas);
  document.body.append(parent);
  now = performance.now();
  world = createWorld(canvas, { reducedMotion: false, fixedQuality: true }, {});
  world.enter();
  advance(0.1);
});
afterEach(() => {
  world.dispose();
  document.body.replaceChildren();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test.each([["KeyD", 1], ["ArrowRight", 1], ["KeyA", -1], ["ArrowLeft", -1]] as const)(
  "%s turns and banks into the expected screen direction", (code, direction) => {
    const before = heading();
    const screenRight = before.clone().cross(normal()).normalize();
    window.dispatchEvent(new KeyboardEvent("keydown", { code }));
    advance(0.25);
    window.dispatchEvent(new KeyboardEvent("keyup", { code }));
    expect(heading().dot(screenRight) * direction).toBeGreaterThan(0.4);
    // Local +x points screen-left. Positive bank tips local +y towards screen-right.
    const top = new THREE.Vector3(0, 1, 0).applyEuler(spark().body.rotation);
    expect(-top.x * direction).toBeGreaterThan(0.1);
  },
);

test("joystick right turns right, release stops turning, and Hop lifts Spark", () => {
  const screenRight = heading().cross(normal()).normalize();
  world.setStick(0, 1);
  advance(0.25);
  expect(heading().dot(screenRight)).toBeGreaterThan(0.4);
  world.setStick(0, 0);
  const released = heading();
  advance(0.25);
  expect(heading().angleTo(released)).toBeLessThan(0.001);
  world.hop();
  advance(0.25);
  expect(spark().body.position.y).toBeGreaterThan(1);
});

test.each(places.filter(place => place.id !== "hub").map(place => place.id))(
  "click-to-fly arrives at %s facing its building", id => {
    const arrived = vi.fn();
    // Arrival is observable through the same callback used by the UI.
    world.dispose();
    world = createWorld(document.querySelector("canvas")!, { reducedMotion: false, fixedQuality: true }, { onArrive: arrived });
    now = performance.now();
    world.enter();
    world.flyTo(id);
    advance(45);
    expect(arrived).toHaveBeenCalledWith(id);
    const distance = id === "queen" ? 13.5 : id === "showcase" ? 9.5 : 9;
    expect(normal().angleTo(doorstep(id, distance))).toBeLessThan(0.01);
    const towardBuilding = frames[id].n.clone().addScaledVector(normal(), -normal().dot(frames[id].n)).normalize();
    expect(heading().dot(towardBuilding)).toBeGreaterThan(0.99);
  },
);
