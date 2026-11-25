import * as THREE from "three";

import { accent, brand } from "./palette";
import { mulberry32 } from "./noise";
import { frames, PLANET_RADIUS } from "./terrain";

function softSprite(inner: string, outer: string) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, inner);
  gradient.addColorStop(1, outer);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function buildSky() {
  const group = new THREE.Group();
  group.name = "sky";
  const rng = mulberry32(7);

  // Stars on a far shell.
  const count = 2600;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const palette = [new THREE.Color(accent.bone), new THREE.Color(0xc9b8ff), new THREE.Color(0xff9ccf), new THREE.Color(accent.ion)];
  for (let i = 0; i < count; i++) {
    const v = new THREE.Vector3(rng() * 2 - 1, rng() * 2 - 1, rng() * 2 - 1).normalize().multiplyScalar(420 + rng() * 120);
    positions.set([v.x, v.y, v.z], i * 3);
    const c = palette[Math.floor(rng() * palette.length)].clone().multiplyScalar(0.5 + rng() * 0.9);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  starGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const seeds = new Float32Array(count);
  for (let i = 0; i < count; i++) seeds[i] = rng() * 100;
  starGeometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
  const starMaterial = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPixel: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute float aSeed; attribute vec3 color; uniform float uTime; uniform float uPixel; varying vec3 vColor; varying float vTwinkle;
      void main() {
        vColor = color;
        vTwinkle = 0.55 + 0.45 * sin(uTime * (0.6 + fract(aSeed) * 1.8) + aSeed);
        gl_PointSize = (1.2 + fract(aSeed * 7.3) * 2.2) * uPixel * (0.7 + vTwinkle * 0.5);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vColor; varying float vTwinkle;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        gl_FragColor = vec4(vColor, smoothstep(0.5, 0.1, d) * vTwinkle);
      }`,
    transparent: true,
    depthWrite: false,
    fog: false,
  });
  const stars = new THREE.Points(starGeometry, starMaterial);
  group.add(stars);

  // Nebula clouds in brand colours.
  const nebulaColors = ["rgba(227,28,121,.55)", "rgba(152,29,151,.5)", "rgba(88,44,131,.6)", "rgba(0,32,91,.7)"];
  for (let i = 0; i < 9; i++) {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: softSprite(nebulaColors[i % nebulaColors.length], "rgba(0,0,0,0)"), transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending, opacity: 0.55 }));
    const v = new THREE.Vector3(rng() * 2 - 1, rng() * 1.2 - 0.4, rng() * 2 - 1).normalize().multiplyScalar(380);
    sprite.position.copy(v);
    sprite.scale.setScalar(180 + rng() * 220);
    group.add(sprite);
  }

  // A distant moon.
  const moon = new THREE.Mesh(new THREE.IcosahedronGeometry(14, 2), new THREE.MeshStandardMaterial({ color: 0x4a3b7a, emissive: new THREE.Color(brand.coldPurple), emissiveIntensity: 0.4, flatShading: true, roughness: 1, fog: false }));
  moon.position.set(-180, 120, -220);
  group.add(moon);

  // A tilted ring of data particles around the planet.
  const ringCount = 900;
  const ringPositions = new Float32Array(ringCount * 3);
  for (let i = 0; i < ringCount; i++) {
    const a = rng() * Math.PI * 2;
    const r = PLANET_RADIUS * (1.55 + rng() * 0.35);
    ringPositions.set([Math.cos(a) * r, (rng() - 0.5) * 1.2, Math.sin(a) * r], i * 3);
  }
  const ringGeometry = new THREE.BufferGeometry();
  ringGeometry.setAttribute("position", new THREE.BufferAttribute(ringPositions, 3));
  const ring = new THREE.Points(ringGeometry, new THREE.PointsMaterial({ color: new THREE.Color(brand.pink).multiplyScalar(1.6), size: 0.35, transparent: true, opacity: 0.75, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  ring.rotation.set(0.42, 0, 0.28);
  group.add(ring);

  // Little drones orbiting above the places.
  const drones: Array<{ object: THREE.Group; axis: THREE.Vector3; base: THREE.Vector3; speed: number; light: THREE.Mesh }> = [];
  const droneBody = new THREE.BoxGeometry(0.7, 0.18, 0.7);
  const droneMaterial = new THREE.MeshStandardMaterial({ color: 0x1b1b2e, roughness: 0.4, metalness: 0.6 });
  for (const frame of Object.values(frames)) {
    const object = new THREE.Group();
    object.add(new THREE.Mesh(droneBody, droneMaterial));
    const light = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color(accent.ion).multiplyScalar(2.5), toneMapped: false }));
    light.position.y = -0.15;
    object.add(light);
    group.add(object);
    drones.push({ object, axis: frame.n.clone(), base: frame.front.clone(), speed: 0.4 + rng() * 0.4, light });
  }

  const update = (time: number, pixel = 1) => {
    starMaterial.uniforms.uTime.value = time;
    starMaterial.uniforms.uPixel.value = pixel;
    ring.rotation.y = time * 0.02;
    stars.rotation.y = time * 0.002;
    for (const drone of drones) {
      const offset = drone.base.clone().applyAxisAngle(drone.axis, time * drone.speed).multiplyScalar(7);
      drone.object.position.copy(drone.axis).multiplyScalar(PLANET_RADIUS + 13 + Math.sin(time + drone.speed * 10) * 0.6).add(offset);
      drone.object.lookAt(0, 0, 0);
      drone.light.visible = Math.sin(time * 4 + drone.speed * 20) > -0.3;
    }
  };

  return { group, update };
}
