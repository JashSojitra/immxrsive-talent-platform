import { describe, expect, test } from "vitest";

import {
  createInquiryTemplate,
  findUnresolvedInquiryPlaceholders,
  isInquiryTemplateSubstantiallyModified,
} from "@/lib/inquiry-template";

describe("contextual inquiry templates", () => {
  test("uses only trusted student name and headline for student context", () => {
    const template = createInquiryTemplate({
      type: "student",
      id: "S01",
      name: "Avery Chen",
      detail: "XR Developer focused on training simulations",
    });

    expect(template).toContain("profile of Avery Chen");
    expect(template).toContain("professional focus on XR Developer focused on training simulations");
    expect(template).not.toContain("[actual student name]");
    expect(template).not.toMatch(/award|accomplishment|expert/i);
  });

  test("uses trusted project title, ID, and context", () => {
    const template = createInquiryTemplate({
      type: "project",
      id: "P01",
      name: "Industrial Safety VR Trainer",
      detail: "Immersive safety training prototype for industrial onboarding.",
    });

    expect(template).toContain('project "Industrial Safety VR Trainer"');
    expect(template).toContain("(P01)");
    expect(template).toContain("Project context: Immersive safety training prototype for industrial onboarding.");
    expect(template).not.toContain("[actual project title]");
    expect(template).not.toContain("[actual project ID]");
  });

  test("detects only canonical unresolved prompts", () => {
    expect(findUnresolvedInquiryPlaceholders("Discuss [opportunity or collaboration] in [Phase 2]."))
      .toEqual(["[opportunity or collaboration]"]);
    expect(findUnresolvedInquiryPlaceholders("Discuss delivery in [Phase 2].")).toEqual([]);
  });

  test("distinguishes substantial edits for reset protection", () => {
    const template = "A sufficiently long original template message for an employer inquiry.";
    expect(isInquiryTemplateSubstantiallyModified(template, template)).toBe(false);
    expect(isInquiryTemplateSubstantiallyModified(`${template}!`, template)).toBe(false);
    expect(isInquiryTemplateSubstantiallyModified("A completely rewritten personalized employer message.", template)).toBe(true);
  });
});
