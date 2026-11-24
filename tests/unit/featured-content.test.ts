import { expect, test } from "vitest";
import { isReviewRecord } from "@/components/home/featured-content";

test("editorial features distinguish explicit UUID review fixtures without renaming real work", () => {
  expect(isReviewRecord("R4 approved partner 12345678-1234-4000-8000-123456789012")).toBe(true);
  expect(isReviewRecord("Museum Quest Experience")).toBe(false);
  expect(isReviewRecord("R4 Accessibility Research")).toBe(false);
  expect(isReviewRecord("12345678-1234-4000-8000-123456789012")).toBe(false);
});
