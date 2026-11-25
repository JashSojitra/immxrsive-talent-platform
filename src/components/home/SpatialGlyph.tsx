import type { CSSProperties } from "react";
import styles from "./home.module.css";

/** Deterministic 0..1 values from an id, so each record gets a stable, original composition. */
export function seeded(id: string, count: number) {
  let h = 2166136261;
  for (const char of id) h = Math.imul(h ^ char.charCodeAt(0), 16777619);
  return Array.from({ length: count }, (_, index) => {
    h = Math.imul(h ^ (h >>> 15), 2246822507 + index);
    return ((h >>> 0) % 1000) / 1000;
  });
}

/**
 * Procedural "spatial study" for a project: stacked translucent planes in 3D whose rotation,
 * spacing and light balance derive from the project id. Decorative, CSS-only, no image assets.
 */
export function SpatialGlyph({ id, label }: { id: string; label: string }) {
  const [a, b, c, d] = seeded(id, 4);
  const style = {
    "--g-rot": `${Math.round(a * 50 - 25)}deg`,
    "--g-tilt": `${Math.round(48 + b * 18)}deg`,
    "--g-gap": `${Math.round(26 + c * 22)}px`,
    "--g-mix": `${Math.round(20 + d * 60)}%`,
  } as CSSProperties;
  return <div className={styles.glyph} style={style} aria-hidden="true">
    <div className={styles.glyphStack}>
      {[0, 1, 2, 3].map(layer => <span key={layer} className={styles.glyphPlane} style={{ "--layer": layer } as CSSProperties} />)}
    </div>
    <span className={styles.glyphLabel}>{label}</span>
  </div>;
}
