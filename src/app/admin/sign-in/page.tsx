import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/auth/server";
import { isGitHubAuthConfigured } from "@/auth/auth";
import { normalizeAuthCallbackPath } from "@/auth/config";
import { GitHubSignInButton } from "@/components/auth/GitHubSignInButton";
import { AdminShell } from "@/admin/AdminShell";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Administrator sign in", robots: { index: false, follow: false } };
export default async function AdminSignIn({ searchParams }: { searchParams: Promise<{ callbackURL?: string; error?: string }> }) {
  const query = await searchParams;
  const candidate = normalizeAuthCallbackPath(query.callbackURL);
  const callbackURL = (candidate === "/admin" || candidate.startsWith("/admin/")) && !candidate.startsWith("/admin/sign-in") ? candidate : "/admin";
  if (await getAuthenticatedUser()) redirect(callbackURL);
  return <AdminShell title="Administrator sign in" role="secure staff access"><p>Use your existing GitHub-backed ImmXrsive account. Administrator access is assigned separately by a platform super administrator. Student affiliation verification is not required for staff access.</p>{query.error && <p role="alert">Sign-in was not completed. Try again.</p>}<GitHubSignInButton configured={isGitHubAuthConfigured} callbackURL={callbackURL} errorCallbackURL="/admin/sign-in?error=oauth" />{!isGitHubAuthConfigured && <p id="github-configuration-note">GitHub sign-in is not configured in this environment. An operator must configure the existing authentication settings.</p>}</AdminShell>;
}
