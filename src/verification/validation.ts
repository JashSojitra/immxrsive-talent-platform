import { z } from "zod";

export const verificationRequestSchema = z.object({
  email: z.string().trim().email().max(254),
}).strict();

export const verificationConfirmationSchema = z.object({
  token: z.string().trim().regex(/^[A-Za-z0-9_-]{43}$/),
}).strict();

export function normalizeInstitutionalEmail(
  email: string,
  approvedDomains: ReadonlySet<string>,
) {
  const normalized = email.trim().toLowerCase();
  const separator = normalized.lastIndexOf("@");
  if (separator <= 0 || separator === normalized.length - 1) return null;
  const localPart = normalized.slice(0, separator);
  const domain = normalized.slice(separator + 1);
  if (!localPart || !approvedDomains.has(domain)) return null;
  return normalized;
}
