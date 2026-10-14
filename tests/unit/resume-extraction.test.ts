import { readFile } from "node:fs/promises";
import path from "node:path";

import { beforeAll, describe, expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  extractCandidatesFromTextColumns,
  extractResumeCandidates,
  MAX_RESUME_BYTES,
  type PdfJsRuntimeLoader,
  reconstructResumeTextColumns,
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
    expect(result.unsupportedSkills).toEqual(["Git"]);
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
    expect(result.unsupportedSkills).toEqual([]);
    expect(result.education.map(({ value }) => value)).toEqual(["Computer Science student"]);
  });

  test("keeps multi-column education and experience separated", async () => {
    const result = await extractResumeCandidates(requiredFixture(fixtures, "resume_layout_stress.pdf"), vocabulary);
    expect(result.skills.map(({ value }) => value)).toEqual([
      "C#", "JavaScript", "Three.js", "Unity", "WebXR",
    ]);
    expect(result.unsupportedSkills).toEqual(["Git"]);
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
    expect(result.unsupportedSkills).toEqual([]);
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

  test("does not misreport a missing deployed PDF.js worker as an unreadable resume", async () => {
    const runtimeError = Object.assign(
      new Error("Setting up fake worker failed."),
      { code: "ERR_MODULE_NOT_FOUND" },
    );
    const destroy = vi.fn().mockResolvedValue(undefined);
    const runtimeLoader = vi.fn().mockResolvedValue({
      getDocument: () => ({
        promise: Promise.reject(runtimeError),
        destroy,
      }),
    }) as unknown as PdfJsRuntimeLoader;
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(extractResumeCandidates(
      requiredFixture(fixtures, "resume_clean_single_column.pdf"),
      vocabulary,
      5_000,
      runtimeLoader,
    )).rejects.toBe(runtimeError);

    expect(destroy).toHaveBeenCalledOnce();
    expect(log).toHaveBeenCalledWith("Resume PDF runtime failure.", {
      stage: "document-load",
      errorName: "Error",
      errorCode: "ERR_MODULE_NOT_FOUND",
    });
    expect(log.mock.calls.flat().join(" ")).not.toMatch(/BSc|Computer Science|Algoma/i);
    log.mockRestore();
  });

  test("parses Word-style heading variants, distinct experience entries, and split links", () => {
    const columns = [[
      "PROFESSIONAL PROFILE",
      "Synthetic software student",
      "EDUCATION",
      "Northern University",
      "Bachelor of Computing, Co-op",
      "Expected Aug. 2027",
      "TECHNICAL SKILLS",
      "Frameworks: React, Next.js, Tailwind CSS",
      "Languages: JavaScript, Python, Java, SQL, HTML/CSS",
      "RELEVANT EXPERIENCE",
      "Provincial Digital Service",
      "Software Developer - May 2026 - Aug. 2026",
      "Built an accessible public-service interface.",
      "",
      "University Technology Services",
      "Support Assistant - Sep. 2025 - Apr. 2026",
      "Supported classroom and lab technology.",
      "",
      "Computing Student Society",
      "Executive Member - Sep. 2024 - Present",
      "Organized peer workshops.",
      "",
      "University Outreach Office",
      "Student Ambassador - Sep. 2023 - Apr. 2024",
      "Supported prospective-student events.",
      "SELECTED PROJECTS",
      "Synthetic capstone project",
      "linkedin . com / in / synthetic-student",
    ]];

    const result = extractCandidatesFromTextColumns(columns, vocabulary);

    expect(result.skills.map(({ value }) => value)).toEqual(["JavaScript", "Python", "React"]);
    expect(result.unsupportedSkills).toEqual([
      "Next.js", "Tailwind CSS", "Java", "SQL", "HTML/CSS",
    ]);
    expect(result.education.map(({ value }) => value)).toEqual([
      "Northern University - Bachelor of Computing, Co-op - Expected Aug. 2027",
    ]);
    expect(result.experience).toHaveLength(4);
    expect(result.experience.map(({ value }) => value)).toEqual([
      "Provincial Digital Service - Software Developer - May 2026 - Aug. 2026 - Built an accessible public-service interface.",
      "University Technology Services - Support Assistant - Sep. 2025 - Apr. 2026 - Supported classroom and lab technology.",
      "Computing Student Society - Executive Member - Sep. 2024 - Present - Organized peer workshops.",
      "University Outreach Office - Student Ambassador - Sep. 2023 - Apr. 2024 - Supported prospective-student events.",
    ]);
    expect(result.links.map(({ url }) => url)).toEqual([
      "https://linkedin.com/in/synthetic-student",
    ]);
    expect(JSON.stringify(result)).not.toContain("Synthetic capstone project");
  });

  test("keeps right-aligned Word dates in one column unless both sides have headings", () => {
    const columns = reconstructResumeTextColumns([
      { text: "RELEVANT EXPERIENCE", x: 72, y: 700, width: 130 },
      { text: "Provincial Digital Service", x: 72, y: 680, width: 150 },
      { text: "May 2026 - Aug. 2026", x: 390, y: 680, width: 120 },
      { text: "Software Developer", x: 72, y: 660, width: 100 },
      { text: "University Technology Services", x: 72, y: 625, width: 170 },
      { text: "Sep. 2025 - Apr. 2026", x: 390, y: 625, width: 120 },
      { text: "Support Assistant", x: 72, y: 605, width: 90 },
    ]);

    expect(columns).toHaveLength(1);
    expect(columns[0]).toContain("Provincial Digital Service May 2026 - Aug. 2026");
    expect(columns[0]).toContain("");
  });
});

function requiredFixture(fixtures: Map<string, Uint8Array>, name: string) {
  const fixture = fixtures.get(name);
  if (!fixture) throw new Error(`Missing fixture ${name}`);
  return fixture;
}
