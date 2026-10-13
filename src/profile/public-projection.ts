import { and, asc, eq } from "drizzle-orm";

import type { Database } from "@/db/client";
import {
  authUsers,
  skills,
  studentProfileAvailability,
  studentProfileEducation,
  studentProfileExperience,
  studentProfileLinks,
  studentProfiles,
  studentProfileSkills,
} from "@/db/schema";
import type { PublicStudentProfile } from "@/db/queries/student-profile";
import type { PrivateStudentProfile } from "@/profile/service";

type ProjectionSelector =
  | { profileId: string; ownerUserId?: never }
  | { ownerUserId: string; profileId?: never };

export async function querySelfServiceProfileProjection(
  db: Database,
  selector: ProjectionSelector,
  requirePublished = true,
): Promise<PublicStudentProfile | null> {
  const selectorCondition = selector.profileId !== undefined
    ? eq(studentProfiles.id, selector.profileId)
    : eq(studentProfiles.ownerUserId, selector.ownerUserId);
  const conditions = [selectorCondition];
  if (requirePublished) conditions.push(eq(studentProfiles.publicationStatus, "published"));

  const [profile] = await db.select({
    id: studentProfiles.id,
    name: authUsers.name,
    headline: studentProfiles.headline,
    biography: studentProfiles.biography,
    publicLocation: studentProfiles.publicLocation,
    program: studentProfiles.program,
    status: studentProfiles.studentStatus,
    showAvailability: studentProfiles.showAvailability,
    showProfessionalLinks: studentProfiles.showProfessionalLinks,
    showPublicLocation: studentProfiles.showPublicLocation,
    showEducation: studentProfiles.showEducation,
    showExperience: studentProfiles.showExperience,
  }).from(studentProfiles)
    .innerJoin(authUsers, eq(authUsers.id, studentProfiles.ownerUserId))
    .where(and(...conditions)).limit(1);
  if (!profile) return null;

  const [skillRows, availabilityRows, linkRows, educationRows, experienceRows] = await Promise.all([
    db.select({ name: skills.name }).from(studentProfileSkills)
      .innerJoin(skills, eq(skills.id, studentProfileSkills.skillId))
      .where(eq(studentProfileSkills.profileId, profile.id))
      .orderBy(asc(studentProfileSkills.displayOrder), asc(skills.name)),
    profile.showAvailability
      ? db.select({ value: studentProfileAvailability.availabilityValue })
          .from(studentProfileAvailability)
          .where(eq(studentProfileAvailability.profileId, profile.id))
          .orderBy(asc(studentProfileAvailability.displayOrder))
      : Promise.resolve([]),
    profile.showProfessionalLinks
      ? db.select({
          type: studentProfileLinks.linkType,
          label: studentProfileLinks.label,
          url: studentProfileLinks.url,
        }).from(studentProfileLinks)
          .where(eq(studentProfileLinks.profileId, profile.id))
          .orderBy(asc(studentProfileLinks.displayOrder))
      : Promise.resolve([]),
    profile.showEducation
      ? db.select({ description: studentProfileEducation.description })
          .from(studentProfileEducation)
          .where(eq(studentProfileEducation.profileId, profile.id))
          .orderBy(asc(studentProfileEducation.displayOrder))
      : Promise.resolve([]),
    profile.showExperience
      ? db.select({ description: studentProfileExperience.description })
          .from(studentProfileExperience)
          .where(eq(studentProfileExperience.profileId, profile.id))
          .orderBy(asc(studentProfileExperience.displayOrder))
      : Promise.resolve([]),
  ]);

  return {
    id: profile.id,
    name: profile.name,
    headline: profile.headline,
    biography: profile.biography,
    program: profile.program,
    status: profile.status,
    skills: skillRows.map(({ name }) => name),
    projects: [],
    ...(profile.showPublicLocation && profile.publicLocation
      ? { location: profile.publicLocation }
      : {}),
    ...(profile.showAvailability
      ? { availability: availabilityRows.map(({ value }) => value) }
      : {}),
    ...(profile.showProfessionalLinks ? { links: linkRows } : {}),
    ...(profile.showEducation
      ? { education: educationRows.map(({ description }) => description) }
      : {}),
    ...(profile.showExperience
      ? { experience: experienceRows.map(({ description }) => description) }
      : {}),
  };
}

export function hiddenProfileFields(profile: PrivateStudentProfile) {
  return [
    !profile.showAvailability && profile.availability.length > 0 ? "Availability" : null,
    !profile.showProfessionalLinks && Boolean(
      profile.linkedinUrl || profile.githubUrl || profile.externalLinks.length,
    ) ? "Professional links" : null,
    !profile.showPublicLocation && profile.publicLocation ? "Location" : null,
    !profile.showEducation && profile.education.length > 0 ? "Education" : null,
    !profile.showExperience && profile.experience.length > 0 ? "Experience" : null,
  ].filter((value): value is string => Boolean(value));
}
