import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { InquiryPage } from "@/components/inquiry/InquiryPage";
import { getPublicStudentProfile } from "@/db/public-student-profile";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Employer inquiry",
  description: "Contact ImmXrsive about a public student profile.",
  robots: { index: false, follow: false },
};

export default async function StudentInquiryPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  const profile = await getPublicStudentProfile(studentId);
  if (!profile) notFound();

  return <InquiryPage source={{
    type: "student",
    id: profile.id,
    name: profile.name,
    detail: profile.headline,
    sourceUrl: `/students/${profile.id}`,
  }} />;
}
