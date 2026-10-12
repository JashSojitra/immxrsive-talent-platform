export const GITHUB_PROVIDER_ID = "github" as const;

// GitHub exposes public profile data without repository permissions. Better
// Auth only needs private/primary email access to establish the login identity.
export const GITHUB_OAUTH_SCOPES = ["user:email"] as const;

export const DEFAULT_AUTH_CALLBACK_PATH = "/student/dashboard";

export function normalizeAuthCallbackPath(value: string | null | undefined) {
  if (!value?.startsWith("/") || value.startsWith("//")) {
    return DEFAULT_AUTH_CALLBACK_PATH;
  }

  try {
    const url = new URL(value, "http://immxrsive.local");
    if (url.origin !== "http://immxrsive.local") {
      return DEFAULT_AUTH_CALLBACK_PATH;
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return DEFAULT_AUTH_CALLBACK_PATH;
  }
}
