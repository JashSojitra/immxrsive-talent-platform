import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getAuth, isGitHubAuthConfigured } from "@/auth/auth";
import { normalizeAuthCallbackPath } from "@/auth/config";

type AuthInstance = ReturnType<typeof getAuth>;
type SessionResult = Awaited<ReturnType<AuthInstance["api"]["getSession"]>>;
export type AuthenticatedUser = NonNullable<SessionResult>["user"];

export class AuthenticationRequiredError extends Error {
  readonly status = 401;

  constructor() {
    super("Authentication required.");
    this.name = "AuthenticationRequiredError";
  }
}

export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  if (!isGitHubAuthConfigured) return null;
  const session = await getAuth().api.getSession({ headers: await headers() });
  return session?.user ?? null;
}

export async function getAuthenticatedRequestUser(
  request: Request,
): Promise<AuthenticatedUser | null> {
  if (!isGitHubAuthConfigured) return null;
  const session = await getAuth().api.getSession({ headers: request.headers });
  return session?.user ?? null;
}

export async function requireAuthenticatedUser(
  callbackPath = "/student/dashboard",
): Promise<AuthenticatedUser> {
  const user = await getAuthenticatedUser();
  if (!user) {
    const safeCallbackPath = normalizeAuthCallbackPath(callbackPath);
    redirect(`/student/sign-in?callbackURL=${encodeURIComponent(safeCallbackPath)}`);
  }
  return user;
}

export async function requireAuthenticatedRequestUser(
  request: Request,
): Promise<AuthenticatedUser> {
  const user = await getAuthenticatedRequestUser(request);
  if (!user) throw new AuthenticationRequiredError();
  return user;
}

export function getInternalUserId(user: AuthenticatedUser) {
  return user.id;
}
