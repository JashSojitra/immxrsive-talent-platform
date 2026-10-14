import { describe, expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  getConfiguredVerificationMailer,
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
    const text = verificationEmailText(message);
    expect(text).toContain("expires in 30 minutes");
    const html = verificationEmailHtml(message);
    expect(html).toContain("NOT IMMXRSIVE");
    expect(html).toContain("Independent student-built course project");
    expect(text).toContain("Not an official ImmXrsive or Algoma University service");
    expect(html).toContain("&amp;next=&quot;bad&quot;");
    expect(html).not.toContain('next="bad"');
  });

  test("selects Gmail without falling through and sends from the configured account", async () => {
    const sendMail = vi.fn(async () => ({ accepted: ["student@algomau.ca"], rejected: [] }));
    const createGmailTransport = vi.fn(() => ({ sendMail }));
    const createResendClient = vi.fn(() => ({
      emails: { send: vi.fn(async () => ({ error: null })) },
    }));
    const mailer = getConfiguredVerificationMailer({
      EMAIL_PROVIDER: "gmail",
      GMAIL_SMTP_USER: "sender@gmail.com",
      GMAIL_SMTP_APP_PASSWORD: "test-app-password",
      RESEND_API_KEY: "unused-resend-key",
      AFFILIATION_EMAIL_FROM: "Unused <unused@example.test>",
    }, { createGmailTransport, createResendClient });

    expect(mailer).not.toBeNull();
    expect(createGmailTransport).toHaveBeenCalledWith(expect.objectContaining({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: "sender@gmail.com", pass: "test-app-password" },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    }));
    expect(createResendClient).not.toHaveBeenCalled();

    await mailer?.sendVerificationEmail({
      to: "student@algomau.ca",
      verifyUrl: "https://talent.example.test/student/verify?token=test-token",
      expiresMinutes: 30,
      idempotencyKey: "challenge-id",
    });
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
      from: { name: "NOT ImmXrsive", address: "sender@gmail.com" },
      to: "student@algomau.ca",
      envelope: { from: "sender@gmail.com", to: "student@algomau.ca" },
      subject: "Verify your Algoma University affiliation",
      text: expect.stringContaining("expires in 30 minutes"),
      html: expect.stringContaining("NOT IMMXRSIVE"),
      disableFileAccess: true,
      disableUrlAccess: true,
    }));
  });

  test("fails closed for missing or unknown provider configuration", () => {
    const factories = {
      createGmailTransport: vi.fn(() => ({ sendMail: vi.fn() })),
      createResendClient: vi.fn(() => ({
        emails: { send: vi.fn(async () => ({ error: null })) },
      })),
    };
    expect(getConfiguredVerificationMailer({
      EMAIL_PROVIDER: "gmail",
      GMAIL_SMTP_USER: "sender@gmail.com",
    }, factories)).toBeNull();
    expect(getConfiguredVerificationMailer({
      EMAIL_PROVIDER: "unsupported",
      GMAIL_SMTP_USER: "sender@gmail.com",
      GMAIL_SMTP_APP_PASSWORD: "secret",
      RESEND_API_KEY: "resend-key",
      AFFILIATION_EMAIL_FROM: "Sender <sender@example.test>",
    }, factories)).toBeNull();
    expect(factories.createGmailTransport).not.toHaveBeenCalled();
    expect(factories.createResendClient).not.toHaveBeenCalled();
  });

  test("uses Resend only when selected and preserves its configured sender", async () => {
    const resendSend = vi.fn(async () => ({ error: null }));
    const createGmailTransport = vi.fn(() => ({ sendMail: vi.fn() }));
    const createResendClient = vi.fn(() => ({ emails: { send: resendSend } }));
    const mailer = getConfiguredVerificationMailer({
      EMAIL_PROVIDER: "resend",
      RESEND_API_KEY: "resend-key",
      AFFILIATION_EMAIL_FROM: "NOT ImmXrsive <verify@example.test>",
      GMAIL_SMTP_USER: "unused@gmail.com",
      GMAIL_SMTP_APP_PASSWORD: "unused-password",
    }, { createGmailTransport, createResendClient });

    await mailer?.sendVerificationEmail({
      to: "student@algomau.ca",
      verifyUrl: "https://talent.example.test/student/verify?token=test-token",
      expiresMinutes: 30,
      idempotencyKey: "challenge-id",
    });
    expect(createResendClient).toHaveBeenCalledWith("resend-key");
    expect(createGmailTransport).not.toHaveBeenCalled();
    expect(resendSend).toHaveBeenCalledWith(expect.objectContaining({
      from: "NOT ImmXrsive <verify@example.test>",
      to: "student@algomau.ca",
    }), { idempotencyKey: "challenge-id" });
  });

  test("returns a sanitized error when Gmail rejects or times out", async () => {
    const secret = "private-app-password";
    const mailer = getConfiguredVerificationMailer({
      EMAIL_PROVIDER: "gmail",
      GMAIL_SMTP_USER: "sender@gmail.com",
      GMAIL_SMTP_APP_PASSWORD: secret,
    }, {
      createGmailTransport: () => ({
        sendMail: vi.fn(async () => {
          throw new Error(`Authentication failed for ${secret} at smtp.gmail.com`);
        }),
      }),
      createResendClient: vi.fn(() => ({
        emails: { send: vi.fn(async () => ({ error: null })) },
      })),
    });

    const delivery = mailer?.sendVerificationEmail({
      to: "student@algomau.ca",
      verifyUrl: "https://talent.example.test/student/verify?token=raw-token",
      expiresMinutes: 30,
      idempotencyKey: "challenge-id",
    });
    await expect(delivery).rejects.toThrow("Gmail SMTP did not accept");
    await expect(delivery).rejects.not.toThrow(secret);
    await expect(delivery).rejects.not.toThrow("raw-token");
  });
});
