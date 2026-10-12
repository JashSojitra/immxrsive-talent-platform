"use client";

import { useState } from "react";

import { authClient } from "@/auth/client";
import { GITHUB_PROVIDER_ID } from "@/auth/config";

type GitHubSignInButtonProps = {
  callbackURL: string;
  configured: boolean;
};

export function GitHubSignInButton({ callbackURL, configured }: GitHubSignInButtonProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSignIn() {
    setError(null);
    setIsPending(true);

    try {
      const result = await authClient.signIn.social({
        provider: GITHUB_PROVIDER_ID,
        callbackURL,
        errorCallbackURL: "/student/sign-in?error=oauth",
      });

      if (result.error) {
        setError("GitHub sign-in could not be started. Please try again.");
        setIsPending(false);
      }
    } catch {
      setError("GitHub sign-in could not be started. Please try again.");
      setIsPending(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleSignIn}
        disabled={!configured || isPending}
        aria-describedby={!configured ? "github-configuration-note" : undefined}
      >
        <GitHubMark />
        <span>{isPending ? "Connecting…" : "Continue with GitHub"}</span>
      </button>
      {error ? <p role="alert">{error}</p> : null}
    </div>
  );
}

function GitHubMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M12 .8a11.4 11.4 0 0 0-3.6 22.2c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.4-4-1.4-.5-1.4-1.3-1.8-1.3-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.6-.3-5.4-1.3-5.4-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.1 1.2a10.7 10.7 0 0 1 5.7 0C16.7 4.7 17.7 5 17.7 5c.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.4 5.7.4.4.8 1.1.8 2.2v3.3c0 .4.2.7.8.6A11.4 11.4 0 0 0 12 .8Z"
      />
    </svg>
  );
}
