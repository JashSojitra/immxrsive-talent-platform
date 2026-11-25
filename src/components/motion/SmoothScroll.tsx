"use client";
import { ReactLenis } from "lenis/react";
import "lenis/dist/lenis.css";
import { useEffect, useState } from "react";

/**
 * Lenis inertial wheel scrolling for scroll-storytelling pages (currently the homepage only).
 * Not mounted for reduced motion or coarse pointers. Touch, keyboard, scrollbar, find-in-page
 * and the native skip link stay native (`anchors: false`, `syncTouch: false`). Lenis's stylesheet
 * disables iframe pointer events while smoothing, so do not mount it on pages with embedded demos.
 * Elements with `data-lenis-prevent` (dialogs, nested scrollers) keep native scrolling.
 */
export function SmoothScroll() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: no-preference) and (pointer: fine)");
    const update = () => setEnabled(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  if (!enabled) return null;
  return <ReactLenis root options={{ lerp: 0.11, wheelMultiplier: 0.95, anchors: false, syncTouch: false, autoToggle: true, allowNestedScroll: true }} />;
}
