"use client";
import { useEffect, useRef, type ReactNode } from "react";
import styles from "./project-detail.module.css";
export function ProjectDetailMotion({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => { if (ref.current) ref.current.dataset.motion = media.matches ? "reduced" : "ready"; };
    update(); media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return <main ref={ref} className={styles.page} data-motion="ready">{children}</main>;
}
