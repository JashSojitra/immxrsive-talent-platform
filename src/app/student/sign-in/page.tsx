import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { isGitHubAuthConfigured } from "@/auth/auth";
import { normalizeAuthCallbackPath } from "@/auth/config";
import { getAuthenticatedUser } from "@/auth/server";
import { GitHubSignInButton } from "@/components/auth/GitHubSignInButton";

import styles from "../auth.module.css";

export const metadata: Metadata = {
  title: "Student sign in",
  description: "Secure student access to the independent ImmXrsive talent platform.",
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
        <Link className={styles.backLink} href="/talent">Explore public talent</Link>
      </nav>
      <main className={styles.main}>
        <section aria-labelledby="student-access-title">
          <p className={`ui-eyebrow ${styles.eyebrow}`}>Student access</p>
          <h1 className={`ui-display ${styles.headline}`} id="student-access-title">
            Your work.<br /><em className="ui-display-accent">Your identity.</em>
          </h1>
          <p className={styles.intro}>
            Sign in with GitHub to create or return to your private student workspace.
            Public talent discovery and employer inquiries remain open to everyone.
          </p>
        </section>

        <section className={styles.card} aria-labelledby="github-sign-in-title">
          <p className={`ui-eyebrow ${styles.eyebrow}`}>Secure account</p>
          <h2 id="github-sign-in-title">Continue as a student</h2>
          <p className={styles.cardText}>
            One account for your profile, projects and collaborations.
            Verify your Algoma affiliation after signing in to access student features.
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
            Login requests email access only. ImmXrsive does not request access
            to write to your repositories.
          </p>
        </section>
      </main>
    </div>
  );
}
