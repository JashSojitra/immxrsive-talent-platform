import * as THREE from "three";

import { mulberry32 } from "./noise";
import { accent, brand } from "./palette";
import { frames, PLANET_RADIUS, placeOnSurface, surfacePoint } from "./terrain";

/** Ambient life: fireflies drifting around each place and slow clouds circling the planet. */
export function buildAmbient() {
  const group = new THREE.Group();
  group.name = "ambient";
  const rng = mulberry32(99);

  // Fireflies: anchored around each place, animated in the vertex shader.
  const perPlace = 46;
  const placeFrames = Object.values(frames);
  const count = perPlace * placeFrames.length;
  const anchors = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  const colors = new Float32Array(count * 3);
  const palette = [new THREE.Color(brand.pink), new THREE.Color(accent.ion), new THREE.Color(accent.warmWindow)];
  const point = new THREE.Vector3();
  placeFrames.forEach((frame, p) => {
    for (let i = 0; i < perPlace; i++) {
      const k = p * perPlace + i;
      const angle = rng() * Math.PI * 2;
      const distance = (4 + rng() * 9) / PLANET_RADIUS;
      const tangent = frame.front.clone().applyAxisAngle(frame.n, angle);
      const dir = frame.n.clone().multiplyScalar(Math.cos(distance)).addScaledVector(tangent, Math.sin(distance)).normalize();
      surfacePoint(dir, 0.6 + rng() * 4.5, point);
      anchors.set([point.x, point.y, point.z], k * 3);
      seeds[k] = rng() * 100;
      const c = palette[Math.floor(rng() * palette.length)];
      colors.set([c.r, c.g, c.b], k * 3);
    }
  });
  const fireflyGeometry = new THREE.BufferGeometry();
  fireflyGeometry.setAttribute("position", new THREE.BufferAttribute(anchors, 3));
  fireflyGeometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
  fireflyGeometry.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
  const fireflyMaterial = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPixel: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute float aSeed; attribute vec3 aColor; uniform float uTime; uniform float uPixel;
      varying vec3 vColor; varying float vAlpha;
      void main() {
        vec3 p = position + vec3(sin(uTime * 0.6 + aSeed), sin(uTime * 0.8 + aSeed * 1.7) * 0.6, cos(uTime * 0.5 + aSeed * 0.9)) * 0.9;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vColor = aColor;
        vAlpha = 0.45 + 0.55 * sin(uTime * 2.2 + aSeed * 3.0);
        gl_PointSize = (14.0 + 6.0 * sin(aSeed)) * uPixel / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vColor; varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d) * max(vAlpha, 0.0);
        gl_FragColor = vec4(vColor * 2.2, a);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  const fireflies = new THREE.Points(fireflyGeometry, fireflyMaterial);
  fireflies.frustumCulled = false;
  group.add(fireflies);

  // Low-poly clouds orbiting high above the surface.
  const cloudMaterial = new THREE.MeshStandardMaterial({ color: 0x9d8ad6, emissive: new THREE.Color(0x2a1d5e), emissiveIntensity: 0.6, roughness: 1, flatShading: true, transparent: true, opacity: 0.5, depthWrite: false });
  const puff = new THREE.IcosahedronGeometry(1, 1);
  const clouds: Array<{ object: THREE.Group; axis: THREE.Vector3; start: THREE.Vector3; speed: number; lift: number }> = [];
  for (let i = 0; i < 11; i++) {
    const cloud = new THREE.Group();
    const puffs = 4 + Math.floor(rng() * 3);
    for (let j = 0; j < puffs; j++) {
      const m = new THREE.Mesh(puff, cloudMaterial);
      const s = 0.8 + rng() * 0.9;
      m.scale.set(s * 1.3, s * 0.75, s);
      m.position.set((j - puffs / 2) * 1.15 + rng() * 0.5, rng() * 0.5, rng() * 1.0 - 0.5);
      cloud.add(m);
    }
    group.add(cloud);
    const start = new THREE.Vector3(rng() * 2 - 1, rng() * 1.6 - 0.6, rng() * 2 - 1).normalize();
    const axis = new THREE.Vector3(rng() - 0.5, 1, rng() - 0.5).normalize();
    clouds.push({ object: cloud, axis, start, speed: 0.012 + rng() * 0.012, lift: 15 + rng() * 6 });
  }

  const dir = new THREE.Vector3();
  const heading = new THREE.Vector3();
  const update = (time: number, pixel: number) => {
    fireflyMaterial.uniforms.uTime.value = time;
    fireflyMaterial.uniforms.uPixel.value = pixel;
    for (const cloud of clouds) {
      dir.copy(cloud.start).applyAxisAngle(cloud.axis, time * cloud.speed).normalize();
      heading.crossVectors(cloud.axis, dir).normalize();
      placeOnSurface(cloud.object, dir, heading, 0);
      cloud.object.position.copy(dir).multiplyScalar(PLANET_RADIUS + cloud.lift);
    }
  };

  return { group, update };
}
