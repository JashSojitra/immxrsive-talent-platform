import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { InquiryPage } from "@/components/inquiry/InquiryPage";
import { getPublicProject } from "@/db/public-project";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Project inquiry",
  description: "Contact ImmXrsive about a canonical project.",
  robots: { index: false, follow: false },
};

export default async function ProjectInquiryPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const project = await getPublicProject(projectId);
  if (!project) notFound();

  return <InquiryPage source={{
    type: "project",
    id: project.id,
    name: project.title,
    detail: project.description,
    sourceUrl: `/projects/${project.id}`,
  }} />;
}
