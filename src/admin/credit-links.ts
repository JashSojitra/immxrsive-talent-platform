import "server-only";
import { and, asc, eq, notInArray } from "drizzle-orm";
import { resolvedEmailCredits } from "./credit-queries";
import type { Database } from "@/db/client";
import { adminCreditEmails, adminCreditLinks, adminProjectDetails, projects, studentAffiliations, studentProfiles } from "@/db/schema";
type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

async function ensureCreditProfile(tx: Tx, userId: string) {
  // A matched, verified account gets a private profile; publication stays the student's choice.
  await tx.insert(studentProfiles).values({ ownerUserId: userId }).onConflictDoNothing({ target: studentProfiles.ownerUserId });
}

export async function reconcileProjectCredits(tx: Tx, projectId: string) {
  await tx.select({ id: projects.id }).from(projects).where(eq(projects.id, projectId)).for("update");
  const [detail] = await tx.select({ content: adminProjectDetails.content }).from(adminProjectDetails).where(eq(adminProjectDetails.projectId, projectId));
  if (!detail) return;
  const matches = await tx.select({ userId: studentAffiliations.userId }).from(adminCreditEmails)
    .innerJoin(studentAffiliations, and(eq(studentAffiliations.institutionalEmail, adminCreditEmails.institutionalEmail), eq(studentAffiliations.status, "verified")))
    .where(eq(adminCreditEmails.projectId, projectId));
  for (const { userId } of matches) await ensureCreditProfile(tx, userId);
  const emailProfiles = await resolvedEmailCredits(tx, [projectId]);
  const ids = [...new Set([...detail.content.credits.flatMap(c => c.profileId ? [c.profileId.toLowerCase()] : []), ...emailProfiles.map(c => c.profileId)])];
  await tx.delete(adminCreditLinks).where(and(eq(adminCreditLinks.projectId, projectId), ids.length ? notInArray(adminCreditLinks.profileId, ids) : undefined));
  if (ids.length) await tx.insert(adminCreditLinks).values(ids.map(profileId => ({ projectId, profileId }))).onConflictDoNothing();
}

export async function linkVerifiedCredits(tx: Tx, userId: string) {
  const rows = await tx.select({ projectId: adminCreditEmails.projectId }).from(studentAffiliations)
    .innerJoin(adminCreditEmails, eq(adminCreditEmails.institutionalEmail, studentAffiliations.institutionalEmail))
    .where(and(eq(studentAffiliations.userId, userId), eq(studentAffiliations.status, "verified"))).orderBy(asc(adminCreditEmails.projectId));
  for (const { projectId } of rows) await reconcileProjectCredits(tx, projectId);
}
export async function syncSignedInCredits(db: Database, userId: string) {
  await db.transaction(tx => linkVerifiedCredits(tx, userId));
}
export function creditSessionHooks(database: () => Database) {
  return { session: { create: { after: async (session: { userId: string }) => { await syncSignedInCredits(database(), session.userId); } } } };
}
