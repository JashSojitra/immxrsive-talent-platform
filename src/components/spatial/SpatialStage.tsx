"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { SpatialStatus } from "./SpatialCanvas";
import styles from "./spatial.module.css";

const SpatialCanvas = dynamic(() => import("./SpatialCanvas").then(module => module.SpatialCanvas), { ssr: false });

type StageStatus = "poster" | SpatialStatus;

/**
 * Full-bleed spatial scene. The SVG/CSS poster is server-rendered and always present, so the
 * hero is complete without JavaScript or WebGL. The WebGL canvas is code-split and only
 * requested after the page is idle; it is skipped for Save-Data, and renders a single still
 * frame for reduced motion. `data-status` exposes poster | ready | unsupported for tests.
 */
export function SpatialStage({ className = "" }: { className?: string }) {
  const [mount, setMount] = useState(false);
  const [still, setStill] = useState(false);
  const [status, setStatus] = useState<StageStatus>("poster");
  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (connection?.saveData) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setStill(reduce.matches);
    update();
    reduce.addEventListener("change", update);
    const idle = window.requestIdleCallback ?? ((callback: () => void) => window.setTimeout(callback, 350));
    const cancel = window.cancelIdleCallback ?? window.clearTimeout;
    const handle = idle(() => setMount(true), { timeout: 1600 });
    return () => { reduce.removeEventListener("change", update); cancel(handle); };
  }, []);
  return <div className={`${styles.stage} ${className}`} data-status={status} data-still={still || undefined}>
    <SpatialPoster />
    {mount && <SpatialCanvas className={styles.canvas} still={still} onStatus={setStatus} />}
    <div className={styles.vignette} aria-hidden="true" />
  </div>;
}

/** Static composition of "The Crossing": gate, glass X and point floor. Decorative only. */
export function SpatialPoster() {
  return <div className={styles.poster} aria-hidden="true">
    <div className={styles.floor} />
    <svg className={styles.posterArt} viewBox="0 0 800 800" fill="none">
      <defs>
        <linearGradient id="sx-gate" x1="120" y1="80" x2="700" y2="720" gradientUnits="userSpaceOnUse"><stop stopColor="#ff7a59" /><stop offset=".55" stopColor="#ffb48a" /><stop offset="1" stopColor="#8ef0d4" /></linearGradient>
        <linearGradient id="sx-blade-a" x1="200" y1="200" x2="600" y2="600" gradientUnits="userSpaceOnUse"><stop stopColor="#2a1814" /><stop offset=".45" stopColor="#0b0d14" /><stop offset="1" stopColor="#123a35" /></linearGradient>
        <linearGradient id="sx-blade-b" x1="600" y1="200" x2="200" y2="600" gradientUnits="userSpaceOnUse"><stop stopColor="#14423b" /><stop offset=".5" stopColor="#0a0c12" /><stop offset="1" stopColor="#3a1d15" /></linearGradient>
        <radialGradient id="sx-halo" cx="400" cy="400" r="340" gradientUnits="userSpaceOnUse"><stop stopColor="#ff7a59" stopOpacity=".28" /><stop offset=".55" stopColor="#8ef0d4" stopOpacity=".06" /><stop offset="1" stopColor="#05060a" stopOpacity="0" /></radialGradient>
        <filter id="sx-glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="7" /></filter>
      </defs>
      <circle cx="400" cy="400" r="340" fill="url(#sx-halo)" />
      <path d="M287 120h226l167 167v226L513 680H287L120 513V287Z" stroke="url(#sx-gate)" strokeWidth="9" opacity=".5" filter="url(#sx-glow)" />
      <path d="M287 120h226l167 167v226L513 680H287L120 513V287Z" stroke="url(#sx-gate)" strokeWidth="2.5" />
      <g transform="rotate(45 400 400)"><rect x="160" y="364" width="480" height="72" rx="14" fill="url(#sx-blade-a)" stroke="#ffb48a" strokeOpacity=".55" /></g>
      <g transform="rotate(-45 400 400)"><rect x="160" y="364" width="480" height="72" rx="14" fill="url(#sx-blade-b)" stroke="#8ef0d4" strokeOpacity=".55" /></g>
      <path d="M262 262 400 400l138-138" stroke="#fff6ee" strokeOpacity=".5" strokeWidth="1.2" />
    </svg>
  </div>;
}
