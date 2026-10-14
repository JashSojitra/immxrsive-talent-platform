import "server-only";

import type { TextItem } from "pdfjs-dist/types/src/display/api";

import type { ProfileEditorVocabulary } from "@/profile/service";
import type {
  ResumeCandidates,
  ResumeLinkCandidate,
  ResumeTextCandidate,
} from "@/resume/types";

export const MAX_RESUME_BYTES = 5 * 1024 * 1024;
export const MAX_RESUME_PAGES = 10;
export const MAX_RESUME_TEXT_CHARS = 100_000;
export const RESUME_PARSE_TIMEOUT_MS = 5_000;

type PdfJsRuntime = typeof import("pdfjs-dist/legacy/build/pdf.mjs");
export type PdfJsRuntimeLoader = () => Promise<PdfJsRuntime>;

export type PositionedText = { text: string; x: number; y: number; width: number };

type ResumeSection = "SKILLS" | "EDUCATION" | "EXPERIENCE";
type SectionHeading = ResumeSection | "OTHER";

const SECTION_HEADINGS = new Map<string, SectionHeading>([
  ["EDUCATION", "EDUCATION"],
  ["ACADEMIC BACKGROUND", "EDUCATION"],
  ["SKILLS", "SKILLS"],
  ["TECHNICAL SKILLS", "SKILLS"],
  ["TECHNOLOGIES", "SKILLS"],
  ["EXPERIENCE", "EXPERIENCE"],
  ["RELEVANT EXPERIENCE", "EXPERIENCE"],
  ["PROFESSIONAL EXPERIENCE", "EXPERIENCE"],
  ["WORK EXPERIENCE", "EXPERIENCE"],
  ["CONTACT", "OTHER"],
  ["LINKS", "OTHER"],
  ["PROFESSIONAL PROFILE", "OTHER"],
  ["PROFESSIONAL SUMMARY", "OTHER"],
  ["PROFILE", "OTHER"],
  ["SUMMARY", "OTHER"],
  ["PROJECTS", "OTHER"],
  ["SELECTED PROJECTS", "OTHER"],
  ["CERTIFICATIONS", "OTHER"],
  ["AWARDS", "OTHER"],
  ["VOLUNTEER EXPERIENCE", "OTHER"],
]);

export class ResumeExtractionError extends Error {
  constructor(
    readonly code:
      | "INVALID_PDF"
      | "PDF_TOO_LARGE"
      | "PDF_TOO_LONG"
      | "PDF_PARSE_TIMEOUT"
      | "PDF_TEXT_TOO_LARGE"
      | "EMPTY_PDF",
    readonly status: 400 | 413 | 422,
    message: string,
  ) {
    super(message);
    this.name = "ResumeExtractionError";
  }
}

