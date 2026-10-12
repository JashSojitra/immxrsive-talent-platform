import { describe, expect, test } from "vitest";

import { studentProfileDraftSchema } from "@/validation/student-profile";

const validDraft = {
  headline: "XR developer",
  biography: "Building accessible immersive experiences.",
  publicLocation: "Sault Ste. Marie, ON",
  skillIds: ["Unity"],
  availability: ["internship" as const],
  linkedinUrl: "https://www.linkedin.com/in/student/",
  githubUrl: "https://github.com/student/",
  externalLinks: [{ label: "Portfolio", url: "https://student.example/#work", type: "portfolio" as const }],
  revision: null,
};

describe("student profile draft validation", () => {
  test("normalizes links and de-duplicates standardized selections", () => {
    const result = studentProfileDraftSchema.parse({
      ...validDraft,
      skillIds: ["Unity", "Unity"],
      availability: ["internship", "internship"],
    });
    expect(result.skillIds).toEqual(["Unity"]);
    expect(result.availability).toEqual(["internship"]);
    expect(result.githubUrl).toBe("https://github.com/student");
    expect(result.externalLinks[0]?.url).toBe("https://student.example");
  });

  test("rejects ownership and profile identifiers supplied by a client", () => {
    expect(studentProfileDraftSchema.safeParse({
      ...validDraft, ownerUserId: "another-user", id: "forged-profile",
    }).success).toBe(false);
  });

  test.each([
    ["http://github.com/student", ""],
    ["javascript:alert(1)", ""],
    ["", "https://gitlab.com/student"],
  ])("rejects unsafe or non-GitHub URLs", (linkedinUrl, githubUrl) => {
    expect(studentProfileDraftSchema.safeParse({
      ...validDraft, linkedinUrl, githubUrl,
    }).success).toBe(false);
  });

  test("keeps markup-like biography content as plain text and enforces its limit", () => {
    const plainText = "<script>alert('not HTML')</script>";
    expect(studentProfileDraftSchema.parse({ ...validDraft, biography: plainText }).biography)
      .toBe(plainText);
    expect(studentProfileDraftSchema.safeParse({
      ...validDraft, biography: "x".repeat(4_001),
    }).success).toBe(false);
  });
});
