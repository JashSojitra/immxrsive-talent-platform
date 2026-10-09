import { describe, expect, test } from "vitest";

import {
  escapeLikeLiteral,
  parseTalentSearchExpression,
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
      searchGroups: [["developer"]],
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

describe("talent search expression parser", () => {
  test.each([
    ["React", [["React"]]],
    ["Machine Learning", [["Machine Learning"]]],
    ["React, TypeScript", [["React"], ["TypeScript"]]],
    ["React | TypeScript", [["React", "TypeScript"]]],
    ["Unity | Blender, Maya", [["Unity", "Blender"], ["Maya"]]],
    ['"Machine Learning"', [["Machine Learning"]]],
    ['"Research, Design", React', [["Research, Design"], ["React"]]],
    ['"C|C++" | Rust', [["C|C++", "Rust"]]],
    ["  React |  TypeScript , Figma  ", [["React", "TypeScript"], ["Figma"]]],
    ["React | react | REACT", [["React"]]],
    ['"Say \\"hello\\""', [['Say "hello"']]],
  ])("parses %s", (expression, expected) => {
    expect(parseTalentSearchExpression(expression)).toEqual(expected);
  });

  test.each([
    ["React,", "EMPTY_SEARCH_TERM"],
    ["| React", "EMPTY_SEARCH_TERM"],
    ["React || TypeScript", "EMPTY_SEARCH_TERM"],
    ['"React', "UNCLOSED_QUOTE"],
    ["React,,TypeScript", "EMPTY_SEARCH_TERM"],
  ])("rejects malformed expression %s", (expression, code) => {
    expect(() => parseTalentSearchExpression(expression)).toThrowError(
      expect.objectContaining({ code }),
    );
  });

  test("enforces expression complexity and length limits", () => {
    expect(() => parseTalentSearchExpression("x".repeat(501))).toThrowError(
      expect.objectContaining({ code: "SEARCH_TOO_LONG" }),
    );
    expect(() => parseTalentSearchExpression(Array.from({ length: 31 }, (_, index) => `t${index}`).join("|"))).toThrowError(
      expect.objectContaining({ code: "SEARCH_TOO_COMPLEX" }),
    );
    expect(() => parseTalentSearchExpression(Array.from({ length: 31 }, () => "React").join("|"))).toThrowError(
      expect.objectContaining({ code: "SEARCH_TOO_COMPLEX" }),
    );
  });
});