export async function extractResumeCandidates(
  bytes: Uint8Array,
  vocabulary: ProfileEditorVocabulary,
  timeoutMs = RESUME_PARSE_TIMEOUT_MS,
  runtimeLoader: PdfJsRuntimeLoader = () => import("pdfjs-dist/legacy/build/pdf.mjs"),
): Promise<ResumeCandidates> {
  validatePdfEnvelope(bytes);
  let loadingTask: ReturnType<PdfJsRuntime["getDocument"]> | undefined;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let stage = "runtime-import";
  try {
    const { getDocument } = await runtimeLoader();
    stage = "document-load";
    loadingTask = getDocument({
      data: new Uint8Array(bytes),
      disableFontFace: true,
      useSystemFonts: true,
      stopAtErrors: true,
      useWorkerFetch: false,
    });
    const document = await Promise.race([
      loadingTask.promise,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new ResumeExtractionError(
          "PDF_PARSE_TIMEOUT",
          422,
          "The PDF took too long to process.",
        )), timeoutMs);
      }),
    ]);
    stage = "text-extraction";
    if (document.numPages > MAX_RESUME_PAGES) {
      throw new ResumeExtractionError(
        "PDF_TOO_LONG",
        422,
        `Resume PDFs may contain at most ${MAX_RESUME_PAGES} pages.`,
      );
    }

    const columns: string[][] = [];
    let extractedCharacters = 0;
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const positioned = content.items.flatMap((item) => {
        if (!("str" in item) || !item.str.trim()) return [];
        const textItem = item as TextItem;
        return [{
          text: textItem.str.trim(),
          x: textItem.transform[4],
          y: textItem.transform[5],
          width: textItem.width,
        }];
      });
      extractedCharacters += positioned.reduce((total, item) => total + item.text.length, 0);
      if (extractedCharacters > MAX_RESUME_TEXT_CHARS) {
        throw new ResumeExtractionError(
          "PDF_TEXT_TOO_LARGE",
          422,
          "The PDF contains too much text to process safely.",
        );
      }
      columns.push(...reconstructResumeTextColumns(positioned));
      page.cleanup();
    }
    if (extractedCharacters === 0) {
      throw new ResumeExtractionError(
        "EMPTY_PDF",
        422,
        "No selectable resume text could be extracted from this PDF.",
      );
    }
    return extractCandidatesFromTextColumns(columns, vocabulary);
  } catch (error) {
    if (error instanceof ResumeExtractionError) throw error;
    if (isPdfContentFailure(error)) {
      throw new ResumeExtractionError(
        "INVALID_PDF",
        422,
        "The uploaded file is not a readable PDF resume.",
      );
    }
    console.error("Resume PDF runtime failure.", {
      stage,
      errorName: error instanceof Error ? error.name : typeof error,
      errorCode: errorCode(error),
    });
    throw error;
  } finally {
    if (timeout) clearTimeout(timeout);
    await loadingTask?.destroy();
  }
}

function isPdfContentFailure(error: unknown) {
  return error instanceof Error && new Set([
    "FormatError",
    "InvalidPDFException",
    "MissingPDFException",
    "PasswordException",
    "ResponseException",
  ]).has(error.name);
}

function errorCode(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) return undefined;
  return typeof error.code === "string" ? error.code : undefined;
}

function validatePdfEnvelope(bytes: Uint8Array) {
  if (bytes.byteLength > MAX_RESUME_BYTES) {
    throw new ResumeExtractionError(
      "PDF_TOO_LARGE",
      413,
      "Resume PDFs must be 5 MB or smaller.",
    );
  }
  if (bytes.byteLength < 8) {
    throw new ResumeExtractionError("INVALID_PDF", 422, "The uploaded file is not a readable PDF.");
  }
  const decoder = new TextDecoder("latin1");
  const header = decoder.decode(bytes.slice(0, Math.min(1_024, bytes.byteLength)));
  const trailer = decoder.decode(bytes.slice(Math.max(0, bytes.byteLength - 2_048)));
  if (!header.startsWith("%PDF-") || !trailer.includes("%%EOF")) {
    throw new ResumeExtractionError("INVALID_PDF", 422, "The uploaded file is not a readable PDF.");
  }
}

