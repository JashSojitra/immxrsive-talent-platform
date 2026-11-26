import Image from "next/image";
import Link from "next/link";

import styles from "./brand.module.css";

export function BrandLogo({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`${styles.logoLink} ${className}`}
      aria-label="ImmXrsive home"
    >
      <Image
        className={styles.logo}
        src="/branding/immxrsive-logo-reverse.svg"
        alt="ImmXrsive"
        width={404.51}
        height={123.79}
        priority
      />
    </Link>
  );
}

export function ProjectDisclaimer() {
  return (
    <aside className={styles.disclaimer} aria-label="Project status">
      Independent student-built course project. Not an official ImmXrsive or Algoma University service.
    </aside>
  );
}
