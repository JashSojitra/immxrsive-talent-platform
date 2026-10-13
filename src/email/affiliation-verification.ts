import "server-only";

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

export function getConfiguredVerificationMailer(
  environment: Record<string, string | undefined> = process.env,
): VerificationMailer | null {
  const apiKey = environment.RESEND_API_KEY?.trim();
  const from = environment.AFFILIATION_EMAIL_FROM?.trim();
  if (!apiKey || !from || apiKey.startsWith("REPLACE_WITH_")) return null;

  const resend = new Resend(apiKey);
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
