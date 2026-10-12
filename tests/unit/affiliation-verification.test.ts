import { describe, expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  verificationEmailHtml,
  verificationEmailText,
} from "@/email/affiliation-verification";
import { getAffiliationVerificationConfig } from "@/verification/config";
import {
  createRateLimitKey,
  createVerificationToken,
  hashVerificationToken,
} from "@/verification/security";
import { normalizeInstitutionalEmail } from "@/verification/validation";

describe("affiliation verification primitives", () => {
  test("accepts only an exact configured domain and normalizes case", () => {
    const domains = new Set(["algomau.ca"]);
    expect(normalizeInstitutionalEmail(" Student@AlgomaU.ca ", domains))
      .toBe("student@algomau.ca");
    expect(normalizeInstitutionalEmail("student@sub.algomau.ca", domains)).toBeNull();
    expect(normalizeInstitutionalEmail("student@algomau.ca.example.com", domains)).toBeNull();
    expect(normalizeInstitutionalEmail("student@gmail.com", domains)).toBeNull();
    expect(normalizeInstitutionalEmail("algomau.ca", domains)).toBeNull();
  });

  test("caps link lifetime at 30 minutes and supports configured domains", () => {
    const config = getAffiliationVerificationConfig({
      BETTER_AUTH_SECRET: "a-secure-test-secret-with-at-least-32-characters",
      BETTER_AUTH_URL: "https://talent.example.test/path",
      ALGOMA_APPROVED_EMAIL_DOMAINS: "algomau.ca, students.algoma.test",
      AFFILIATION_VERIFICATION_TTL_MINUTES: "90",
    });
    expect(config.ttlMinutes).toBe(30);
    expect(config.applicationBaseUrl).toBe("https://talent.example.test");
    expect(config.approvedDomains).toEqual(new Set(["algomau.ca", "students.algoma.test"]));
  });

  test("requires an HTTPS public origin in production", () => {
    expect(() => getAffiliationVerificationConfig({
      NODE_ENV: "production",
      BETTER_AUTH_SECRET: "a-secure-test-secret-with-at-least-32-characters",
      BETTER_AUTH_URL: "http://talent.example.test",
    })).toThrow("must use HTTPS");
  });

  test("allows the explicit controlled browser runtime to use loopback HTTP", () => {
    const config = getAffiliationVerificationConfig({
      NODE_ENV: "production",
      IMMXRSIVE_BROWSER_TEST_RUNTIME: "1",
      BETTER_AUTH_SECRET: "a-secure-test-secret-with-at-least-32-characters",
      BETTER_AUTH_URL: "http://127.0.0.1:3100",
    });
    expect(config.applicationBaseUrl).toBe("http://127.0.0.1:3100");
  });

  test("generates high-entropy opaque tokens and stable non-reversible hashes", () => {
    const first = createVerificationToken();
    const second = createVerificationToken();
    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(second).not.toBe(first);
    expect(hashVerificationToken(first)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashVerificationToken(first)).not.toContain(first);
    expect(createRateLimitKey("secret", "action", "student")).not.toContain("student");
  });

  test("builds branded text and HTML without injecting the link as markup", () => {
    const message = {
      to: "student@algomau.ca",
      verifyUrl: "https://example.test/student/verify?token=abc&next=\"bad\"",
      expiresMinutes: 30,
      idempotencyKey: "challenge-id",
    };
    expect(verificationEmailText(message)).toContain("expires in 30 minutes");
    const html = verificationEmailHtml(message);
    expect(html).toContain("IMMXRSIVE");
    expect(html).toContain("&amp;next=&quot;bad&quot;");
    expect(html).not.toContain('next="bad"');
  });
});
