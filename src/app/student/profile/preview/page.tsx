import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { requireVerifiedStudent } from "@/auth/server";
import { StudentProfileView } from "@/components/student-profile/StudentProfileView";
import { getRuntimeDatabase } from "@/db/runtime";
import { hiddenProfileFields, querySelfServiceProfileProjection } from "@/profile/public-projection";
import { getPrivateStudentProfile } from "@/profile/service";

export const metadata: Metadata = {
  title: "Private public-profile preview",
  description: "Owner-only preview of the saved NOT ImmXrsive public profile projection.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function StudentProfilePreviewPage() {
  const { user } = await requireVerifiedStudent("/student/profile/preview");
  const db = getRuntimeDatabase();
  const [privateProfile, projection] = await Promise.all([
    getPrivateStudentProfile(db, user.id),
    querySelfServiceProfileProjection(db, { ownerUserId: user.id }, false),
  ]);
  if (!privateProfile || !projection) redirect("/student/profile/edit");

  return <StudentProfileView profile={projection} preview={{
    hiddenFields: hiddenProfileFields(privateProfile),
  }} />;
}
