import * as THREE from "three";

import { accent, brand } from "./palette";

/**
 * Spark: an original, gender-neutral guide for the world. A small floating ball of energy
 * with an X-shaped core, two blinking eyes and a light trail. It floats, so all of its
 * personality is procedural (bob, lean, squash, look) rather than a rigged walk cycle.
 */
export type Spark = {
  root: THREE.Group;
  /** Rotates with heading/lean; children are the visible body. */
  body: THREE.Group;
  trail: THREE.Points;
  shadow: THREE.Mesh;
  /** Push a world-space position into the trail (call every frame). */
  pushTrail: (position: THREE.Vector3, energy: number) => void;
  animate: (time: number, dt: number, state: { speed: number; turn: number; dashing: boolean; still: boolean }) => void;
  hop: () => void;
};

const TRAIL = 48;

export function createSpark(): Spark {
  const root = new THREE.Group();
  root.name = "spark";
  const body = new THREE.Group();
  root.add(body);

  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(0.72, 32, 24),
    new THREE.MeshStandardMaterial({ color: brand.coldPurple, emissive: new THREE.Color(brand.warmPurple), emissiveIntensity: 0.55, roughness: 0.25, metalness: 0.1, transparent: true, opacity: 0.55, depthWrite: false }),
  );
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(accent.bone).multiplyScalar(1.5), toneMapped: false }));
  const glowMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(brand.pink).multiplyScalar(2.2), toneMapped: false });
  const x = new THREE.Group();
  for (const angle of [Math.PI / 4, -Math.PI / 4]) {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.82, 4, 8), glowMaterial);
    arm.rotation.z = angle;
    x.add(arm);
  }
  // Eyes sit on the front of the shell.
  const eyeMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(accent.bone).multiplyScalar(1.4), toneMapped: false });
  const eyes = new THREE.Group();
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.1, 4, 8), eyeMaterial);
    eye.position.set(side * 0.2, 0.16, 0.66);
    eyes.add(eye);
  }
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.98, 0.025, 6, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color(brand.pink).multiplyScalar(2), transparent: true, opacity: 0.7, toneMapped: false }));
  halo.rotation.x = Math.PI / 2;
  const glow = new THREE.PointLight(brand.pink, 14, 9, 1.5);
  body.add(core, x, shell, eyes, halo, glow);

  // Soft contact shadow + glow ring on the ground (positioned by the controller).
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.7, 32),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(brand.pink).multiplyScalar(1.2), transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
  );
  shadow.rotation.x = -Math.PI / 2;

  // Trail particles in world space.
  const trailPositions = new Float32Array(TRAIL * 3);
  const trailGeometry = new THREE.BufferGeometry();
  trailGeometry.setAttribute("position", new THREE.BufferAttribute(trailPositions, 3));
  const trailSizes = new Float32Array(TRAIL);
  trailGeometry.setAttribute("aSize", new THREE.BufferAttribute(trailSizes, 1));
  const trail = new THREE.Points(
    trailGeometry,
    new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(brand.pink).multiplyScalar(2.2) }, uPixel: { value: 1 } },
      vertexShader: /* glsl */ `
        attribute float aSize; uniform float uPixel; varying float vFade;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vFade = aSize;
          gl_PointSize = aSize * 60.0 * uPixel / -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor; varying float vFade;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.0, d) * vFade;
          gl_FragColor = vec4(uColor, a);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  trail.frustumCulled = false;
  let trailInitialised = false;

  const pushTrail = (position: THREE.Vector3, energy: number) => {
    if (!trailInitialised) {
      for (let i = 0; i < TRAIL; i++) trailPositions.set([position.x, position.y, position.z], i * 3);
      trailInitialised = true;
    }
    trailPositions.copyWithin(3, 0, (TRAIL - 1) * 3);
    trailPositions.set([position.x, position.y, position.z], 0);
    for (let i = 0; i < TRAIL; i++) trailSizes[i] = Math.max(0, (1 - i / TRAIL)) * (0.25 + energy * 0.9);
    trailGeometry.attributes.position.needsUpdate = true;
    trailGeometry.attributes.aSize.needsUpdate = true;
  };

  let blinkTimer = 2.5;
  let hopT = 1;
  let lean = 0, bank = 0;

  const animate: Spark["animate"] = (time, dt, { speed, turn, dashing, still }) => {
    // Blink every few seconds.
    blinkTimer -= dt;
    const blink = blinkTimer < 0.12 ? 0.15 : 1;
    if (blinkTimer < 0) blinkTimer = 2 + Math.random() * 3.5;
    eyes.scale.y = blink;

    hopT = Math.min(1, hopT + dt * 1.6);
    const hopLift = Math.sin(hopT * Math.PI) * 1.6;
    const bob = still ? 0 : Math.sin(time * 2.4) * 0.14;
    body.position.y = bob + hopLift;

    // Lean into motion, bank into turns.
    lean += ((still ? 0 : Math.min(1, speed / 14) * 0.38) - lean) * Math.min(1, dt * 6);
    bank += ((still ? 0 : -turn * 0.3) - bank) * Math.min(1, dt * 5);
    body.rotation.set(lean, 0, bank);

    // Squash on landing a hop, stretch while dashing.
    const squash = hopT > 0.92 && hopT < 1 ? 0.82 : 1;
    const stretch = dashing ? 1.12 : 1;
    body.scale.set(1 / Math.sqrt(squash * stretch), squash, stretch);

    x.rotation.z = still ? 0 : time * (dashing ? 6 : 1.4);
    halo.rotation.z = time * 0.8;
    halo.scale.setScalar(1 + Math.sin(time * 3) * 0.05);
    glow.intensity = dashing ? 22 : 14;
  };

  return { root, body, trail, shadow, pushTrail, animate, hop: () => { if (hopT >= 1) hopT = 0; } };
}
