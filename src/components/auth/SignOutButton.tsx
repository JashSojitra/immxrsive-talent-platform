"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { authClient } from "@/auth/client";

export function SignOutButton() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSignOut() {
    setError(null);
    setIsPending(true);

    try {
      const result = await authClient.signOut();
      if (result.error) {
        setError("Sign out failed. Please try again.");
        setIsPending(false);
        return;
      }
      router.replace("/student/sign-in");
      router.refresh();
    } catch {
      setError("Sign out failed. Please try again.");
      setIsPending(false);
    }
  }

  return (
    <div>
      <button type="button" onClick={handleSignOut} disabled={isPending}>
        {isPending ? "Signing out…" : "Sign out"}
      </button>
      {error ? <p role="alert">{error}</p> : null}
    </div>
  );
}
