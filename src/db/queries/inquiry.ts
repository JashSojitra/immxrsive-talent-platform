import { and, eq, isNotNull } from "drizzle-orm";

import type { Database } from "@/db/client";
import { authUsers, inquiries, projects, studentAffiliations, studentProfiles, students } from "@/db/schema";
import type { InquiryRequest } from "@/validation/inquiry";

export interface InquiryConfirmation {
  id: string;
  message: string;
}

export async function createContextualInquiry(
  db: Database,
  input: InquiryRequest,
): Promise<InquiryConfirmation | null> {
  return db.transaction(async (tx) => {
    const source = input.sourceType === "student"
      ? await resolveStudentSource(tx, input.sourceId)
      : await resolveProjectSource(tx, input.sourceId);

    if (!source) return null;

    const [created] = await tx
      .insert(inquiries)
      .values({
        sourceType: input.sourceType,
        sourceId: source.id,
        sourceName: source.name,
        sourceUrl: source.url,
        studentId: source.studentId,
        studentProfileId: source.studentProfileId,
        projectId: source.projectId,
        companyName: input.companyName,
        contactName: input.contactName,
        contactEmail: input.contactEmail,
        description: input.description,
      })
      .returning({ id: inquiries.id });

    if (!created) throw new Error("Inquiry insert did not return a record.");
    return { id: created.id, message: "Inquiry submitted successfully." };
  });
}

type InquiryTransaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

async function resolveStudentSource(db: InquiryTransaction, sourceId: string) {
  const [student] = await db
    .select({ id: students.id, name: students.name })
    .from(students)
    .where(and(eq(students.id, sourceId), eq(students.profileStatus, "published")))
    .limit(1);

  if (student) return {
    ...student, url: `/students/${student.id}`,
    studentId: student.id, studentProfileId: null, projectId: null,
  };

  // Validate before comparing against a UUID column so malformed public IDs
  // remain an unavailable source, rather than a PostgreSQL cast error.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sourceId)) return null;
  const [profile] = await db
    .select({ id: studentProfiles.id, name: authUsers.name })
    .from(studentProfiles)
    .innerJoin(authUsers, eq(authUsers.id, studentProfiles.ownerUserId))
    .innerJoin(studentAffiliations, eq(studentAffiliations.userId, studentProfiles.ownerUserId))
    .where(and(
      eq(studentProfiles.id, sourceId),
      eq(studentProfiles.publicationStatus, "published"),
      isNotNull(studentProfiles.studentStatus),
      eq(studentAffiliations.status, "verified"),
    ))
    .limit(1)
    .for("share");

  return profile ? {
    ...profile, url: `/students/${profile.id}`,
    studentId: null, studentProfileId: profile.id, projectId: null,
  } : null;
}

async function resolveProjectSource(db: InquiryTransaction, sourceId: string) {
  const [project] = await db
    .select({ id: projects.id, name: projects.title })
    .from(projects)
    .where(and(eq(projects.id, sourceId), eq(projects.publicationStatus, "published")))
    .limit(1);

  return project ? {
    ...project, url: `/projects/${project.id}`,
    studentId: null, studentProfileId: null, projectId: project.id,
  } : null;
}
