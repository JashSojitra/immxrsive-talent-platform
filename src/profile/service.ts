import "server-only";

import { and, asc, eq, inArray } from "drizzle-orm";

import type { Database } from "@/db/client";
import {
  availabilityOptions,
  skills,
  studentProfileAvailability,
  studentProfileEducation,
  studentProfileExperience,
  studentProfileLinks,
  studentProfiles,
  studentProfileSkills,
} from "@/db/schema";
import type { StudentProfileDraftInput } from "@/validation/student-profile";
import { publicProfileValidationDetails } from "@/validation/student-profile";

export type ProfileEditorVocabulary = {
  skills: Array<{ id: string; name: string }>;
  availability: Array<{
    value: "internship" | "full-time" | "contract";
    label: string;
  }>;
};

export type PrivateStudentProfile = {
  id: string;
  publicationStatus: "published" | "unpublished";
  headline: string;
  biography: string;
  publicLocation: string;
  program: string;
  studentStatus: "current" | "alumni" | null;
  showAvailability: boolean;
  showProfessionalLinks: boolean;
  showPublicLocation: boolean;
  showEducation: boolean;
  showExperience: boolean;
  skillIds: string[];
  availability: Array<"internship" | "full-time" | "contract">;
  linkedinUrl: string;
  githubUrl: string;
  externalLinks: Array<{
    label: string;
    url: string;
    type: "portfolio" | "other";
  }>;
  education: string[];
  experience: string[];
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
};

export type ProfileFailureCode =
  | "PROFILE_EXISTS"
  | "PROFILE_NOT_FOUND"
  | "INVALID_SKILL"
  | "INVALID_AVAILABILITY"
  | "EDIT_CONFLICT"
  | "PUBLICATION_VALIDATION";

export class StudentProfileError extends Error {
  constructor(
    readonly code: ProfileFailureCode,
    readonly status: number,
    message: string,
    readonly details: Array<{ field: string; code: string; message: string }> = [],
  ) {
    super(message);
    this.name = "StudentProfileError";
  }
}

export async function getProfileEditorVocabulary(
  db: Database,
): Promise<ProfileEditorVocabulary> {
  const [skillRows, availabilityRows] = await Promise.all([
    db.select({ id: skills.id, name: skills.name }).from(skills)
      .orderBy(asc(skills.displayOrder), asc(skills.name)),
    db.select({ value: availabilityOptions.value }).from(availabilityOptions)
      .orderBy(asc(availabilityOptions.displayOrder)),
  ]);
  return {
    skills: skillRows,
    availability: availabilityRows.map(({ value }) => ({
      value,
      label: labelValue(value),
    })),
  };
}

export async function getPrivateStudentProfile(
  db: Database,
  ownerUserId: string,
): Promise<PrivateStudentProfile | null> {
  const [profile] = await db.select().from(studentProfiles)
    .where(eq(studentProfiles.ownerUserId, ownerUserId)).limit(1);
  if (!profile) return null;

  const [skillRows, availabilityRows, linkRows, educationRows, experienceRows] = await Promise.all([
    db.select({ skillId: studentProfileSkills.skillId })
      .from(studentProfileSkills)
      .where(eq(studentProfileSkills.profileId, profile.id))
      .orderBy(asc(studentProfileSkills.displayOrder)),
    db.select({ value: studentProfileAvailability.availabilityValue })
      .from(studentProfileAvailability)
      .where(eq(studentProfileAvailability.profileId, profile.id))
      .orderBy(asc(studentProfileAvailability.displayOrder)),
    db.select({
      type: studentProfileLinks.linkType,
      label: studentProfileLinks.label,
      url: studentProfileLinks.url,
    }).from(studentProfileLinks)
      .where(eq(studentProfileLinks.profileId, profile.id))
      .orderBy(asc(studentProfileLinks.displayOrder)),
    db.select({ description: studentProfileEducation.description })
      .from(studentProfileEducation)
      .where(eq(studentProfileEducation.profileId, profile.id))
      .orderBy(asc(studentProfileEducation.displayOrder)),
    db.select({ description: studentProfileExperience.description })
      .from(studentProfileExperience)
      .where(eq(studentProfileExperience.profileId, profile.id))
      .orderBy(asc(studentProfileExperience.displayOrder)),
  ]);

  return {
    id: profile.id,
    publicationStatus: profile.publicationStatus,
    headline: profile.headline,
    biography: profile.biography,
    publicLocation: profile.publicLocation,
    program: profile.program,
    studentStatus: profile.studentStatus,
    showAvailability: profile.showAvailability,
    showProfessionalLinks: profile.showProfessionalLinks,
    showPublicLocation: profile.showPublicLocation,
    showEducation: profile.showEducation,
    showExperience: profile.showExperience,
    skillIds: skillRows.map(({ skillId }) => skillId),
    availability: availabilityRows.map(({ value }) => value),
    linkedinUrl: linkRows.find(({ type }) => type === "linkedin")?.url ?? "",
    githubUrl: linkRows.find(({ type }) => type === "github")?.url ?? "",
    externalLinks: linkRows.flatMap((link) =>
      link.type === "portfolio" || link.type === "other"
        ? [{ label: link.label, url: link.url, type: link.type }]
        : [],
    ),
    education: educationRows.map(({ description }) => description),
    experience: experienceRows.map(({ description }) => description),
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
    publishedAt: profile.publishedAt,
  };
}

