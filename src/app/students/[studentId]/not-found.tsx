import Link from "next/link";

import styles from "@/components/student-profile/student-profile.module.css";

export default function StudentProfileNotFound() {
  return (
    <main className={styles.page}>
      <div className={styles.spatialBackdrop} aria-hidden="true"><span /><span /><span /></div>
      <header className={styles.siteHeader}>
        <Link href="/talent" className={styles.brand} aria-label="ImmXrsive talent directory">
          IMM<span>X</span>RSIVE
        </Link>
        <nav aria-label="Primary navigation"><Link href="/talent">Talent</Link></nav>
      </header>
      <section className={styles.inquirySection} aria-labelledby="not-found-title">
        <p className={styles.chapter}>404 / No public signal</p>
        <h1 id="not-found-title" className={styles.stateTitle}>Student profile<br /><em>not available.</em></h1>
        <p>The requested profile is not publicly available. Discover published talent in the directory.</p>
        <Link className={styles.inquiryCta} href="/talent">
          Return to talent index <span aria-hidden="true">↗</span>
        </Link>
      </section>
    </main>
  );
}
