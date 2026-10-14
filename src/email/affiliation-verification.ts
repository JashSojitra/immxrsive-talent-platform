import "server-only";

import { createTransport, type SendMailOptions } from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import { Resend } from "resend";

export type VerificationEmail = {
  to: string;
  verifyUrl: string;
  expiresMinutes: number;
  idempotencyKey: string;
};

export interface VerificationMailer {
  sendVerificationEmail(message: VerificationEmail): Promise<void>;
}

type MailerFactories = {
  createGmailTransport: (options: SMTPTransport.Options) => GmailTransport;
  createResendClient: (apiKey: string) => ResendDeliveryClient;
};

type GmailTransport = {
  sendMail: (message: SendMailOptions) => Promise<{
    accepted?: Array<string | { address?: string }>;
  }>;
};

type ResendDeliveryClient = {
  emails: {
    send: (
      message: { from: string; to: string; subject: string; text: string; html: string },
      options: { idempotencyKey: string },
    ) => Promise<{ error: unknown | null }>;
  };
};

const DEFAULT_FACTORIES: MailerFactories = {
  createGmailTransport: (options) => createTransport(options),
  createResendClient: (apiKey) => new Resend(apiKey) as ResendDeliveryClient,
};

const GMAIL_SMTP_HOST = "smtp.gmail.com";
const GMAIL_SMTP_PORT = 465;
const GMAIL_CONNECTION_TIMEOUT_MS = 10_000;
const GMAIL_GREETING_TIMEOUT_MS = 10_000;
const GMAIL_SOCKET_TIMEOUT_MS = 20_000;

export function getConfiguredVerificationMailer(
  environment: Record<string, string | undefined> = process.env,
  factories: MailerFactories = DEFAULT_FACTORIES,
): VerificationMailer | null {
  const provider = environment.EMAIL_PROVIDER?.trim().toLowerCase() || "resend";
  if (provider === "gmail") return createGmailMailer(environment, factories);
  if (provider !== "resend") return null;

  const apiKey = environment.RESEND_API_KEY?.trim();
  const from = environment.AFFILIATION_EMAIL_FROM?.trim();
  if (!isConfiguredSecret(apiKey) || !from) return null;

  const resend = factories.createResendClient(apiKey);
  return {
    async sendVerificationEmail(message) {
      const { error } = await resend.emails.send(
        {
          from,
          to: message.to,
          subject: "Verify your Algoma University affiliation",
          text: verificationEmailText(message),
          html: verificationEmailHtml(message),
        },
        { idempotencyKey: message.idempotencyKey },
      );
      if (error) throw new Error("The verification email provider rejected the request.");
    },
  };
}

function createGmailMailer(
  environment: Record<string, string | undefined>,
  factories: MailerFactories,
): VerificationMailer | null {
  const user = environment.GMAIL_SMTP_USER?.trim();
  const password = environment.GMAIL_SMTP_APP_PASSWORD?.trim();
  if (!isEmailAddress(user) || !isConfiguredSecret(password)) return null;

  const transport = factories.createGmailTransport({
    host: GMAIL_SMTP_HOST,
    port: GMAIL_SMTP_PORT,
    secure: true,
    auth: { user, pass: password },
    connectionTimeout: GMAIL_CONNECTION_TIMEOUT_MS,
    greetingTimeout: GMAIL_GREETING_TIMEOUT_MS,
    socketTimeout: GMAIL_SOCKET_TIMEOUT_MS,
    tls: { minVersion: "TLSv1.2", servername: GMAIL_SMTP_HOST },
  });

  return {
    async sendVerificationEmail(message) {
      const mail: SendMailOptions = {
        from: { name: "NOT ImmXrsive", address: user },
        to: message.to,
        envelope: { from: user, to: message.to },
        subject: "Verify your Algoma University affiliation",
        text: verificationEmailText(message),
        html: verificationEmailHtml(message),
        messageId: `<${safeMessageId(message.idempotencyKey)}@not-immxrsive.local>`,
        disableFileAccess: true,
        disableUrlAccess: true,
      };
      try {
        const result = await transport.sendMail(mail);
        if (!acceptedRecipient(result.accepted, message.to)) {
          throw new Error("Recipient was not accepted.");
        }
      } catch {
        throw new Error("Gmail SMTP did not accept the verification email.");
      }
    },
  };
}

export function verificationEmailText(message: VerificationEmail) {
  return [
    "Verify your Algoma University affiliation",
    "NOT ImmXrsive",
    "",
    "Use the secure link below to confirm that this university email belongs to you:",
    message.verifyUrl,
    "",
    `This link expires in ${message.expiresMinutes} minutes and can be used once.`,
    "If you did not request this email, you can ignore it.",
    "",
    "Independent student-built course project. Not an official ImmXrsive or Algoma University service.",
  ].join("\n");
}

export function verificationEmailHtml(message: VerificationEmail) {
  const verifyUrl = escapeHtml(message.verifyUrl);
  return `<!doctype html>
<html lang="en"><body style="margin:0;background:#071014;color:#f4f1e9;font-family:Arial,sans-serif">
<div style="max-width:600px;margin:0 auto;padding:40px 24px">
<p style="color:#76f7e6;font-size:12px;font-weight:700;letter-spacing:2px">NOT IMMXRSIVE</p>
<h1 style="font-size:30px;line-height:1.15">Verify your Algoma University affiliation</h1>
<p style="color:#b8c1be;line-height:1.6">Confirm your university email to unlock the verified student workspace.</p>
<p style="margin:32px 0"><a href="${verifyUrl}" style="display:inline-block;background:#76f7e6;color:#071014;padding:14px 22px;text-decoration:none;font-weight:700">Verify affiliation</a></p>
<p style="color:#b8c1be;line-height:1.6">This single-use link expires in ${message.expiresMinutes} minutes. If you did not request it, no action is needed.</p>
<p style="margin-top:32px;padding-top:18px;border-top:1px solid #263238;color:#89938f;font-size:12px;line-height:1.5">Independent student-built course project. Not an official ImmXrsive or Algoma University service.</p>
</div></body></html>`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

function isConfiguredSecret(value: string | undefined): value is string {
  return Boolean(value && !value.startsWith("REPLACE_WITH_"));
}

function isEmailAddress(value: string | undefined): value is string {
  return Boolean(value && /^[^\s@]+@[^\s@]+$/.test(value));
}

function safeMessageId(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 120) || "verification";
}

function acceptedRecipient(
  accepted: Array<string | { address?: string }> | undefined,
  recipient: string,
) {
  return accepted?.some((entry) => (
    typeof entry === "string" ? entry : entry.address
  )?.toLowerCase() === recipient.toLowerCase()) ?? false;
}
