"use client";

import Link from "next/link";

import styles from "./inquiry.module.css";

export function InquiryUnavailable() {
  return (
    <InquiryStateShell>
      <section className={styles.stateSection} aria-labelledby="inquiry-unavailable-title">
        <p className={styles.eyebrow}>404 / Context unavailable</p>
        <h1 id="inquiry-unavailable-title">Inquiry source<br /><em>not available.</em></h1>
        <p>The requested public student or project could not be used for an inquiry.</p>
        <div className={styles.stateActions}><Link href="/talent">Return to talent index</Link></div>
      </section>
    </InquiryStateShell>
  );
}

export function InquiryRouteError({ reset }: { reset: () => void }) {
  return (
    <InquiryStateShell>
      <section className={styles.stateSection} aria-labelledby="inquiry-error-title" role="alert">
        <p className={styles.eyebrow}>Connection interrupted</p>
        <h1 id="inquiry-error-title">Inquiry temporarily<br /><em>unavailable.</em></h1>
        <p>We couldn&apos;t validate this inquiry context. Try again or return to the talent index.</p>
        <div className={styles.stateActions}>
          <button type="button" onClick={reset}>Try again</button>
          <Link href="/talent">Return to talent index</Link>
        </div>
      </section>
    </InquiryStateShell>
  );
}

function InquiryStateShell({ children }: { children: React.ReactNode }) {
  return (
    <main className={styles.page}>
      <div className={styles.spatialBackdrop} aria-hidden="true"><span /><span /><span /></div>
      <header className={styles.siteHeader}>
        <Link href="/talent" className={styles.brand} aria-label="ImmXrsive talent directory">IMM<span>X</span>RSIVE</Link>
        <nav aria-label="Primary navigation"><Link href="/talent">Talent</Link></nav>
      </header>
      {children}
    </main>
  );
}
