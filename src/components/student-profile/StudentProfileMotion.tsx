"use client";
import { useEffect, useRef, type ReactNode } from "react";
import styles from "./student-profile.module.css";
declare global { interface Window { __IMMXRSIVE_DISABLE_MOTION__?: boolean; } }
export function StudentProfileMotion({ children, preset }: { children: ReactNode; preset: "spatial" | "editorial" | "minimal" }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => { if (ref.current) ref.current.dataset.motion = media.matches ? "reduced" : "ready"; };
    update(); media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return <main ref={ref} className={styles.page} data-motion="ready" data-preset={preset} id="profile-content">{children}</main>;
}
