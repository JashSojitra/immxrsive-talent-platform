import { expect, test } from "vitest";
import { parseBulkCredits } from "@/admin/bulk-credits";
test("bulk credits include required public names and normalize institutional emails", () => {
  const parsed = parseBulkCredits(" Fixture Student , STUDENT@ALGOMAU.CA , Designer\nOther Fixture,other@algomau.ca,Developer", ["algomau.ca"]);
  expect(parsed.errors).toEqual([]); expect(parsed.credits).toMatchObject([{ name: "Fixture Student", institutionalEmail: "student@algomau.ca", role: "Designer" }, { name: "Other Fixture", institutionalEmail: "other@algomau.ca", role: "Developer" }]);
});
test("bulk errors identify original line numbers without repeating email values", () => {
  const result = parseBulkCredits("\n,missing@algomau.ca,Designer\nStudent,private@example.test,Developer\nOnly two, columns\nStudent,valid@algomau.ca,", ["algomau.ca"]);
  expect(result.errors.map(e => e.line)).toEqual([2,3,4,5]); expect(JSON.stringify(result.errors)).not.toContain("private@example.test");
});
test("bulk parsing respects configured verification domains and rejects duplicate emails", () => {
  const result = parseBulkCredits("Student,student@students.algomau.ca,Designer\nStudent,STUDENT@students.algomau.ca,Developer", ["students.algomau.ca"]);
  expect(result.credits).toHaveLength(1); expect(result.errors).toMatchObject([{ line: 2 }]);
});
