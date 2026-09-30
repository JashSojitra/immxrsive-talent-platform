import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProjectDetailView } from "@/components/project-detail/ProjectDetailView";
import { getPublicProject } from "@/db/public-project";

export const dynamic = "force-dynamic";

type ProjectPageProps = { params: Promise<{ projectId: string }> };

export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
  const { projectId } = await params;
  const project = await getPublicProject(projectId);

  if (!project) {
    return {
      title: "Project not available",
      description: "The requested ImmXrsive project is not available.",
      robots: { index: false, follow: false },
    };
  }

  return { title: project.title, description: project.description };
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
  const project = await getPublicProject(projectId);
  if (!project) notFound();

  return <ProjectDetailView project={project} />;
}