export function reconstructResumeTextColumns(items: PositionedText[]) {
  const rows = new Map<number, PositionedText[]>();
  for (const item of items) {
    const key = Math.round(item.y / 2) * 2;
    rows.set(key, [...(rows.get(key) ?? []), item]);
  }
  const orderedRows = [...rows.entries()].sort(([a], [b]) => b - a).map(([y, row]) => ({
    y,
    items: row.toSorted((a, b) => a.x - b.x),
  }));
  const splitCandidates = orderedRows.flatMap(({ items: row }) => row.slice(1).flatMap((item, index) => {
    const previous = row[index];
    const gap = item.x - (previous.x + previous.width);
    return gap >= 30 ? [(item.x + previous.x + previous.width) / 2] : [];
  }));
  if (splitCandidates.length < 3) {
    return [rowsWithParagraphBreaks(orderedRows)];
  }
  const sortedSplits = splitCandidates.toSorted((a, b) => a - b);
  const splitX = sortedSplits[Math.floor(sortedSplits.length / 2)];
  const hasLeftHeading = orderedRows.some(({ items: row }) => row.some((item) =>
    item.x < splitX && parseSectionHeading(item.text)));
  const hasRightHeading = orderedRows.some(({ items: row }) => row.some((item) =>
    item.x >= splitX && parseSectionHeading(item.text)));
  if (!hasLeftHeading || !hasRightHeading) {
    return [rowsWithParagraphBreaks(orderedRows)];
  }
  const left: Array<{ y: number; items: PositionedText[] }> = [];
  const right: Array<{ y: number; items: PositionedText[] }> = [];
  for (const row of orderedRows) {
    const leftItems = row.items.filter((item) => item.x < splitX);
    const rightItems = row.items.filter((item) => item.x >= splitX);
    if (leftItems.length) left.push({ y: row.y, items: leftItems });
    if (rightItems.length) right.push({ y: row.y, items: rightItems });
  }
  return [left, right].filter((column) => column.length > 0).map(rowsWithParagraphBreaks);
}

export function extractCandidatesFromTextColumns(
  columns: string[][],
  vocabulary: ProfileEditorVocabulary,
): ResumeCandidates {
  const skills = sectionBlocks(columns, "SKILLS").flatMap((block) =>
    block.lines.flatMap(skillValuesFromLine));
  const matchedSkills = vocabulary.skills.filter((skill) =>
    skills.some((candidate) => candidate.localeCompare(skill.name, "en", { sensitivity: "base" }) === 0));
  const matchedNames = new Set(matchedSkills.map(({ name }) => name.toLocaleLowerCase("en")));
  const unsupportedSkills = uniqueCaseInsensitive(skills.filter((skill) =>
    !matchedNames.has(skill.toLocaleLowerCase("en"))));
  return {
    skills: matchedSkills.map((skill, index) => ({
      id: `skill-${index}`,
      skillId: skill.id,
      value: skill.name,
      source: skill.name,
    })),
    unsupportedSkills,
    education: textCandidates("education", sectionBlocks(columns, "EDUCATION")),
    experience: textCandidates("experience", sectionBlocks(columns, "EXPERIENCE")),
    links: linkCandidates(columns.flat()),
  };
}

function sectionBlocks(columns: string[][], target: ResumeSection) {
  const blocks: Array<{ lines: string[]; source: string }> = [];
  for (const column of columns) {
    let collecting = false;
    let lines: string[] = [];
    for (const rawLine of column) {
      const line = rawLine.replace(/\s+/g, " ").trim();
      if (!line) {
        if (collecting && lines.at(-1) !== "") lines.push("");
        continue;
      }
      const heading = parseSectionHeading(line);
      if (heading) {
        if (collecting && lines.length > 0) blocks.push({ lines, source: lines.join(" | ") });
        collecting = heading.section === target;
        lines = collecting && heading.inlineValue ? [heading.inlineValue] : [];
        continue;
      }
      const labelledBoundary = line.match(/^[A-Za-z][A-Za-z /&-]{1,39}:\s*/);
      if (labelledBoundary && !(collecting && target === "SKILLS")) {
        if (collecting && lines.length > 0) blocks.push({ lines, source: lines.join(" | ") });
        collecting = false;
        lines = [];
        continue;
      }
      if (collecting) lines.push(line);
    }
    if (collecting && lines.length > 0) blocks.push({ lines, source: lines.join(" | ") });
  }
  return blocks;
}

function textCandidates(kind: string, blocks: Array<{ lines: string[]; source: string }>) {
  let candidateIndex = 0;
  return blocks.flatMap((block): ResumeTextCandidate[] => {
    const groups = kind === "experience"
      ? experienceEntryGroups(block.lines)
      : [block.lines.filter(Boolean)];
    return groups.flatMap((lines) => {
      const value = lines.join(" - ").slice(0, 500).trim();
      if (!value) return [];
      const candidate = {
        id: `${kind}-${candidateIndex}`,
        value,
        source: lines.join(" | ").slice(0, 240),
      };
      candidateIndex += 1;
      return [candidate];
    });
  });
}

