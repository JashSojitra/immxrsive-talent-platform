import { z } from "zod";

export const MAX_PROFILE_BODY_BYTES = 32 * 1024;
export const MAX_PROFILE_SKILLS = 20;
export const MAX_PROFILE_LINKS = 5;
export const MAX_PROFILE_EDUCATION_ENTRIES = 10;
export const MAX_PROFILE_EXPERIENCE_ENTRIES = 15;

const maintainedEntrySchema = z.string().trim().min(1).max(500);

const httpsUrlSchema = z.string().trim().max(2_048).superRefine((value, context) => {
  if (!value) return;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") throw new Error("HTTPS required");
  } catch {
    context.addIssue({
      code: "custom",
      message: "Enter a complete HTTPS URL.",
    });
  }
});

const githubUrlSchema = httpsUrlSchema.superRefine((value, context) => {
  if (!value) return;
  let hostname: string;
  try {
    hostname = new URL(value).hostname.toLowerCase();
  } catch {
    return;
  }
  if (hostname !== "github.com" && hostname !== "www.github.com") {
    context.addIssue({
      code: "custom",
      message: "GitHub link must use github.com.",
    });
  }
});

const externalLinkSchema = z.object({
  label: z.string().trim().min(1, "Link label is required.").max(60),
  url: httpsUrlSchema.refine(Boolean, "Link URL is required."),
  type: z.enum(["portfolio", "other"]),
}).strict();

export const studentProfileDraftSchema = z.object({
  headline: z.string().trim().max(140, "Headline must be 140 characters or fewer."),
  biography: z.string().trim().max(4_000, "Biography must be 4,000 characters or fewer."),
  publicLocation: z.string().trim().max(100, "Location must be 100 characters or fewer."),
  program: z.string().trim().max(140, "Program must be 140 characters or fewer.").default(""),
  studentStatus: z.enum(["current", "alumni"]).nullable().default(null),
  showAvailability: z.boolean().default(false),
  showProfessionalLinks: z.boolean().default(false),
  showPublicLocation: z.boolean().default(false),
  showEducation: z.boolean().default(false),
  showExperience: z.boolean().default(false),
  skillIds: z.array(z.string().trim().min(1)).max(MAX_PROFILE_SKILLS)
    .transform(uniqueValues),
  availability: z.array(z.enum(["internship", "full-time", "contract"]))
    .max(3)
    .transform(uniqueValues),
  linkedinUrl: httpsUrlSchema,
  githubUrl: githubUrlSchema,
  externalLinks: z.array(externalLinkSchema).max(MAX_PROFILE_LINKS)
    .superRefine((links, context) => {
      const normalizedUrls = links.map((link) => normalizeUrl(link.url));
      if (new Set(normalizedUrls).size !== normalizedUrls.length) {
        context.addIssue({
          code: "custom",
          message: "Each professional link must be unique.",
        });
      }
    }),
  education: z.array(maintainedEntrySchema).max(MAX_PROFILE_EDUCATION_ENTRIES)
    .transform(uniqueValues).default([]),
  experience: z.array(maintainedEntrySchema).max(MAX_PROFILE_EXPERIENCE_ENTRIES)
    .transform(uniqueValues).default([]),
  revision: z.string().datetime({ offset: true }).nullable(),
}).strict().transform((profile) => ({
  ...profile,
  linkedinUrl: normalizeUrl(profile.linkedinUrl),
  githubUrl: normalizeUrl(profile.githubUrl),
  externalLinks: profile.externalLinks.map((link) => ({
    ...link,
    url: normalizeUrl(link.url),
  })),
}));

export type StudentProfileDraftInput = z.infer<typeof studentProfileDraftSchema>;

export const publicationChangeSchema = z.object({
  action: z.enum(["publish", "unpublish"]),
  revision: z.string().datetime({ offset: true }),
}).strict();

export type PublicationChangeInput = z.infer<typeof publicationChangeSchema>;

export function publicProfileValidationDetails(profile: Pick<StudentProfileDraftInput,
  "headline" | "biography" | "program" | "studentStatus" | "skillIds">) {
  const details: Array<{ field: string; code: string; message: string }> = [];
  if (!profile.headline) details.push(required("headline", "Add a professional headline before publishing."));
  if (!profile.biography) details.push(required("biography", "Add a biography before publishing."));
  if (!profile.program) details.push(required("program", "Add your program before publishing."));
  if (!profile.studentStatus) details.push(required("studentStatus", "Choose current student or alumni status before publishing."));
  if (profile.skillIds.length === 0) details.push(required("skillIds", "Choose at least one standardized skill before publishing."));
  return details;
}

export function studentProfileValidationDetails(error: z.ZodError) {
  return error.issues.map((issue) => ({
    field: issue.path.join(".") || "request",
    code: issue.code.toUpperCase(),
    message: issue.message,
  }));
}

function uniqueValues<T>(values: T[]) {
  return [...new Set(values)];
}

function normalizeUrl(value: string) {
  if (!value) return "";
  const url = new URL(value);
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

function required(field: string, message: string) {
  return { field, code: "REQUIRED", message };
}
