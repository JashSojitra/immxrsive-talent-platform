import type { Metadata } from "next";
import Link from "next/link";

import {
  getStudentVerificationStatus,
  requireAuthenticatedUser,
} from "@/auth/server";
import { AffiliationVerificationPanel } from "@/components/auth/AffiliationVerificationPanel";

import styles from "../auth.module.css";

export const metadata: Metadata = {
  title: "Verify student affiliation",
  description: "Confirm an Algoma University email for student access.",
};

export const dynamic = "force-dynamic";

type VerifyPageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function StudentVerifyPage({ searchParams }: VerifyPageProps) {
  const user = await requireAuthenticatedUser("/student/verify");
  const [{ token }, status] = await Promise.all([
    searchParams,
    getStudentVerificationStatus(user.id),
  ]);

  return (
    <div className={styles.shell}>
      <nav className={styles.nav} aria-label="Student verification">
        <Link className={styles.brand} href="/talent">IMMXRSIVE</Link>
        <Link className={styles.backLink} href="/student/dashboard">Dashboard</Link>
      </nav>
      <main className={styles.main}>
        <section aria-labelledby="verification-title">
          <p className={styles.eyebrow}>Student access / Affiliation</p>
          <h1 className={styles.headline} id="verification-title">
            Verify your<br /><em>Algoma connection.</em>
          </h1>
          <p className={styles.intro}>
            Signed in as <strong>{user.name}</strong> ({user.email}). Confirm a
            university-owned email before accessing verified-student features.
          </p>
        </section>

        <section className={styles.card} aria-label="Affiliation verification">
          <AffiliationVerificationPanel
            initialStatus={status}
            token={typeof token === "string" ? token : undefined}
          />
        </section>
      </main>
    </div>
  );
}
