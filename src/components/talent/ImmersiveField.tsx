"use client";

import Script from "next/script";
import { useEffect, useRef, useState, type RefObject } from "react";

import styles from "./talent.module.css";
import type { SceneMotionState } from "./useCinematicMotion";

declare global {
  interface Window {
    THREE?: typeof import("three");
  }
}

const THREE_SOURCE = "/threeui/three.min.js";

export function ImmersiveField({ sceneState }: { sceneState: RefObject<SceneMotionState> }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scriptReady, setScriptReady] = useState(
    () => typeof window !== "undefined" && Boolean(window.THREE),
  );
  const [renderState, setRenderState] = useState<"loading" | "ready" | "fallback">("loading");

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    const THREE = window.THREE;
    if (!scriptReady || !host || !canvas || !THREE) return;

    let frame = 0;
    let visible = true;
    let disposed = false;
    const pointer = { x: 0, y: 0 };
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    try {
      const context = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
      if (!context) throw new Error("WebGL is unavailable.");
      const renderer = new THREE.WebGLRenderer({
        canvas,
        context,
        alpha: true,
        antialias: window.innerWidth > 720,
        powerPreference: "high-performance",
      });
      renderer.setClearColor(0x05070a, 0);
      renderer.outputEncoding = THREE.sRGBEncoding;

      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x05070a, 0.055);
      const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 120);
      camera.position.set(0, 1.2, 14);

      const rig = new THREE.Group();
      scene.add(rig);

      const coreMaterial = new THREE.MeshBasicMaterial({
        color: 0xff4d3d,
        wireframe: true,
        transparent: true,
        opacity: 0.42,
      });
      const core = new THREE.Mesh(new THREE.IcosahedronGeometry(3.2, 2), coreMaterial);
      core.rotation.z = 0.36;
      rig.add(core);

      const haloMaterial = new THREE.MeshBasicMaterial({
        color: 0x76f7e6,
        wireframe: true,
        transparent: true,
        opacity: 0.18,
      });
      const halo = new THREE.Mesh(new THREE.TorusGeometry(5.1, 0.025, 6, 140), haloMaterial);
      halo.rotation.x = 1.06;
      rig.add(halo);

      const pointCount = window.innerWidth < 720 ? 360 : 900;
      const positions = new Float32Array(pointCount * 3);
      let seed = 3506;
      const random = () => {
        seed = (seed * 16807) % 2147483647;
        return (seed - 1) / 2147483646;
      };
      for (let index = 0; index < positions.length; index += 3) {
        const radius = 5 + random() * 23;
        const angle = random() * Math.PI * 2;
        positions[index] = Math.cos(angle) * radius;
        positions[index + 1] = (random() - 0.5) * 18;
        positions[index + 2] = Math.sin(angle) * radius - 8;
      }
      const starsGeometry = new THREE.BufferGeometry();
      starsGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const starsMaterial = new THREE.PointsMaterial({
        color: 0xdfe7e0,
        size: 0.035,
        transparent: true,
        opacity: 0.52,
        sizeAttenuation: true,
      });
      const stars = new THREE.Points(starsGeometry, starsMaterial);
      scene.add(stars);

      const grid = new THREE.GridHelper(42, 32, 0xff4d3d, 0x16313a);
      grid.position.y = -4.3;
      grid.position.z = -5;
      const gridMaterials = Array.isArray(grid.material) ? grid.material : [grid.material];
      for (const material of gridMaterials) {
        material.transparent = true;
        material.opacity = 0.22;
      }
      scene.add(grid);

      const resize = () => {
        const width = host.clientWidth;
        const height = host.clientHeight;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.innerWidth < 720 ? 1.25 : 1.75));
        renderer.setSize(width, height, false);
        camera.aspect = width / Math.max(height, 1);
        camera.updateProjectionMatrix();
      };

      const onPointerMove = (event: PointerEvent) => {
        pointer.x = event.clientX / window.innerWidth - 0.5;
        pointer.y = event.clientY / window.innerHeight - 0.5;
      };

      const draw = (time = 0) => {
        if (disposed) return;
        const motion = sceneState.current;
        const scrollProgress = motion.progress;
        const targetX = reducedMotion.matches ? 0 : pointer.x * 0.52 * motion.parallax;
        const targetY = reducedMotion.matches ? 0 : -pointer.y * 0.34 * motion.parallax - scrollProgress * 0.5;
        camera.position.x += (targetX - camera.position.x) * 0.035;
        camera.position.y += (1.2 + targetY - camera.position.y) * 0.035;
        camera.position.z = 14 - scrollProgress * 3.4;
        rig.scale.setScalar(1 + motion.spread * 0.18);
        rig.position.y = motion.chapter * -0.28;
        coreMaterial.opacity = 0.3 + motion.intensity * 0.2;
        haloMaterial.opacity = 0.1 + motion.intensity * 0.16;
        starsMaterial.opacity = 0.3 + motion.intensity * 0.28;
        gridMaterials.forEach((material) => {
          material.opacity = 0.08 + motion.grid * 0.24;
        });
        if (!reducedMotion.matches) {
          core.rotation.y = time * 0.00008 + scrollProgress * 1.45;
          core.rotation.x = time * 0.000035;
          halo.rotation.z = -time * 0.000045;
          stars.rotation.y = time * 0.000008;
        }
        renderer.render(scene, camera);
        if (!reducedMotion.matches && visible && !document.hidden) frame = requestAnimationFrame(draw);
      };

      const restart = () => {
        cancelAnimationFrame(frame);
        if (visible && !document.hidden) draw(performance.now());
      };

      const resizeObserver = new ResizeObserver(() => {
        resize();
        if (reducedMotion.matches) draw();
      });
      const intersectionObserver = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (visible) restart();
        else cancelAnimationFrame(frame);
      });
      const onVisibilityChange = () => restart();
      const onMotionChange = () => restart();

      resizeObserver.observe(host);
      intersectionObserver.observe(host);
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      document.addEventListener("visibilitychange", onVisibilityChange);
      reducedMotion.addEventListener("change", onMotionChange);
      resize();
      draw();
      requestAnimationFrame(() => setRenderState("ready"));

      return () => {
        disposed = true;
        cancelAnimationFrame(frame);
        resizeObserver.disconnect();
        intersectionObserver.disconnect();
        window.removeEventListener("pointermove", onPointerMove);
        document.removeEventListener("visibilitychange", onVisibilityChange);
        reducedMotion.removeEventListener("change", onMotionChange);
        core.geometry.dispose();
        coreMaterial.dispose();
        halo.geometry.dispose();
        haloMaterial.dispose();
        starsGeometry.dispose();
        starsMaterial.dispose();
        grid.geometry.dispose();
        gridMaterials.forEach((material) => material.dispose());
        renderer.dispose();
      };
    } catch {
      queueMicrotask(() => setRenderState("fallback"));
      return;
    }
  }, [sceneState, scriptReady]);

  return (
    <div ref={hostRef} className={styles.immersiveField} data-render-state={renderState} aria-hidden="true">
      <Script
        src={THREE_SOURCE}
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
        onError={() => setRenderState("fallback")}
      />
      <canvas ref={canvasRef} className={styles.sceneCanvas} />
      <div className={styles.sceneFallback} />
    </div>
  );
}
