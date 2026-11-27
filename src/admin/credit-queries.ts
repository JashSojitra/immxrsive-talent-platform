import { and, eq, inArray } from "drizzle-orm";
import type { Database } from "@/db/client";
import { adminCreditEmails, authUsers, studentAffiliations, studentProfiles } from "@/db/schema";
// Returns no email fields, including when used by a public projection.
export async function resolvedEmailCredits(db: Pick<Database, "select">, projectIds: string[], profileId?: string) {
  if (!projectIds.length && !profileId) return [];
  return db.select({ projectId: adminCreditEmails.projectId, creditIndex: adminCreditEmails.creditIndex, profileId: studentProfiles.id, publicationStatus: studentProfiles.publicationStatus, name: authUsers.name }).from(adminCreditEmails)
    .innerJoin(studentAffiliations, and(eq(studentAffiliations.institutionalEmail, adminCreditEmails.institutionalEmail), eq(studentAffiliations.status, "verified")))
    .innerJoin(studentProfiles, eq(studentProfiles.ownerUserId, studentAffiliations.userId))
    .innerJoin(authUsers, eq(authUsers.id, studentProfiles.ownerUserId)).where(and(projectIds.length ? inArray(adminCreditEmails.projectId, projectIds) : undefined, profileId ? eq(studentProfiles.id, profileId) : undefined));
}
