import { beforeAll, describe, expect, test } from "vitest";

import { loadFixtureSource, type FixtureSource } from "@/fixtures/load";
import { validateFixtureData } from "@/fixtures/schema";

describe("fixture validation", () => {
  let officialSource: FixtureSource;

  beforeAll(async () => {
    officialSource = await loadFixtureSource();
  });

  test("official fixtures validate", () => {
    const result = validateFixtureData(officialSource);

    expect(result.students).toHaveLength(18);
    expect(result.projects).toHaveLength(9);
    expect(result.skills).toHaveLength(24);
  });

  test("invalid enum values fail", () => {
    const source = cloneSource(officialSource);
    source.students[0].status = "graduated";

    expect(() => validateFixtureData(source)).toThrow(/current|alumni/);
  });

  test("an unknown skill reference fails", () => {
    const source = cloneSource(officialSource);
    source.students[0].skills.push("Imaginary Skill");

    expect(() => validateFixtureData(source)).toThrow(/unknown standardized skill/i);
  });

  test("an unknown project reference fails", () => {
    const source = cloneSource(officialSource);
    source.students[0].project_ids.push("P99");

    expect(() => validateFixtureData(source)).toThrow(/unknown project/i);
  });

  test("an unknown contributor student fails", () => {
    const source = cloneSource(officialSource);
    source.projects[0].contributors.push({
      student_id: "S99",
      role: "Imaginary Role",
    });

    expect(() => validateFixtureData(source)).toThrow(/unknown student/i);
  });

  test("a project_ids and contributors mismatch fails", () => {
    const source = cloneSource(officialSource);
    source.students[0].project_ids = source.students[0].project_ids.filter(
      (projectId) => projectId !== "P01",
    );

    expect(() => validateFixtureData(source)).toThrow(/relationship mismatch/i);
  });

  test("duplicate skills and availability values fail", () => {
    const source = cloneSource(officialSource);
    source.students[0].skills.push(source.students[0].skills[0]);
    source.students[0].availability.push(source.students[0].availability[0]);

    expect(() => validateFixtureData(source)).toThrow(/duplicate/i);
  });

  test("duplicate project contributors fail", () => {
    const source = cloneSource(officialSource);
    source.projects[0].contributors.push({ ...source.projects[0].contributors[0] });

    expect(() => validateFixtureData(source)).toThrow(/duplicate contributor/i);
  });

  test("invalid supplied URLs fail", () => {
    const source = cloneSource(officialSource);
    source.projects[0].links.demo = "not-a-url";

    expect(() => validateFixtureData(source)).toThrow(/URL/i);
  });
});

interface MutableStudent {
  status: string;
  availability: string[];
  skills: string[];
  project_ids: string[];
}

interface MutableProject {
  contributors: Array<{ student_id: string; role: string }>;
  links: Record<string, string>;
}

interface MutableFixtureSource {
  students: MutableStudent[];
  projects: MutableProject[];
  skills: string[];
}

function cloneSource(source: FixtureSource): MutableFixtureSource {
  return structuredClone(source) as MutableFixtureSource;
}
