"use client";
import { animate, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";

/** Counts from 0 to a real value once visible. The final value is server-rendered text. */
export function CountUp({ value, pad = 2 }: { value: number; pad?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const reduce = useReducedMotion();
  const format = (n: number) => String(Math.round(n)).padStart(pad, "0");
  useEffect(() => {
    if (!inView || reduce || !ref.current || value === 0) return;
    const node = ref.current;
    const controls = animate(0, value, { duration: 1.4, ease: [0.32, 0.72, 0, 1], onUpdate: v => { node.textContent = format(v); } });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, reduce, value]);
  return <span ref={ref}>{format(value)}</span>;
}
