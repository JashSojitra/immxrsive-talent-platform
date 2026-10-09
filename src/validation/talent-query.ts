import { z } from "zod";

import type { ApiErrorDetail } from "@/lib/api-errors";

export const TALENT_AVAILABILITY_VALUES = [
  "internship",
  "full-time",
  "contract",
] as const;
export const TALENT_STATUS_VALUES = ["current", "alumni"] as const;

export const TALENT_SEARCH_LIMITS = {
  maxLength: 500,
  maxGroups: 12,
  maxTerms: 30,
  maxTermLength: 100,
} as const;

const availabilitySchema = z.enum(TALENT_AVAILABILITY_VALUES);
const statusSchema = z.enum(TALENT_STATUS_VALUES);

export interface TalentQuery {
  q: string;
  searchGroups: string[][];
  skills: string[];
  availability: Array<(typeof TALENT_AVAILABILITY_VALUES)[number]>;
  status: Array<(typeof TALENT_STATUS_VALUES)[number]>;
}

export class TalentSearchSyntaxError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "TalentSearchSyntaxError";
    this.code = code;
  }
}

export class TalentQueryValidationError extends Error {
  readonly details: ApiErrorDetail[];

  constructor(details: ApiErrorDetail[]) {
    super("One or more directory filters are invalid.");
    this.name = "TalentQueryValidationError";
    this.details = details;
  }
}

export function parseTalentQuery(
  searchParams: URLSearchParams,
  authoritativeSkillNames: ReadonlySet<string>,
): TalentQuery {
  const q = searchParams.get("q")?.trim() ?? "";
  const requestedSkills = uniqueTrimmed(searchParams.getAll("skill"));
  const requestedAvailability = uniqueTrimmed(searchParams.getAll("availability"));
  const requestedStatuses = uniqueTrimmed(searchParams.getAll("status"));
  const details: ApiErrorDetail[] = [];

  let searchGroups: string[][] = [];
  try {
    searchGroups = parseTalentSearchExpression(q);
  } catch (error) {
    if (error instanceof TalentSearchSyntaxError) {
      details.push({
        field: "q",
        value: q,
        code: error.code,
        message: error.message,
      });
    } else {
      throw error;
    }
  }

  for (const skill of requestedSkills) {
    if (!authoritativeSkillNames.has(skill)) {
      details.push({
        field: "skill",
        value: skill,
        code: "UNKNOWN_SKILL",
        message: `Unknown standardized skill: ${skill}`,
      });
    }
  }

  const availability = requestedAvailability.flatMap((value) => {
    const result = availabilitySchema.safeParse(value);
    if (result.success) {
      return [result.data];
    }
    details.push({
      field: "availability",
      value,
      code: "INVALID_AVAILABILITY",
      message: `Unsupported availability value: ${value}`,
    });
    return [];
  });

  const status = requestedStatuses.flatMap((value) => {
    const result = statusSchema.safeParse(value);
    if (result.success) {
      return [result.data];
    }
    details.push({
      field: "status",
      value,
      code: "INVALID_STATUS",
      message: `Unsupported status value: ${value}`,
    });
    return [];
  });

  if (details.length > 0) {
    throw new TalentQueryValidationError(details);
  }

  return {
    q,
    searchGroups,
    skills: requestedSkills,
    availability,
    status,
  };
}

/**
 * Parses comma-separated AND groups containing pipe-separated OR terms.
 * Delimiters inside double quotes are preserved as literal text.
 */
export function parseTalentSearchExpression(value: string): string[][] {
  const expression = value.trim();
  if (!expression) return [];

  if (expression.length > TALENT_SEARCH_LIMITS.maxLength) {
    throw new TalentSearchSyntaxError(
      "SEARCH_TOO_LONG",
      `Search must be ${TALENT_SEARCH_LIMITS.maxLength} characters or fewer.`,
    );
  }

  const groups: string[][] = [[]];
  let term = "";
  let quoted = false;
  let escaped = false;
  let rawTermCount = 0;

  const finishTerm = (separator: "," | "|" | "end") => {
    const normalized = term.trim();
    if (!normalized) {
      throw new TalentSearchSyntaxError(
        "EMPTY_SEARCH_TERM",
        separator === "end"
          ? "Add a keyword after the final separator."
          : `Add a keyword ${separator === "," ? "before and after each comma" : "on both sides of each pipe"}.`,
      );
    }
    if (normalized.length > TALENT_SEARCH_LIMITS.maxTermLength) {
      throw new TalentSearchSyntaxError(
        "SEARCH_TERM_TOO_LONG",
        `Each search term must be ${TALENT_SEARCH_LIMITS.maxTermLength} characters or fewer.`,
      );
    }
    rawTermCount += 1;
    if (rawTermCount > TALENT_SEARCH_LIMITS.maxTerms) {
      throw new TalentSearchSyntaxError(
        "SEARCH_TOO_COMPLEX",
        `Use no more than ${TALENT_SEARCH_LIMITS.maxGroups} AND groups and ${TALENT_SEARCH_LIMITS.maxTerms} total keywords.`,
      );
    }

    const group = groups.at(-1)!;
    if (!group.some((existing) => existing.toLowerCase() === normalized.toLowerCase())) {
      group.push(normalized);
    }
    term = "";
  };

  for (const character of expression) {
    if (escaped) {
      if (character === '"' || character === "\\") {
        term += character;
      } else {
        term += `\\${character}`;
      }
      escaped = false;
      continue;
    }

    if (character === "\\" && quoted) {
      escaped = true;
      continue;
    }
    if (character === '"') {
      quoted = !quoted;
      continue;
    }
    if (!quoted && (character === "," || character === "|")) {
      finishTerm(character);
      if (character === ",") {
        groups.push([]);
        if (groups.length > TALENT_SEARCH_LIMITS.maxGroups) {
          throw new TalentSearchSyntaxError(
            "SEARCH_TOO_COMPLEX",
            `Use no more than ${TALENT_SEARCH_LIMITS.maxGroups} AND groups and ${TALENT_SEARCH_LIMITS.maxTerms} total keywords.`,
          );
        }
      }
      continue;
    }
    term += character;
  }

  if (escaped) term += "\\";
  if (quoted) {
    throw new TalentSearchSyntaxError(
      "UNCLOSED_QUOTE",
      "Close the quoted phrase with a double quote.",
    );
  }
  finishTerm("end");

  const uniqueGroups: string[][] = [];
  const seenGroups = new Set<string>();
  for (const group of groups) {
    const key = group.map((item) => item.toLowerCase()).sort().join("\u0000");
    if (!seenGroups.has(key)) {
      seenGroups.add(key);
      uniqueGroups.push(group);
    }
  }
  return uniqueGroups;
}

export function escapeLikeLiteral(value: string) {
  return value.replaceAll("!", "!!").replaceAll("%", "!%").replaceAll("_", "!_");
}

function uniqueTrimmed(values: string[]) {
  return [...new Set(values.map((value) => value.trim()))];
}
