import { and, eq } from "drizzle-orm";

import type { Database } from "@/db/client";
import { inquiries, projects, students } from "@/db/schema";
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
        studentId: input.sourceType === "student" ? source.id : null,
        projectId: input.sourceType === "project" ? source.id : null,
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

  return student ? { ...student, url: `/students/${student.id}` } : null;
}

async function resolveProjectSource(db: InquiryTransaction, sourceId: string) {
  const [project] = await db
    .select({ id: projects.id, name: projects.title })
    .from(projects)
    .where(eq(projects.id, sourceId))
    .limit(1);

  return project ? { ...project, url: `/projects/${project.id}` } : null;
}
