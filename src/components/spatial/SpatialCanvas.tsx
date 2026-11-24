"use client";
import { useEffect, useRef } from "react";
import { heroScenes, vertexShader, type HeroScene } from "./shaders";

export type SpatialStatus = "ready" | "unsupported";

type Props = {
  scene?: HeroScene;
  /** Render a single still frame with no pointer tracking (prefers-reduced-motion). */
  still?: boolean;
  className?: string;
  onStatus?: (status: SpatialStatus) => void;
};

const IDLE_STOP_MS = 9_000;
const AMBIENT_FRAME_MS = 1000 / 30;

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    if (process.env.NODE_ENV !== "production") console.warn(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

/**
 * Dependency-free WebGL2 renderer for one full-bleed fragment shader.
 * Render policy: only while on screen and the tab is visible; 60fps while the pointer or scroll is
 * active, 30fps ambient, and a full stop after IDLE_STOP_MS without input. Resolution adapts to
 * frame cost. The parent element is the scroll-progress and pointer reference.
 */
export function SpatialCanvas({ scene = "crossing", still = false, className, onStatus }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const statusRef = useRef(onStatus);
  useEffect(() => { statusRef.current = onStatus; }, [onStatus]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) return;
    const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, depth: false, powerPreference: "high-performance", preserveDrawingBuffer: false });
    if (!gl) { statusRef.current?.("unsupported"); return; }
    const vs = compile(gl, gl.VERTEX_SHADER, vertexShader);
    const fs = compile(gl, gl.FRAGMENT_SHADER, heroScenes[scene]);
    const program = gl.createProgram();
    if (!vs || !fs || !program) { statusRef.current?.("unsupported"); return; }
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { statusRef.current?.("unsupported"); return; }
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const u = {
      res: gl.getUniformLocation(program, "u_res"),
      cssSize: gl.getUniformLocation(program, "u_cssSize"),
      time: gl.getUniformLocation(program, "u_time"),
      pointer: gl.getUniformLocation(program, "u_pointer"),
      scroll: gl.getUniformLocation(program, "u_scroll"),
    };

    let scale = 1;
    let frame = 0;
    let running = false;
    let visible = true;
    let lastTick = 0;
    let lastDraw = 0;
    let lastInput = performance.now();
    let sceneTime = 4.2;
    let samples = 0, sampleTotal = 0;
    const target = { x: 0, y: 0 };
    const pointer = { x: 0, y: 0, vx: 0, vy: 0 };

    const resize = () => {
      const rect = host.getBoundingClientRect();
      const maxDpr = rect.width < 700 ? 1 : 1.5;
      const dpr = Math.min(window.devicePixelRatio || 1, maxDpr) * scale;
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(u.cssSize, rect.width, rect.height);
    };
    const scrollProgress = () => {
      const rect = host.getBoundingClientRect();
      return Math.min(1, Math.max(0, -rect.top / Math.max(1, rect.height)));
    };
    const draw = () => {
      gl.uniform2f(u.res, canvas.width, canvas.height);
      gl.uniform1f(u.time, sceneTime);
      gl.uniform2f(u.pointer, pointer.x, pointer.y);
      gl.uniform1f(u.scroll, scrollProgress());
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    const tick = (now: number) => {
      frame = 0;
      if (!running) return;
      const dt = Math.min(0.05, (now - (lastTick || now)) / 1000);
      lastTick = now;
      // Critically-damped spring toward the pointer target.
      for (const axis of ["x", "y"] as const) {
        const v = axis === "x" ? "vx" : "vy";
        pointer[v] += ((target[axis] - pointer[axis]) * 42 - pointer[v] * 11) * dt;
        pointer[axis] += pointer[v] * dt;
      }
      const moving = Math.abs(target.x - pointer.x) + Math.abs(target.y - pointer.y) > 0.002;
      const active = now - lastInput < 1_200 || moving;
      if (!active && now - lastInput > IDLE_STOP_MS) { running = false; lastTick = 0; return; }
      if (active || now - lastDraw >= AMBIENT_FRAME_MS) {
        sceneTime += active ? dt : (now - lastDraw) / 1000;
        draw();
        lastDraw = now;
        // Adaptive resolution: sustained slow frames lower the backing-store scale.
        sampleTotal += dt; samples++;
        if (samples >= 40) {
          if (sampleTotal / samples > 0.026 && scale > 0.55) { scale = Math.max(0.55, scale * 0.8); resize(); }
          samples = 0; sampleTotal = 0;
        }
      }
      frame = requestAnimationFrame(tick);
    };
    const start = () => {
      if (still || running || !visible || document.hidden) return;
      running = true;
      frame = requestAnimationFrame(tick);
    };
    const stop = () => { running = false; lastTick = 0; if (frame) cancelAnimationFrame(frame); frame = 0; };
    const wake = () => { lastInput = performance.now(); start(); };

    const onPointer = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const rect = host.getBoundingClientRect();
      target.x = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width) * 2 - 1));
      target.y = Math.max(-1, Math.min(1, -(((event.clientY - rect.top) / rect.height) * 2 - 1)));
      wake();
    };
    const onScroll = () => { if (still) { if (visible) draw(); return; } wake(); };
    const onVisibility = () => { if (document.hidden) stop(); else wake(); };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) wake(); else stop();
    });
    const resizeObserver = new ResizeObserver(() => { resize(); draw(); });
    const onLost = (event: Event) => { event.preventDefault(); stop(); statusRef.current?.("unsupported"); };

    resize();
    draw();
    statusRef.current?.("ready");
    observer.observe(host);
    resizeObserver.observe(host);
    canvas.addEventListener("webglcontextlost", onLost);
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    if (!still) window.addEventListener("pointermove", onPointer, { passive: true });
    start();

    return () => {
      stop();
      observer.disconnect();
      resizeObserver.disconnect();
      canvas.removeEventListener("webglcontextlost", onLost);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onPointer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buffer);
    };
  }, [scene, still]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