function linkCandidates(lines: string[]): ResumeLinkCandidate[] {
  const matches = lines.join("\n").matchAll(
    /\b(?:https?\s*:\s*\/\s*\/\s*)?(?:www\s*\.\s*)?(?:github|linkedin)\s*\.\s*com(?:\s*\/\s*[a-z0-9._~-]+)+/gi,
  );
  const seen = new Set<string>();
  return [...matches].flatMap((match, index) => {
    const raw = match[0].replace(/\s+/g, "").replace(/[.)]+$/, "");
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    url.hash = "";
    const normalized = url.toString().replace(/\/$/, "");
    if (seen.has(normalized)) return [];
    seen.add(normalized);
    const type = url.hostname.toLowerCase().endsWith("github.com") ? "github" : "linkedin";
    return [{
      id: `link-${index}`,
      type,
      label: type === "github" ? "GitHub" : "LinkedIn",
      url: normalized,
      value: normalized,
      source: raw,
    }];
  });
}

function rowsWithParagraphBreaks(rows: Array<{ y: number; items: PositionedText[] }>) {
  const gaps = rows.slice(1).map((row, index) => rows[index].y - row.y).filter((gap) => gap > 0);
  const typicalGap = median(gaps);
  const lines: string[] = [];
  rows.forEach((row, index) => {
    if (index > 0 && typicalGap > 0 && rows[index - 1].y - row.y > typicalGap * 1.45) {
      lines.push("");
    }
    lines.push(row.items.map(({ text }) => text).join(" ").trim());
  });
  return lines;
}

function parseSectionHeading(line: string) {
  const normalized = line.replace(/\s+/g, " ").trim();
  for (const [label, section] of SECTION_HEADINGS) {
    if (normalized.localeCompare(label, "en", { sensitivity: "base" }) === 0) {
      return { section, inlineValue: "" };
    }
    const prefix = `${label}:`;
    if (normalized.slice(0, prefix.length).localeCompare(prefix, "en", { sensitivity: "base" }) === 0) {
      return { section, inlineValue: normalized.slice(prefix.length).trim() };
    }
  }
  return null;
}

function skillValuesFromLine(line: string) {
  if (!line) return [];
  return line.split(/[|,;•]/).map((value) =>
    value.replace(/^[A-Za-z][A-Za-z /&-]{1,39}:\s*/, "").trim()).filter(Boolean);
}

function experienceEntryGroups(lines: string[]) {
  const explicitGroups = splitAtEmptyLines(lines);
  if (explicitGroups.length > 1) return explicitGroups;
  const compact = explicitGroups[0] ?? [];
  const dateLines = compact.flatMap((line, index) => hasResumeDate(line) ? [index] : []);
  if (dateLines.length < 2) return compact.length ? [compact] : [];
  const boundaries = dateLines.slice(1).map((index) => Math.max(1, index - 1));
  return splitAtIndices(compact, boundaries);
}

function splitAtEmptyLines(lines: string[]) {
  const groups: string[][] = [];
  let current: string[] = [];
  for (const line of lines) {
    if (!line) {
      if (current.length) groups.push(current);
      current = [];
    } else {
      current.push(line);
    }
  }
  if (current.length) groups.push(current);
  return groups;
}

function splitAtIndices(lines: string[], indices: number[]) {
  const boundaries = [...new Set(indices)].toSorted((a, b) => a - b);
  return [0, ...boundaries].map((start, index) =>
    lines.slice(start, boundaries[index] ?? lines.length)).filter((group) => group.length > 0);
}

function hasResumeDate(line: string) {
  return /\b(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+)?(?:19|20)\d{2}\b/i.test(line)
    || /\b(?:present|current)\b/i.test(line);
}

function uniqueCaseInsensitive(values: string[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = value.toLocaleLowerCase("en");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = values.toSorted((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}
