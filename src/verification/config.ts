const DEFAULT_APPROVED_DOMAIN = "algomau.ca";
const DEFAULT_TTL_MINUTES = 30;
const MAX_TTL_MINUTES = 30;

export type AffiliationVerificationConfig = {
  approvedDomains: ReadonlySet<string>;
  ttlMinutes: number;
  applicationBaseUrl: string;
  rateLimitSecret: string;
};

export function getAffiliationVerificationConfig(
  environment: Record<string, string | undefined> = process.env,
): AffiliationVerificationConfig {
  const approvedDomains = new Set(
    (environment.ALGOMA_APPROVED_EMAIL_DOMAINS ?? DEFAULT_APPROVED_DOMAIN)
      .split(",")
      .map((domain) => domain.trim().toLowerCase())
      .filter(Boolean),
  );
  if (approvedDomains.size === 0) approvedDomains.add(DEFAULT_APPROVED_DOMAIN);

  const requestedTtl = Number(
    environment.AFFILIATION_VERIFICATION_TTL_MINUTES ?? DEFAULT_TTL_MINUTES,
  );
  const ttlMinutes = Number.isFinite(requestedTtl)
    ? Math.max(1, Math.min(MAX_TTL_MINUTES, Math.floor(requestedTtl)))
    : DEFAULT_TTL_MINUTES;

  const isControlledBrowserRuntime = environment.IMMXRSIVE_BROWSER_TEST_RUNTIME === "1";
  if (environment.NODE_ENV === "production" && !isControlledBrowserRuntime
    && !environment.BETTER_AUTH_URL) {
    throw new Error("BETTER_AUTH_URL is required for production verification links.");
  }
  const applicationUrl = new URL(
    environment.BETTER_AUTH_URL ?? "http://localhost:3000",
  );
  if (environment.NODE_ENV === "production" && !isControlledBrowserRuntime
    && applicationUrl.protocol !== "https:") {
    throw new Error("BETTER_AUTH_URL must use HTTPS in production.");
  }
  const applicationBaseUrl = applicationUrl.origin;
  const rateLimitSecret = environment.BETTER_AUTH_SECRET;
  if (!rateLimitSecret || rateLimitSecret.length < 32) {
    throw new Error("BETTER_AUTH_SECRET must be configured for affiliation verification.");
  }

  return {
    approvedDomains,
    ttlMinutes,
    applicationBaseUrl,
    rateLimitSecret,
  };
}
