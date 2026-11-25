"use client";
import { useEffect, useRef, type CSSProperties } from "react";
import styles from "./motion.module.css";

/**
 * Pointer-proximity kinetic type. Each glyph receives `--k` (0..1) from its distance to a fine
 * pointer; motion.module.css maps it onto the variable font's width/weight axes with a spring
 * easing. One listener on the nearest `[data-kinetic-field]` (or the element), rAF-batched,
 * no React re-renders. Inactive for touch and reduced motion. Screen readers get the whole string.
 */
export function KineticText({ text, className = "", radius = 160 }: { text: string; className?: string; radius?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root || !window.matchMedia("(pointer: fine) and (prefers-reduced-motion: no-preference)").matches) return;
    const glyphs = Array.from(root.querySelectorAll<HTMLElement>("[data-glyph]"));
    const field = root.closest<HTMLElement>("[data-kinetic-field]") ?? root;
    let centers: Array<{ x: number; y: number }> = [];
    let px = -1e4, py = -1e4, frame = 0;
    const measure = () => {
      centers = glyphs.map(glyph => {
        const rect = glyph.getBoundingClientRect();
        return { x: rect.left + rect.width / 2 + window.scrollX, y: rect.top + rect.height / 2 + window.scrollY };
      });
    };
    const apply = () => {
      frame = 0;
      glyphs.forEach((glyph, index) => {
        const center = centers[index];
        const k = center ? Math.max(0, 1 - Math.hypot(center.x - px, center.y - py) / radius) : 0;
        glyph.style.setProperty("--k", (k * k * (3 - 2 * k)).toFixed(3));
      });
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(apply); };
    const onMove = (event: PointerEvent) => { if (event.pointerType !== "mouse") return; px = event.pageX; py = event.pageY; schedule(); };
    const onLeave = () => { px = py = -1e4; schedule(); };
    measure();
    const resize = new ResizeObserver(measure);
    resize.observe(root);
    field.addEventListener("pointerenter", measure);
    field.addEventListener("pointermove", onMove);
    field.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      field.removeEventListener("pointerenter", measure);
      field.removeEventListener("pointermove", onMove);
      field.removeEventListener("pointerleave", onLeave);
    };
  }, [text, radius]);
  return <span ref={ref} className={`${styles.kinetic} ${className}`}>
    <span className="ui-visually-hidden">{text}</span>
    <span aria-hidden="true">{Array.from(text).map((glyph, index) => <span key={index} data-glyph="" className={styles.glyph} style={{ "--i": index } as CSSProperties}>{glyph === " " ? " " : glyph}</span>)}</span>
  </span>;
}
