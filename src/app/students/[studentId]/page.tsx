import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { StudentProfileView } from "@/components/student-profile/StudentProfileView";
import { getPublicStudentProfile } from "@/db/public-student-profile";

export const dynamic = "force-dynamic";

type StudentProfilePageProps = {
  params: Promise<{ studentId: string }>;
};

export async function generateMetadata({ params }: StudentProfilePageProps): Promise<Metadata> {
  const { studentId } = await params;
  const profile = await getPublicStudentProfile(studentId);

  if (!profile) {
    return {
      title: "Student profile not available",
      description: "The requested ImmXrsive student profile is not publicly available.",
      robots: { index: false, follow: false },
    };
  }

  return {
    title: profile.name,
    description: `${profile.headline} — ${profile.program}. View verified skills and project evidence on ImmXrsive.`,
  };
}

export default async function StudentProfilePage({ params }: StudentProfilePageProps) {
  const { studentId } = await params;
  const profile = await getPublicStudentProfile(studentId);

  if (!profile) notFound();

  return <StudentProfileView profile={profile} />;
}
