import Link from "next/link";

import { InquiryForm } from "./InquiryForm";
import styles from "./inquiry.module.css";

export interface InquirySourceView {
  type: "student" | "project";
  id: string;
  name: string;
  detail: string;
  sourceUrl: string;
}

export function InquiryPage({ source }: { source: InquirySourceView }) {
  const isStudent = source.type === "student";
  return (
    <main className={styles.page} data-motion="stable">
      <a className={styles.skipLink} href="#inquiry-form">Skip to inquiry form</a>
      <div className={styles.spatialBackdrop} aria-hidden="true"><span /><span /><span /></div>
      <header className={styles.siteHeader}>
        <Link href="/talent" className={styles.brand} aria-label="ImmXrsive talent directory">
          IMM<span>X</span>RSIVE
        </Link>
        <nav aria-label="Primary navigation">
          <Link href={source.sourceUrl}>{isStudent ? "Profile" : "Project"}</Link>
          <span aria-current="page">Inquiry</span>
        </nav>
      </header>

      <section className={styles.context} aria-labelledby="inquiry-title">
        <div className={styles.contextIndex}>
          <span>Employer inquiry</span><strong>{source.id}</strong>
        </div>
        <div>
          <p className={styles.eyebrow}>{isStudent ? "Interested in working with" : "Inquiry about"}</p>
          <h1 id="inquiry-title">{source.name}</h1>
          <p className={styles.contextDetail}>{source.detail}</p>
          <p className={styles.lockedContext}>Context locked to this {source.type}. The form cannot redirect the inquiry elsewhere.</p>
        </div>
      </section>

      <section id="inquiry-form" className={styles.formSection} aria-labelledby="form-title">
        <div className={styles.formIntro}>
          <p className={styles.eyebrow}>01 / Your inquiry</p>
          <h2 id="form-title">Start the<br /><em>conversation.</em></h2>
          <p>Four fields, no account required. Required fields are marked in their labels.</p>
        </div>
        <InquiryForm source={{ type: source.type, id: source.id, name: source.name }} />
      </section>
    </main>
  );
}
