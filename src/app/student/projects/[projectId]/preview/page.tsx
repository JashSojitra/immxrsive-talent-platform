import { notFound } from "next/navigation";
import { requireVerifiedStudent } from "@/auth/server";
import { ProjectDetailView } from "@/components/project-detail/ProjectDetailView";
import { getRuntimeDatabase } from "@/db/runtime";
import { queryProjectPresentation } from "@/db/queries/project-detail";
import { getProjectEditorData, ProjectError } from "@/projects/service";
export const dynamic = "force-dynamic";
export const metadata = { title: "Private project preview", robots: { index: false, follow: false } };
export default async function PreviewProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params; const { user } = await requireVerifiedStudent(`/student/projects/${projectId}/preview`);
  const db = getRuntimeDatabase();
  try {
    await getProjectEditorData({ db, actorUserId: user.id, projectId });
  } catch (error) { if (error instanceof ProjectError && [403, 404].includes(error.status)) notFound(); throw error; }
  const project = await queryProjectPresentation(db, projectId, false); if (!project) notFound();
  return <ProjectDetailView project={project} preview />;
}
