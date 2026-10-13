import Image from "next/image";
import Link from "next/link";

import styles from "./brand.module.css";

export function BrandLogo({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/talent"
      className={`${styles.logoLink} ${className}`}
      aria-label="NOT ImmXrsive talent directory home"
    >
      <Image
        className={styles.logo}
        src="/branding/not-immxrsive-logo.png"
        alt="NOT ImmXrsive"
        width={2_000}
        height={2_000}
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
