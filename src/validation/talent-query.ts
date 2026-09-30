import { z } from "zod";

import type { ApiErrorDetail } from "@/lib/api-errors";

export const TALENT_AVAILABILITY_VALUES = [
  "internship",
  "full-time",
  "contract",
] as const;
export const TALENT_STATUS_VALUES = ["current", "alumni"] as const;

const availabilitySchema = z.enum(TALENT_AVAILABILITY_VALUES);
const statusSchema = z.enum(TALENT_STATUS_VALUES);

export interface TalentQuery {
  q: string;
  skills: string[];
  availability: Array<(typeof TALENT_AVAILABILITY_VALUES)[number]>;
  status: Array<(typeof TALENT_STATUS_VALUES)[number]>;
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
    skills: requestedSkills,
    availability,
    status,
  };
}

export function escapeLikeLiteral(value: string) {
  return value.replaceAll("!", "!!").replaceAll("%", "!%").replaceAll("_", "!_");
}

function uniqueTrimmed(values: string[]) {
  return [...new Set(values.map((value) => value.trim()))];
}
