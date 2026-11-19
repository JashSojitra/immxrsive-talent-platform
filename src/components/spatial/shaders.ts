// Original GLSL ES 3.0 scene for the ImmXrsive spatial hero ("The Crossing").
// Concepts B ("Scan Field") and C ("Aperture") were prototyped and rejected; see docs/design/phase-1-spatial-identity.md.
// Uniforms: u_res (px), u_time (s), u_pointer (-1..1, spring-smoothed), u_scroll (0..1 hero exit progress).
// Palette is the two-light rig: flare (warm key) and ion (cold rim) on a blue-black void.

export const vertexShader = `#version 300 es
in vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
`;

export const crossingShader = `#version 300 es
precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform vec2 u_pointer;
uniform float u_scroll;
out vec4 outColor;

const vec3 VOID = vec3(0.010, 0.013, 0.026);
const vec3 FLARE = vec3(1.0, 0.40, 0.26);
const vec3 EMBER = vec3(1.0, 0.74, 0.55);
const vec3 ION = vec3(0.42, 0.98, 0.85);
const vec3 BAR = vec3(1.3, 0.13, 0.13);

mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float smin(float a, float b, float k) { float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }
float sdRoundBox(vec3 p, vec3 b, float r) { vec3 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - r; }
float octagon(vec2 q) { q = abs(q); return max(max(q.x, q.y), (q.x + q.y) * 0.70710678); }

vec3 objectSpace(vec3 p) {
  vec3 q = p;
  q.y -= 0.07 * sin(u_time * 0.55);
  q.xz *= rot(0.42 * sin(u_time * 0.19) + u_pointer.x * 0.6);
  q.yz *= rot(-u_pointer.y * 0.35 + 0.08 * sin(u_time * 0.31));
  return q;
}
vec3 barA(vec3 q) { return vec3(rot(0.7853982) * q.xy, q.z); }
vec3 barB(vec3 q) { return vec3(rot(-0.7853982) * q.xy, q.z); }

// x: distance, y: material (1 = monolith, 2 = light gate)
vec2 scene(vec3 p) {
  vec3 q = objectSpace(p);
  float x = smin(sdRoundBox(barA(q), BAR, 0.06), sdRoundBox(barB(q), BAR, 0.06), 0.025);
  vec3 g = q; g.z += 0.4;
  float ring = length(vec2(octagon(g.xy) - 2.05, g.z)) - 0.016;
  return x < ring ? vec2(x, 1.0) : vec2(ring, 2.0);
}
vec3 normalAt(vec3 p) {
  const vec2 k = vec2(1.0, -1.0);
  float e = 0.0012;
  return normalize(k.xyy * scene(p + k.xyy * e).x + k.yyx * scene(p + k.yyx * e).x + k.yxy * scene(p + k.yxy * e).x + k.xxx * scene(p + k.xxx * e).x);
}
// Studio environment: warm key softbox, cold rim strip, faint floor bounce. Drives glossy reflections.
vec3 env(vec3 r, vec3 keyDir) {
  vec3 c = vec3(0.012, 0.016, 0.034) * (0.6 + 0.4 * r.y);
  c += EMBER * 3.2 * smoothstep(0.955, 0.985, dot(r, keyDir));
  c += EMBER * 0.25 * smoothstep(0.75, 0.98, dot(r, keyDir));
  float strip = smoothstep(0.07, 0.025, abs(r.x - 0.78)) * smoothstep(-0.35, 0.05, r.y) * smoothstep(0.85, 0.45, r.y);
  c += ION * strip * 2.0;
  c += FLARE * 0.22 * smoothstep(-0.05, -0.7, r.y);
  // Broad fill panel behind the viewer: front faces sweep warm-to-cold as the object turns.
  c += smoothstep(-0.1, 1.0, r.z) * mix(FLARE * 0.55, ION * 0.45, smoothstep(-0.7, 0.7, r.x + r.y * 0.4));
  return c;
}
vec3 floorField(vec3 ro, vec3 rd) {
  float t = (-2.0 - ro.y) / rd.y;
  if (t < 0.0) return vec3(0.0);
  vec3 p = ro + rd * t;
  vec2 cell = p.xz * 3.2;
  vec2 local = fract(cell) - 0.5;
  float n = hash(floor(cell));
  float size = mix(0.05, 0.11, n) * (1.0 + t * 0.02);
  float dotMask = smoothstep(size, size * 0.35, length(local));
  float pool = exp(-0.28 * dot(p.xz, p.xz));
  float ripple = 0.6 + 0.4 * sin(length(p.xz) * 3.0 - u_time * 1.1);
  float fade = exp(-0.12 * t);
  return (dotMask * mix(ION * 0.45, EMBER, pool) * (0.42 + 0.6 * pool * ripple) + pool * FLARE * 0.07) * fade;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;
  float aspect = u_res.x / u_res.y;
  float wide = smoothstep(1.05, 1.6, aspect);
  // Wide viewports: monolith sits right of the headline. Narrow: centered high, camera pulled back.
  float dist = mix(11.5, 7.3, smoothstep(0.45, 1.6, aspect)) - u_scroll * 4.2;
  vec3 ta = vec3(mix(0.0, -1.85, wide), mix(-1.9, 0.0, wide), 0.0);
  vec3 ro = vec3(ta.x + u_pointer.x * 0.7, 0.45 + u_pointer.y * 0.3, dist);
  vec3 ww = normalize(ta - ro), uu = normalize(cross(ww, vec3(0.0, 1.0, 0.0))), vv = cross(uu, ww);
  vec3 rd = normalize(uv.x * uu + uv.y * vv + 1.8 * ww);
  vec3 keyDir = normalize(vec3(-0.7 + u_pointer.x * 1.1, 0.75 + u_pointer.y * 0.5, 0.75));
  vec3 rimDir = normalize(vec3(0.8, 0.3, -0.85));

  float t = 0.0; vec2 h = vec2(1e5, 0.0); float glow = 0.0;
  for (int i = 0; i < 88; i++) {
    vec3 p = ro + rd * t;
    h = scene(p);
    if (h.y > 1.5) glow += 1.0 / (1.0 + h.x * h.x * 900.0);
    if (h.x < 0.001 || t > 20.0) break;
    t += h.x * 0.85;
  }

  vec3 col = VOID + vec3(0.025, 0.03, 0.07) * smoothstep(0.9, -0.3, length(uv - vec2(0.0, -0.1)));
  col += floorField(ro, rd);
  col += step(0.9978, hash(floor(gl_FragCoord.xy * 0.5))) * 0.3 * smoothstep(-0.15, 0.45, uv.y) * vec3(0.85, 0.92, 1.0);
  // Gate halo behind the monolith.
  vec2 gateCenter = vec2(-ta.x, -ta.y) * 1.8 / dist;
  col += mix(FLARE, ION, 0.35) * 0.09 * exp(-2.2 * length(uv - gateCenter));

  if (t < 20.0) {
    vec3 p = ro + rd * t;
    vec3 n = normalAt(p);
    if (h.y < 1.5) {
      vec3 refl = reflect(rd, n);
      float fres = 0.04 + 0.96 * pow(1.0 - max(dot(n, -rd), 0.0), 5.0);
      float rim = pow(max(dot(n, rimDir), 0.0), 4.0);
      col = vec3(0.008, 0.009, 0.016) + max(dot(n, keyDir), 0.0) * FLARE * 0.035;
      col += env(refl, keyDir) * mix(0.3, 1.0, fres);
      col += rim * ION * 0.35;
      col += floorField(p, refl) * 0.3;
    } else {
      float a = atan(p.y, p.x);
      col = mix(FLARE, ION, 0.5 + 0.5 * sin(a * 1.5 + u_time * 0.3)) * 1.6 + EMBER * 0.4;
    }
  }
  col += glow * mix(FLARE, ION, 0.5 + 0.5 * sin(atan(uv.y, uv.x) * 2.0 + u_time * 0.35)) * 0.03;
  col *= 1.0 - u_scroll * 0.9;
  col *= smoothstep(1.55, 0.35, length(uv * vec2(0.75, 1.0)));
  col = col / (1.0 + col);
  col = pow(col, vec3(0.9));
  outColor = vec4(col + (hash(gl_FragCoord.xy + fract(u_time)) - 0.5) / 255.0, 1.0);
}
`;

export const heroScenes = { crossing: crossingShader } as const;
export type HeroScene = keyof typeof heroScenes;
