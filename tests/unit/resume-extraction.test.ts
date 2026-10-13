import { readFile } from "node:fs/promises";
import path from "node:path";

import { beforeAll, describe, expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  extractResumeCandidates,
  MAX_RESUME_BYTES,
} from "@/resume/extract";

const vocabulary = {
  skills: [
    "C#", "JavaScript", "OpenXR", "PostgreSQL", "Python", "React", "Three.js", "Unity", "WebXR",
  ].map((name) => ({ id: `id-${name}`, name })),
  availability: [],
};

describe("deterministic resume extraction", () => {
  const fixtures = new Map<string, Uint8Array>();

  beforeAll(async () => {
    for (const name of [
      "resume_clean_single_column.pdf",
      "resume_minimal.pdf",
      "resume_layout_stress.pdf",
      "resume_untrusted_text.pdf",
    ]) {
      fixtures.set(name, new Uint8Array(await readFile(path.join("data", "fixtures", "r2", name))));
    }
  });

  test("extracts grounded candidates from the clean single-column fixture", async () => {
    const result = await extractResumeCandidates(requiredFixture(fixtures, "resume_clean_single_column.pdf"), vocabulary);
    expect(result.skills.map(({ value }) => value)).toEqual(["C#", "OpenXR", "Unity"]);
    expect(result.education.map(({ value }) => value)).toEqual([
      "BSc Computer Science - Algoma University",
    ]);
    expect(result.experience.map(({ value }) => value)).toEqual([
      "XR Lab Assistant - Built and tested immersive training prototypes.",
    ]);
    expect(result.links.map(({ type }) => type)).toEqual(["github", "linkedin"]);
  });

  test("minimal fixture produces only its grounded education candidate", async () => {
    const result = await extractResumeCandidates(requiredFixture(fixtures, "resume_minimal.pdf"), vocabulary);
    expect(result).toMatchObject({ skills: [], experience: [], links: [] });
    expect(result.education.map(({ value }) => value)).toEqual(["Computer Science student"]);
  });

  test("keeps multi-column education and experience separated", async () => {
    const result = await extractResumeCandidates(requiredFixture(fixtures, "resume_layout_stress.pdf"), vocabulary);
    expect(result.skills.map(({ value }) => value)).toEqual([
      "C#", "JavaScript", "Three.js", "Unity", "WebXR",
    ]);
    expect(result.education.map(({ value }) => value)).toEqual([
      "Algoma University - Computer Science",
    ]);
    expect(result.experience.map(({ value }) => value)).toEqual([
      "Immersive Learning Research Assistant - Built WebXR prototypes and conducted user tests.",
    ]);
  });

  test("treats embedded commands as inert text and excludes them from suggestions", async () => {
    const result = await extractResumeCandidates(requiredFixture(fixtures, "resume_untrusted_text.pdf"), vocabulary);
    expect(result.skills.map(({ value }) => value)).toEqual(["PostgreSQL", "Python", "React"]);
    expect(result.education.map(({ value }) => value)).toEqual(["Computer Science"]);
    expect(result.experience.map(({ value }) => value)).toEqual([
      "Student developer - built accessible web applications.",
    ]);
    expect(JSON.stringify(result)).not.toMatch(/ignore all previous|private email/i);
  });

  test("rejects spoofed, corrupt, and oversized inputs before returning candidates", async () => {
    await expect(extractResumeCandidates(new TextEncoder().encode("not a pdf"), vocabulary))
      .rejects.toMatchObject({ code: "INVALID_PDF" });
    await expect(extractResumeCandidates(new Uint8Array(MAX_RESUME_BYTES + 1), vocabulary))
      .rejects.toMatchObject({ code: "PDF_TOO_LARGE" });
    const corrupt = new TextEncoder().encode("%PDF-1.7\ncorrupt body\n%%EOF");
    await expect(extractResumeCandidates(corrupt, vocabulary))
      .rejects.toMatchObject({ code: "INVALID_PDF" });
  });
});

function requiredFixture(fixtures: Map<string, Uint8Array>, name: string) {
  const fixture = fixtures.get(name);
  if (!fixture) throw new Error(`Missing fixture ${name}`);
  return fixture;
}
