"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { SpatialStatus } from "./SpatialCanvas";
import { createXRMark, disposeXRMark, XR_MARK_URL } from "./xr-mark";

type Props = { still: boolean; className?: string; onStatus: (status: SpatialStatus) => void };

/** Homepage only: an idle-loaded mesh scene with the same visibility, idle and motion policy. */
export function XRCanvas({ still, className, onStatus }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current!;
    const host = canvas.parentElement!;
    const abort = new AbortController();
    let cleanup: (() => void) | undefined;
    let renderer: THREE.WebGLRenderer | undefined;
    let mark: THREE.Group | undefined;
    onStatus("unsupported");
    (async () => {
      try {
        // Check support before fetching or building geometry; keep the server-rendered poster on failure.
        const gl = canvas.getContext("webgl2", { alpha: true, antialias: true, powerPreference: "low-power" });
        if (!gl) return;
        const response = await fetch(XR_MARK_URL, { signal: abort.signal });
        if (!response.ok) throw new Error("XR artwork unavailable");
        const svg = await response.text();
        if (abort.signal.aborted) return;
        renderer = new THREE.WebGLRenderer({ canvas, context: gl, alpha: true, antialias: true });
        renderer.setClearColor(0x000000, 0);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.35;
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(35, 1, .1, 40);
        camera.position.z = 8;
        mark = createXRMark(svg);
        scene.add(mark);
        scene.add(new THREE.HemisphereLight(0xf4edff, 0x171027, 2.4));
        const key = new THREE.DirectionalLight(0xffffff, 4);
        key.position.set(-3, 5, 6);
        scene.add(key);
        const rim = new THREE.DirectionalLight(0xc6a2ed, 3);
        rim.position.set(4, 2, -2);
        scene.add(rim);
        const pink = new THREE.PointLight(0xe31c79, 12, 12, 2);
        pink.position.set(-3, -1, 2);
        scene.add(pink);

        const activeRenderer = renderer;
        const activeMark = mark;
        let frame = 0, running = false, visible = true;
        let width = 1, height = 1, quality = 1;
        let time = 0, last = 0, lastDraw = 0, lastInput = performance.now();
        let samples = 0, totalCost = 0;
        const pointer = { x: 0, y: 0 }, target = { x: 0, y: 0 };
        const resize = () => {
          const rect = host.getBoundingClientRect();
          width = Math.max(1, rect.width); height = Math.max(1, rect.height);
          activeRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, width < 700 ? 1 : 1.5) * quality);
          activeRenderer.setSize(width, height, false);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
        };
        const draw = () => {
          // Match the existing copy-safe composition: right on desktop, high/centred on mobile.
          const narrow = width <= 900;
          const viewHeight = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
          const viewWidth = viewHeight * camera.aspect;
          const pixels = narrow ? Math.min(width * .52, 210) : Math.min(height * .58, width * .36, 540);
          activeMark.scale.setScalar((pixels / height) * viewHeight / 3.6);
          const scroll = Math.min(1, Math.max(0, -host.getBoundingClientRect().top / height));
          activeMark.position.set(narrow ? 0 : viewWidth * .205, narrow ? viewHeight * (.5 - 142 / height) : viewHeight * .06, 0);
          activeMark.position.y += still ? 0 : Math.sin(time * .7) * .045;
          activeMark.position.z = scroll * .4;
          activeMark.rotation.set(still ? 0 : Math.sin(time * .4) * .035 + pointer.y * .1, -.12 + (still ? 0 : Math.sin(time * .3) * .055 + pointer.x * .16), 0);
          activeRenderer.render(scene, camera);
        };
        const stop = () => { running = false; last = 0; cancelAnimationFrame(frame); };
        const tick = (now: number) => {
          if (!running) return;
          const dt = Math.min(.05, (now - (last || now)) / 1000);
          last = now;
          const moving = Math.abs(target.x - pointer.x) + Math.abs(target.y - pointer.y) > .002;
          const active = now - lastInput < 1200 || moving;
          if (!active && now - lastInput > 9000) { stop(); return; }
          if (active || now - lastDraw >= 1000 / 30) {
            const elapsed = Math.min(.1, (now - (lastDraw || now)) / 1000);
            pointer.x += (target.x - pointer.x) * (1 - Math.exp(-8 * elapsed));
            pointer.y += (target.y - pointer.y) * (1 - Math.exp(-8 * elapsed));
            time += elapsed;
            draw();
            totalCost += dt * 1000; samples++;
            if (samples === 40) {
              if (totalCost / samples > 26 && quality > .55) { quality = Math.max(.55, quality * .8); resize(); }
              samples = 0; totalCost = 0;
            }
            lastDraw = now;
          }
          frame = requestAnimationFrame(tick);
        };
        const wake = () => {
          lastInput = performance.now();
          if (still || running || !visible || document.hidden || abort.signal.aborted) return;
          running = true; frame = requestAnimationFrame(tick);
        };
        const onPointer = (event: PointerEvent) => {
          if (event.pointerType !== "mouse") return;
          const rect = host.getBoundingClientRect();
          target.x = THREE.MathUtils.clamp((event.clientX - rect.left) / width * 2 - 1, -1, 1);
          target.y = THREE.MathUtils.clamp(1 - (event.clientY - rect.top) / height * 2, -1, 1);
          wake();
        };
        const onScroll = () => { if (still) { if (visible) draw(); } else wake(); };
        const onVisibility = () => { if (document.hidden) stop(); else wake(); };
        const onLost = (event: Event) => { event.preventDefault(); stop(); onStatus("unsupported"); };
        const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) wake(); else stop(); });
        const resizeObserver = new ResizeObserver(() => { resize(); draw(); });
        cleanup = () => {
          stop(); observer.disconnect(); resizeObserver.disconnect();
          window.removeEventListener("pointermove", onPointer);
          window.removeEventListener("scroll", onScroll);
          document.removeEventListener("visibilitychange", onVisibility);
          canvas.removeEventListener("webglcontextlost", onLost);
        };
        resize(); draw(); onStatus("ready");
        observer.observe(host); resizeObserver.observe(host);
        if (!still) window.addEventListener("pointermove", onPointer, { passive: true });
        window.addEventListener("scroll", onScroll, { passive: true });
        document.addEventListener("visibilitychange", onVisibility);
        canvas.addEventListener("webglcontextlost", onLost);
        wake();
      } catch (error) {
        if (!abort.signal.aborted) {
          cleanup?.();
          onStatus("unsupported");
          if (process.env.NODE_ENV !== "production") console.warn("XR hero unavailable", error);
        }
      }
    })();
    return () => {
      abort.abort(); cleanup?.();
      if (mark) disposeXRMark(mark);
      renderer?.dispose();
    };
  }, [still, onStatus]);
  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