export async function createPrivateStudentProfile(input: {
  db: Database;
  ownerUserId: string;
  draft: StudentProfileDraftInput;
}) {
  await validateVocabulary(input.db, input.draft);
  const createdAt = new Date();
  try {
    await input.db.transaction(async (transaction) => {
      const [profile] = await transaction.insert(studentProfiles).values({
        ownerUserId: input.ownerUserId,
        publicationStatus: "unpublished",
        headline: input.draft.headline,
        biography: input.draft.biography,
        publicLocation: input.draft.publicLocation,
        program: input.draft.program,
        studentStatus: input.draft.studentStatus,
        showAvailability: input.draft.showAvailability,
        showProfessionalLinks: input.draft.showProfessionalLinks,
        showPublicLocation: input.draft.showPublicLocation,
        showEducation: input.draft.showEducation,
        showExperience: input.draft.showExperience,
        createdAt,
        updatedAt: createdAt,
      }).returning({ id: studentProfiles.id });
      await replaceAssociations(transaction, profile.id, input.draft);
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new StudentProfileError(
        "PROFILE_EXISTS",
        409,
        "This student account already has a private profile.",
      );
    }
    throw error;
  }
  return getRequiredProfile(input.db, input.ownerUserId);
}

export async function updatePrivateStudentProfile(input: {
  db: Database;
  ownerUserId: string;
  draft: StudentProfileDraftInput;
}) {
  if (!input.draft.revision) {
    throw new StudentProfileError(
      "EDIT_CONFLICT",
      409,
      "Reload the current profile before saving changes.",
    );
  }
  await validateVocabulary(input.db, input.draft);
  const revision = new Date(input.draft.revision);
  const updatedAt = new Date();

  await input.db.transaction(async (transaction) => {
    const [current] = await transaction.select({
      id: studentProfiles.id,
      publicationStatus: studentProfiles.publicationStatus,
    }).from(studentProfiles).where(and(
      eq(studentProfiles.ownerUserId, input.ownerUserId),
      eq(studentProfiles.updatedAt, revision),
    )).limit(1);
    if (!current) {
      const [existing] = await transaction.select({ id: studentProfiles.id })
        .from(studentProfiles)
        .where(eq(studentProfiles.ownerUserId, input.ownerUserId))
        .limit(1);
      throw new StudentProfileError(
        existing ? "EDIT_CONFLICT" : "PROFILE_NOT_FOUND",
        existing ? 409 : 404,
        existing
          ? "This profile changed in another session. Reload before saving."
          : "Create a private profile before updating it.",
      );
    }
    if (current.publicationStatus === "published") {
      assertPublishable(input.draft);
    }
    const [updated] = await transaction.update(studentProfiles).set({
      headline: input.draft.headline,
      biography: input.draft.biography,
      publicLocation: input.draft.publicLocation,
      program: input.draft.program,
      studentStatus: input.draft.studentStatus,
      showAvailability: input.draft.showAvailability,
      showProfessionalLinks: input.draft.showProfessionalLinks,
      showPublicLocation: input.draft.showPublicLocation,
      showEducation: input.draft.showEducation,
      showExperience: input.draft.showExperience,
      updatedAt,
    }).where(and(
      eq(studentProfiles.id, current.id),
      eq(studentProfiles.updatedAt, revision),
    )).returning({ id: studentProfiles.id });

    if (!updated) {
      throw new StudentProfileError(
        "EDIT_CONFLICT",
        409,
        "This profile changed in another session. Reload before saving.",
      );
    }
    await replaceAssociations(transaction, updated.id, input.draft);
  });

  return getRequiredProfile(input.db, input.ownerUserId);
}

export async function changeProfilePublication(input: {
  db: Database;
  ownerUserId: string;
  action: "publish" | "unpublish";
  revision: string;
}) {
  const revision = new Date(input.revision);
  const updatedAt = new Date();
  await input.db.transaction(async (transaction) => {
    const [profile] = await transaction.select().from(studentProfiles).where(and(
      eq(studentProfiles.ownerUserId, input.ownerUserId),
      eq(studentProfiles.updatedAt, revision),
    )).limit(1);
    if (!profile) {
      const [existing] = await transaction.select({ id: studentProfiles.id })
        .from(studentProfiles).where(eq(studentProfiles.ownerUserId, input.ownerUserId)).limit(1);
      throw new StudentProfileError(
        existing ? "EDIT_CONFLICT" : "PROFILE_NOT_FOUND",
        existing ? 409 : 404,
        existing ? "This profile changed in another session. Reload before changing publication."
          : "Create and save a profile before publishing.",
      );
    }
    if (input.action === "publish") {
      const skillRows = await transaction.select({ skillId: studentProfileSkills.skillId })
        .from(studentProfileSkills).where(eq(studentProfileSkills.profileId, profile.id));
      assertPublishable({ ...profile, skillIds: skillRows.map(({ skillId }) => skillId) });
    }
    const publicationStatus = input.action === "publish" ? "published" : "unpublished";
    const [updated] = await transaction.update(studentProfiles).set({
      publicationStatus,
      publishedAt: input.action === "publish" ? updatedAt : profile.publishedAt,
      updatedAt,
    }).where(and(
      eq(studentProfiles.id, profile.id),
      eq(studentProfiles.ownerUserId, input.ownerUserId),
      eq(studentProfiles.updatedAt, revision),
    )).returning({ id: studentProfiles.id });
    if (!updated) {
      throw new StudentProfileError("EDIT_CONFLICT", 409,
        "This profile changed in another session. Reload before changing publication.");
    }
  });
  return getRequiredProfile(input.db, input.ownerUserId);
}

async function getRequiredProfile(db: Database, ownerUserId: string) {
  const profile = await getPrivateStudentProfile(db, ownerUserId);
  if (!profile) throw new StudentProfileError("PROFILE_NOT_FOUND", 404, "Profile not found.");
  return profile;
}

async function validateVocabulary(db: Database, draft: StudentProfileDraftInput) {
  if (draft.skillIds.length > 0) {
    const validSkills = await db.select({ id: skills.id }).from(skills)
      .where(inArray(skills.id, draft.skillIds));
    if (validSkills.length !== draft.skillIds.length) {
      throw new StudentProfileError(
        "INVALID_SKILL",
        422,
        "Choose skills from the standardized skill list.",
      );
    }
  }
  if (draft.availability.length > 0) {
    const validAvailability = await db.select({ value: availabilityOptions.value })
      .from(availabilityOptions)
      .where(inArray(availabilityOptions.value, draft.availability));
    if (validAvailability.length !== draft.availability.length) {
      throw new StudentProfileError(
        "INVALID_AVAILABILITY",
        422,
        "Choose supported availability options.",
      );
    }
  }
}

async function replaceAssociations(
  db: Pick<Database, "delete" | "insert">,
  profileId: string,
  draft: StudentProfileDraftInput,
) {
  await db.delete(studentProfileSkills).where(eq(studentProfileSkills.profileId, profileId));
  await db.delete(studentProfileAvailability)
    .where(eq(studentProfileAvailability.profileId, profileId));
  await db.delete(studentProfileLinks).where(eq(studentProfileLinks.profileId, profileId));
  await db.delete(studentProfileEducation).where(eq(studentProfileEducation.profileId, profileId));
  await db.delete(studentProfileExperience).where(eq(studentProfileExperience.profileId, profileId));
  if (draft.skillIds.length > 0) {
    await db.insert(studentProfileSkills).values(draft.skillIds.map((skillId, displayOrder) => ({
      profileId, skillId, displayOrder,
    })));
  }
  if (draft.availability.length > 0) {
    await db.insert(studentProfileAvailability).values(
      draft.availability.map((availabilityValue, displayOrder) => ({
        profileId, availabilityValue, displayOrder,
      })),
    );
  }
  const links = [
    ...(draft.linkedinUrl ? [{ linkType: "linkedin" as const, label: "LinkedIn", url: draft.linkedinUrl }] : []),
    ...(draft.githubUrl ? [{ linkType: "github" as const, label: "GitHub", url: draft.githubUrl }] : []),
    ...draft.externalLinks.map((link) => ({
      linkType: link.type,
      label: link.label,
      url: link.url,
    })),
  ];
  if (links.length > 0) {
    await db.insert(studentProfileLinks).values(links.map((link, displayOrder) => ({
      profileId, ...link, displayOrder,
    })));
  }
  if (draft.education.length > 0) {
    await db.insert(studentProfileEducation).values(
      draft.education.map((description, displayOrder) => ({
        profileId, description, displayOrder,
      })),
    );
  }
  if (draft.experience.length > 0) {
    await db.insert(studentProfileExperience).values(
      draft.experience.map((description, displayOrder) => ({
        profileId, description, displayOrder,
      })),
    );
  }
}

function labelValue(value: string) {
  return value.split("-").map((part) => part[0].toUpperCase() + part.slice(1)).join(" ");
}

function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  if ("code" in error && (error as { code?: unknown }).code === "23505") return true;
  return "cause" in error && isUniqueViolation((error as { cause?: unknown }).cause);
}

function assertPublishable(profile: Pick<StudentProfileDraftInput,
  "headline" | "biography" | "program" | "studentStatus" | "skillIds">) {
  const details = publicProfileValidationDetails(profile);
  if (details.length > 0) {
    throw new StudentProfileError(
      "PUBLICATION_VALIDATION",
      422,
      "Complete the required public profile fields before publishing.",
      details,
    );
  }
}
