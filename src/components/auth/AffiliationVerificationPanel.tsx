"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import type { StudentVerificationStatus } from "@/verification/service";

import styles from "@/app/student/auth.module.css";

type AffiliationVerificationPanelProps = {
  initialStatus: StudentVerificationStatus;
  token?: string;
};

type Feedback = { tone: "success" | "error" | "info"; message: string } | null;

export function AffiliationVerificationPanel({
  initialStatus,
  token,
}: AffiliationVerificationPanelProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState<"send" | "confirm" | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [status, setStatus] = useState(initialStatus);

  async function requestLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending("send");
    setFeedback(null);
    try {
      const response = await fetch("/api/v1/student/verification/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = await response.json() as { error?: { message?: string } };
      if (!response.ok) throw new Error(body.error?.message || "Unable to send the verification email.");
      setFeedback({
        tone: "success",
        message: "Verification email sent. Check your inbox and open the secure link within 30 minutes.",
      });
    } catch (error) {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "Unable to send the verification email.",
      });
    } finally {
      setPending(null);
    }
  }

  async function confirmLink() {
    if (!token) return;
    setPending("confirm");
    setFeedback(null);
    try {
      const response = await fetch("/api/v1/student/verification/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const body = await response.json() as {
        institutionalEmail?: string;
        verifiedAt?: string;
        error?: { message?: string };
      };
      if (!response.ok) throw new Error(body.error?.message || "Unable to verify this link.");
      setStatus({
        status: "verified",
        institutionalEmail: body.institutionalEmail ?? email,
        verifiedAt: new Date(body.verifiedAt ?? Date.now()),
      });
      setFeedback({ tone: "success", message: "Algoma University affiliation verified." });
      router.replace("/student/verify");
      router.refresh();
    } catch (error) {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "Unable to verify this link.",
      });
    } finally {
      setPending(null);
    }
  }

  if (status.status === "verified") {
    return (
      <div className={styles.verifiedPanel}>
        <p className={styles.statusBadge}>Verified student</p>
        <h2>Affiliation confirmed</h2>
        <p className={styles.identityEmail}>{status.institutionalEmail}</p>
        <p className={styles.cardText}>
          Your verified status is stored with your NOT ImmXrsive account and does
          not need to be repeated when your GitHub session changes.
        </p>
        {feedback ? <FeedbackMessage feedback={feedback} /> : null}
        <Link className={styles.primaryLink} href="/student/dashboard">
          Return to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div>
      {token ? (
        <section className={styles.confirmBox} aria-labelledby="confirm-link-title">
          <p className={styles.statusBadge}>Secure link detected</p>
          <h2 id="confirm-link-title">Confirm this affiliation</h2>
          <p className={styles.cardText}>
            Continue while signed in to the same NOT ImmXrsive account that
            requested this link. Links expire and work only once.
          </p>
          <button type="button" disabled={pending !== null} onClick={confirmLink}>
            {pending === "confirm" ? "Verifying…" : "Verify affiliation"}
          </button>
        </section>
      ) : null}

      <form className={styles.verificationForm} onSubmit={requestLink}>
        <label htmlFor="institutional-email">Algoma University email</label>
        <input
          id="institutional-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@algomau.ca"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={pending !== null}
          required
        />
        <p className={styles.fieldHint}>
          Only the exact <code>algomau.ca</code> domain is accepted. Your GitHub
          email does not verify university affiliation.
        </p>
        <button type="submit" disabled={pending !== null}>
          {pending === "send" ? "Sending…" : "Send verification link"}
        </button>
      </form>
      {feedback ? <FeedbackMessage feedback={feedback} /> : null}
    </div>
  );
}

function FeedbackMessage({ feedback }: { feedback: NonNullable<Feedback> }) {
  return (
    <p
      className={feedback.tone === "error" ? styles.error : styles.success}
      role={feedback.tone === "error" ? "alert" : "status"}
    >
      {feedback.message}
    </p>
  );
}
