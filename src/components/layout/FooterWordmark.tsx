import { KineticText } from "@/components/motion/KineticText";
import styles from "./site.module.css";

/** Oversized kinetic wordmark. Decorative: the brand is already named by the header and footer text. */
export function FooterWordmark() {
  return <div className={styles.footerWordmark} data-kinetic-field="" aria-hidden="true">
    <KineticText text="ImmXrsive" radius={260} />
  </div>;
}
