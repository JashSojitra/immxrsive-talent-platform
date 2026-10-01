import { z } from "zod";

export const MAX_INQUIRY_BODY_BYTES = 16 * 1024;

export const inquiryRequestSchema = z.object({
  sourceType: z.enum(["student", "project"], {
    error: "Choose a valid inquiry source.",
  }),
  sourceId: z.string().trim().min(1, "Inquiry source is required.").max(64),
  companyName: z.string().trim()
    .min(1, "Company name is required.")
    .max(120, "Company name must be 120 characters or fewer."),
  contactName: z.string().trim()
    .min(1, "Contact name is required.")
    .max(120, "Contact name must be 120 characters or fewer."),
  contactEmail: z.string().trim().toLowerCase()
    .min(1, "Contact email is required.")
    .max(254, "Contact email must be 254 characters or fewer.")
    .email("Enter a valid contact email."),
  description: z.string().trim()
    .min(20, "Inquiry description must be at least 20 characters.")
    .max(2_000, "Inquiry description must be 2,000 characters or fewer."),
  website: z.string().max(0, "Unable to submit this inquiry.").optional().default(""),
}).strict();

export type InquiryRequest = z.infer<typeof inquiryRequestSchema>;

export function inquiryValidationDetails(error: z.ZodError) {
  return error.issues.map((issue) => ({
    field: issue.path[0]?.toString() ?? "request",
    code: issue.code.toUpperCase(),
    message: issue.message,
  }));
}
