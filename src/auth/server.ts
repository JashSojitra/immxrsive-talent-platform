import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getAuth, isGitHubAuthConfigured } from "@/auth/auth";
import { normalizeAuthCallbackPath } from "@/auth/config";
import { getRuntimeDatabase } from "@/db/runtime";
import {
  getStudentVerificationStatus as queryStudentVerificationStatus,
} from "@/verification/service";

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

export class AffiliationVerificationRequiredError extends Error {
  readonly status = 403;

  constructor() {
    super("Verified student affiliation required.");
    this.name = "AffiliationVerificationRequiredError";
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

export async function getStudentVerificationStatus(userId: string) {
  return queryStudentVerificationStatus(getRuntimeDatabase(), userId);
}

export async function requireVerifiedStudent(
  callbackPath = "/student/dashboard",
) {
  const user = await requireAuthenticatedUser(callbackPath);
  const affiliation = await getStudentVerificationStatus(user.id);
  if (affiliation.status !== "verified") {
    redirect(`/student/verify?callbackURL=${encodeURIComponent(callbackPath)}`);
  }
  return { user, affiliation };
}

export async function requireVerifiedRequestStudent(request: Request) {
  const user = await requireAuthenticatedRequestUser(request);
  const affiliation = await getStudentVerificationStatus(user.id);
  if (affiliation.status !== "verified") {
    throw new AffiliationVerificationRequiredError();
  }
  return { user, affiliation };
}
