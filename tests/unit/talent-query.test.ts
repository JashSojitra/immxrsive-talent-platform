import { describe, expect, test } from "vitest";

import {
  escapeLikeLiteral,
  parseTalentQuery,
  TalentQueryValidationError,
} from "@/validation/talent-query";

const skills = new Set(["React", "TypeScript", "C#"]);

describe("talent query normalization", () => {
  test("trims text and de-duplicates repeated filters in first-seen order", () => {
    const params = new URLSearchParams();
    params.set("q", "  developer  ");
    params.append("skill", "React");
    params.append("skill", "React");
    params.append("availability", "contract");
    params.append("availability", "contract");
    params.append("status", "current");
    params.append("status", "current");

    expect(parseTalentQuery(params, skills)).toEqual({
      q: "developer",
      skills: ["React"],
      availability: ["contract"],
      status: ["current"],
    });
  });

  test("an empty q behaves as no text filter", () => {
    expect(parseTalentQuery(new URLSearchParams("q=%20%20"), skills).q).toBe("");
  });

  test("escapes every character with SQL LIKE meaning", () => {
    expect(escapeLikeLiteral("100%!_done")).toBe("100!%!!!_done");
  });

  test.each([
    ["skill=Unknown", "UNKNOWN_SKILL"],
    ["availability=temporary", "INVALID_AVAILABILITY"],
    ["status=staff", "INVALID_STATUS"],
  ])("rejects invalid query %s", (query, expectedCode) => {
    try {
      parseTalentQuery(new URLSearchParams(query), skills);
      throw new Error("Expected query validation to fail.");
    } catch (error) {
      expect(error).toBeInstanceOf(TalentQueryValidationError);
      expect((error as TalentQueryValidationError).details[0]?.code).toBe(expectedCode);
    }
  });
});
