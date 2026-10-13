import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { isGitHubAuthConfigured } from "@/auth/auth";
import { normalizeAuthCallbackPath } from "@/auth/config";
import { getAuthenticatedUser } from "@/auth/server";
import { GitHubSignInButton } from "@/components/auth/GitHubSignInButton";
import { BrandLogo } from "@/components/brand/BrandLogo";

import styles from "../auth.module.css";

export const metadata: Metadata = {
  title: "Student sign in",
  description: "Secure student access to the independent NOT ImmXrsive talent platform.",
};

type SignInPageProps = {
  searchParams: Promise<{ callbackURL?: string; error?: string }>;
};

export default async function StudentSignInPage({ searchParams }: SignInPageProps) {
  const [{ callbackURL, error }, user] = await Promise.all([
    searchParams,
    getAuthenticatedUser(),
  ]);
  const safeCallbackURL = normalizeAuthCallbackPath(callbackURL);
  if (user) redirect(safeCallbackURL);

  return (
    <div className={styles.shell}>
      <nav className={styles.nav} aria-label="Student access">
        <BrandLogo className={styles.brand} />
        <Link className={styles.backLink} href="/talent">Explore public talent</Link>
      </nav>
      <main className={styles.main}>
        <section aria-labelledby="student-access-title">
          <p className={styles.eyebrow}>Student access / Release 2</p>
          <h1 className={styles.headline} id="student-access-title">
            Your work.<br /><em>Your identity.</em>
          </h1>
          <p className={styles.intro}>
            Sign in with GitHub to establish your private NOT ImmXrsive account.
            Public talent discovery and employer inquiries remain open to everyone.
          </p>
        </section>

        <section className={styles.card} aria-labelledby="github-sign-in-title">
          <p className={styles.eyebrow}>Secure account</p>
          <h2 id="github-sign-in-title">Continue as a student</h2>
          <p className={styles.cardText}>
            GitHub verifies your sign-in. NOT ImmXrsive assigns a separate internal
            identity that remains stable if your GitHub username changes.
          </p>
          {error ? (
            <p className={styles.error} role="alert">
              GitHub sign-in was not completed. No account changes were made.
            </p>
          ) : null}
          <GitHubSignInButton
            callbackURL={safeCallbackURL}
            configured={isGitHubAuthConfigured}
          />
          {!isGitHubAuthConfigured ? (
            <p className={styles.configuration} id="github-configuration-note">
              GitHub OAuth is not configured in this environment yet.
            </p>
          ) : null}
          <p className={styles.privacy}>
            Login requests email access only. NOT ImmXrsive does not request access
            to write to your repositories.
          </p>
        </section>
      </main>
    </div>
  );
}
