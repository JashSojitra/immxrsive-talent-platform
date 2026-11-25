"use client";

import { motion, useMotionValue, useReducedMotion, useSpring, useTransform, type MotionValue } from "motion/react";
import { useRef, type ReactNode } from "react";

import styles from "./world.module.css";

export type DockItem = {
  id: string;
  label: string;
  icon: ReactNode;
  onClick: () => void;
  active?: boolean;
  expanded?: boolean;
  controls?: string;
};

const BASE = 46;
const MAX = 66;
const REACH = 140;

/**
 * Magnetic dock: items swell as the pointer approaches, macOS-style.
 * Native take on the "Magnetic Dock" idea from Componentry (MIT, componentry.dev), rebuilt with
 * Motion + CSS modules. Touch devices and reduced motion get a static dock.
 */
export function WorldDock({ items, magnetic }: { items: DockItem[]; magnetic: boolean }) {
  const mouseX = useMotionValue(Number.POSITIVE_INFINITY);
  const reduce = useReducedMotion();
  const live = magnetic && !reduce;
  return (
    <nav
      className={styles.dock}
      aria-label="World controls"
      data-magnetic={live || undefined}
      onPointerMove={event => { if (live && event.pointerType === "mouse") mouseX.set(event.clientX); }}
      onPointerLeave={() => mouseX.set(Number.POSITIVE_INFINITY)}
    >
      {items.map(item => <DockButton key={item.id} item={item} mouseX={mouseX} live={live} />)}
    </nav>
  );
}

function DockButton({ item, mouseX, live }: { item: DockItem; mouseX: MotionValue<number>; live: boolean }) {
  const ref = useRef<HTMLButtonElement>(null);
  const distance = useTransform(mouseX, x => {
    const rect = ref.current?.getBoundingClientRect();
    return rect ? x - (rect.left + rect.width / 2) : Number.POSITIVE_INFINITY;
  });
  const target = useTransform(distance, [-REACH, 0, REACH], [BASE, MAX, BASE], { clamp: true });
  const size = useSpring(target, { mass: 0.12, stiffness: 180, damping: 14 });
  const lift = useTransform(size, [BASE, MAX], [0, -8]);
  return (
    <motion.button
      ref={ref}
      type="button"
      className={styles.dockItem}
      style={live ? { width: size, height: size, y: lift } : undefined}
      onClick={item.onClick}
      aria-pressed={item.expanded === undefined ? item.active : undefined}
      aria-expanded={item.expanded}
      aria-controls={item.controls}
      data-active={item.active || item.expanded || undefined}
    >
      <span className={styles.dockIcon} aria-hidden="true">{item.icon}</span>
      <span className={styles.dockLabel}>{item.label}</span>
    </motion.button>
  );
}

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export const DockIcons = {
  places: <svg viewBox="0 0 24 24" {...stroke}><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" /><circle cx="12" cy="10" r="2.4" /></svg>,
  map: <svg viewBox="0 0 24 24" {...stroke}><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.6 2.4 3.9 5.2 3.9 8.5s-1.3 6.1-3.9 8.5c-2.6-2.4-3.9-5.2-3.9-8.5s1.3-6.1 3.9-8.5Z" /></svg>,
  tour: <svg viewBox="0 0 24 24" {...stroke}><path d="M8 5.5v13l10.5-6.5L8 5.5Z" /></svg>,
  stop: <svg viewBox="0 0 24 24" {...stroke}><rect x="6.5" y="6.5" width="11" height="11" rx="2" /></svg>,
  list: <svg viewBox="0 0 24 24" {...stroke}><path d="M9 6.5h10M9 12h10M9 17.5h10" /><circle cx="5" cy="6.5" r=".9" /><circle cx="5" cy="12" r=".9" /><circle cx="5" cy="17.5" r=".9" /></svg>,
  help: <svg viewBox="0 0 24 24" {...stroke}><circle cx="12" cy="12" r="8.5" /><path d="M9.7 9.4a2.4 2.4 0 1 1 3.4 2.2c-.7.3-1.1.9-1.1 1.6v.4" /><circle cx="12" cy="16.6" r=".6" /></svg>,
};
