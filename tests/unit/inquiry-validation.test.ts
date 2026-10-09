import { describe, expect, test } from "vitest";

import { inquiryRequestSchema } from "@/validation/inquiry";

const validRequest = {
  sourceType: "student",
  sourceId: "S01",
  companyName: " Example Inc. ",
  contactName: " Alex Employer ",
  contactEmail: " ALEX@EXAMPLE.COM ",
  description: " We would like to discuss an internship opportunity. ",
};

describe("inquiry validation", () => {
  test("trims fields and normalizes contact email", () => {
    expect(inquiryRequestSchema.parse(validRequest)).toMatchObject({
      companyName: "Example Inc.",
      contactName: "Alex Employer",
      contactEmail: "alex@example.com",
      description: "We would like to discuss an internship opportunity.",
    });
  });

  test.each([
    ["companyName", "", "Company name is required."],
    ["contactName", "   ", "Contact name is required."],
    ["contactEmail", "not-an-email", "Enter a valid contact email."],
    ["description", "Too short", "Inquiry description must be at least 20 characters."],
  ])("validates %s", (field, value, message) => {
    const result = inquiryRequestSchema.safeParse({ ...validRequest, [field]: value });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.message).toBe(message);
  });

  test("rejects invalid source types and unsupported spoofing fields", () => {
    expect(inquiryRequestSchema.safeParse({ ...validRequest, sourceType: "employer" }).success).toBe(false);
    expect(inquiryRequestSchema.safeParse({ ...validRequest, sourceName: "Spoofed" }).success).toBe(false);
    expect(inquiryRequestSchema.safeParse({ ...validRequest, sourceUrl: "/spoofed" }).success).toBe(false);
  });

  test("rejects recognized template prompts with actionable feedback", () => {
    const result = inquiryRequestSchema.safeParse({
      ...validRequest,
      description: "We would like to discuss [opportunity or collaboration] with your team.",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]).toMatchObject({
        path: ["description"],
        message: "Replace the remaining template prompt: [opportunity or collaboration]",
      });
    }
  });

  test("allows unrelated bracketed custom text", () => {
    expect(inquiryRequestSchema.safeParse({
      ...validRequest,
      description: "We would like to discuss the planned [Phase 2] collaboration in detail.",
    }).success).toBe(true);
  });
});
