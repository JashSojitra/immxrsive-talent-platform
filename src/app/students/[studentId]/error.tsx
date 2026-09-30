"use client";

import Link from "next/link";

import styles from "@/components/student-profile/student-profile.module.css";

export default function StudentProfileError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className={styles.page}>
      <div className={styles.spatialBackdrop} aria-hidden="true"><span /><span /><span /></div>
      <header className={styles.siteHeader}>
        <Link href="/talent" className={styles.brand} aria-label="ImmXrsive talent directory">
          IMM<span>X</span>RSIVE
        </Link>
        <nav aria-label="Primary navigation"><Link href="/talent">Talent</Link></nav>
      </header>
      <section className={styles.inquirySection} aria-labelledby="profile-error-title" role="alert">
        <p className={styles.chapter}>Connection interrupted</p>
        <h1 id="profile-error-title" className={styles.stateTitle}>Profile temporarily<br /><em>unavailable.</em></h1>
        <p>We couldn&apos;t load this profile right now. Try the database request again or return to the talent index.</p>
        <div className={styles.stateActions}>
          <button className={styles.inquiryCta} type="button" onClick={reset}>Try again <span aria-hidden="true">↻</span></button>
          <Link href="/talent">Return to talent index</Link>
        </div>
      </section>
    </main>
  );
}
