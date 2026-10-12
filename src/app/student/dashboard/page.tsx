import type { Metadata } from "next";
import Link from "next/link";

import {
  getInternalUserId,
  getStudentVerificationStatus,
  requireAuthenticatedUser,
} from "@/auth/server";
import { SignOutButton } from "@/components/auth/SignOutButton";

import styles from "../auth.module.css";

export const metadata: Metadata = {
  title: "Student dashboard",
  description: "Private student account foundation for ImmXrsive.",
};

export const dynamic = "force-dynamic";

export default async function StudentDashboardPage() {
  const user = await requireAuthenticatedUser("/student/dashboard");
  const verification = await getStudentVerificationStatus(user.id);

  return (
    <div className={styles.shell}>
      <nav className={styles.nav} aria-label="Student dashboard">
        <Link className={styles.brand} href="/talent">IMMXRSIVE</Link>
        <Link className={styles.backLink} href="/talent">View public talent</Link>
      </nav>
      <main className={styles.main}>
        <section aria-labelledby="dashboard-title">
          <p className={styles.eyebrow}>Private student workspace</p>
          <h1 className={styles.headline} id="dashboard-title">
            Welcome to<br /><em>your space.</em>
          </h1>
          <p className={styles.intro}>
            This authenticated foundation will become the place to draft and
            manage your student profile in later Release 2 milestones.
          </p>
        </section>

        <section className={styles.card} aria-labelledby="account-title">
          <p className={styles.eyebrow}>Signed in securely</p>
          <h2 id="account-title">Account identity</h2>
          <p className={styles.identityName}>{user.name}</p>
          <p className={styles.identityEmail}>{user.email}</p>
          <p className={styles.identityMeta}>
            Internal user ID<br /><code>{getInternalUserId(user)}</code>
          </p>
          {verification.status === "verified" ? (
            <div className={styles.verifiedNotice}>
              <strong>Algoma affiliation verified</strong>
              <p>{verification.institutionalEmail}</p>
            </div>
          ) : (
            <div className={styles.notice}>
              <strong>Affiliation not yet verified</strong>
              <p>
                Confirm an Algoma University email before using verified-student
                profile features.
              </p>
              <Link className={styles.inlineLink} href="/student/verify">
                Verify affiliation
              </Link>
            </div>
          )}
          <SignOutButton />
        </section>
      </main>
    </div>
  );
}
