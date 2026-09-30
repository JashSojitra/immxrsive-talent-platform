import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import styles from "@/components/student-profile/student-profile.module.css";
import { getPublicStudentProfile } from "@/db/public-student-profile";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Employer inquiry",
  description: "Student-specific employer inquiry handoff for ImmXrsive.",
  robots: { index: false, follow: false },
};

export default async function StudentInquiryPlaceholder({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  const profile = await getPublicStudentProfile(studentId);
  if (!profile) notFound();

  return (
    <main className={styles.page}>
      <div className={styles.spatialBackdrop} aria-hidden="true"><span /><span /><span /></div>
      <header className={styles.siteHeader}>
        <Link href="/talent" className={styles.brand} aria-label="ImmXrsive talent directory">
          IMM<span>X</span>RSIVE
        </Link>
        <nav aria-label="Primary navigation"><Link href={`/students/${profile.id}`}>Profile</Link></nav>
      </header>
      <section className={styles.inquirySection} aria-labelledby="inquiry-placeholder-title">
        <p className={styles.chapter}>Employer inquiry / {profile.id}</p>
        <h1 id="inquiry-placeholder-title" className={styles.stateTitle}>Inquiry for<br /><em>{profile.name}.</em></h1>
        <p>The complete employer inquiry form will be introduced in M6. This handoff safely preserves the selected student.</p>
        <Link className={styles.inquiryCta} href={`/students/${profile.id}`}>
          Return to {profile.name}&apos;s profile <span aria-hidden="true">↗</span>
        </Link>
      </section>
    </main>
  );
}
