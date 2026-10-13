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

type PositionedText = { text: string; x: number; y: number; width: number };

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
): Promise<ResumeCandidates> {
  validatePdfEnvelope(bytes);
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = getDocument({
    data: new Uint8Array(bytes),
    disableFontFace: true,
    useSystemFonts: true,
    stopAtErrors: true,
    useWorkerFetch: false,
  });
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
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
      columns.push(...positionedTextToColumns(positioned));
      page.cleanup();
    }
    if (extractedCharacters === 0) {
      throw new ResumeExtractionError(
        "EMPTY_PDF",
        422,
        "No selectable resume text could be extracted from this PDF.",
      );
    }
    return candidatesFromColumns(columns, vocabulary);
  } catch (error) {
    if (error instanceof ResumeExtractionError) throw error;
    throw new ResumeExtractionError(
      "INVALID_PDF",
      422,
      "The uploaded file is not a readable PDF resume.",
    );
  } finally {
    if (timeout) clearTimeout(timeout);
    await loadingTask.destroy();
  }
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

function positionedTextToColumns(items: PositionedText[]) {
  const rows = new Map<number, PositionedText[]>();
  for (const item of items) {
    const key = Math.round(item.y / 2) * 2;
    rows.set(key, [...(rows.get(key) ?? []), item]);
  }
  const orderedRows = [...rows.entries()].sort(([a], [b]) => b - a).map(([, row]) =>
    row.toSorted((a, b) => a.x - b.x));
  const splitCandidates = orderedRows.flatMap((row) => row.slice(1).flatMap((item, index) => {
    const previous = row[index];
    const gap = item.x - (previous.x + previous.width);
    return gap >= 30 ? [(item.x + previous.x + previous.width) / 2] : [];
  }));
  if (splitCandidates.length < 3) {
    return [orderedRows.map((row) => row.map(({ text }) => text).join(" ").trim())];
  }
  const sortedSplits = splitCandidates.toSorted((a, b) => a - b);
  const splitX = sortedSplits[Math.floor(sortedSplits.length / 2)];
  const left: string[] = [];
  const right: string[] = [];
  for (const row of orderedRows) {
    const leftText = row.filter((item) => item.x < splitX).map(({ text }) => text).join(" ").trim();
    const rightText = row.filter((item) => item.x >= splitX).map(({ text }) => text).join(" ").trim();
    if (leftText) left.push(leftText);
    if (rightText) right.push(rightText);
  }
  return [left, right].filter((column) => column.length > 0);
}

function candidatesFromColumns(
  columns: string[][],
  vocabulary: ProfileEditorVocabulary,
): ResumeCandidates {
  const skills = sectionBlocks(columns, "SKILLS").flatMap((block) =>
    block.lines.flatMap((line) => line.split(/[|,;]/).map((value) => value.trim())));
  const matchedSkills = vocabulary.skills.filter((skill) =>
    skills.some((candidate) => candidate.localeCompare(skill.name, "en", { sensitivity: "base" }) === 0));
  return {
    skills: matchedSkills.map((skill, index) => ({
      id: `skill-${index}`,
      skillId: skill.id,
      value: skill.name,
      source: skill.name,
    })),
    education: textCandidates("education", sectionBlocks(columns, "EDUCATION")),
    experience: textCandidates("experience", sectionBlocks(columns, "EXPERIENCE")),
    links: linkCandidates(columns.flat()),
  };
}

function sectionBlocks(columns: string[][], target: "SKILLS" | "EDUCATION" | "EXPERIENCE") {
  const blocks: Array<{ lines: string[]; source: string }> = [];
  for (const column of columns) {
    let collecting = false;
    let lines: string[] = [];
    for (const rawLine of column) {
      const line = rawLine.replace(/\s+/g, " ").trim();
      const labelled = line.match(/^(SKILLS|EDUCATION|EXPERIENCE)\s*:\s*(.*)$/i);
      const header = line.match(/^(CONTACT|SKILLS|EDUCATION|EXPERIENCE|PROJECTS|LINKS)$/i);
      const unknownLabel = line.match(/^[A-Za-z][A-Za-z ]{2,}\s*:/);
      if (labelled) {
        if (collecting && lines.length > 0) blocks.push({ lines, source: lines.join(" | ") });
        collecting = labelled[1].toUpperCase() === target;
        lines = collecting && labelled[2] ? [labelled[2].trim()] : [];
        continue;
      }
      if (header || unknownLabel) {
        if (collecting && lines.length > 0) blocks.push({ lines, source: lines.join(" | ") });
        collecting = header?.[1].toUpperCase() === target;
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
  return blocks.flatMap((block, index): ResumeTextCandidate[] => {
    const value = block.lines.join(" - ").slice(0, 500).trim();
    return value ? [{ id: `${kind}-${index}`, value, source: block.source.slice(0, 240) }] : [];
  });
}

function linkCandidates(lines: string[]): ResumeLinkCandidate[] {
  const matches = lines.join("\n").matchAll(
    /\b(?:https?:\/\/)?(?:www\.)?(?:github\.com|linkedin\.com)(?:\/[^\s|,;]*)?/gi,
  );
  const seen = new Set<string>();
  return [...matches].flatMap((match, index) => {
    const raw = match[0].replace(/[.)]+$/, "");
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
