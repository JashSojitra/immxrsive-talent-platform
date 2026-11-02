import Link from "next/link";
import { notFound } from "next/navigation";
import { requireVerifiedStudent } from "@/auth/server";
import { ProjectEditor } from "@/components/project-editor/ProjectEditor";
import { ProjectWorkspace } from "@/components/project-editor/ProjectWorkspace";
import { getRuntimeDatabase } from "@/db/runtime";
import { getProjectEditorData, getProjectRoles, ProjectError } from "@/projects/service";
export const dynamic = "force-dynamic";
export const metadata = { title: "Edit project", robots: { index: false, follow: false } };
export default async function EditProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params; const { user } = await requireVerifiedStudent(`/student/projects/${projectId}/edit`);
  const db = getRuntimeDatabase();
  let data;
  try {
    data = await getProjectEditorData({ db, actorUserId: user.id, projectId });
  } catch (error) { if (error instanceof ProjectError && [403, 404].includes(error.status)) notFound(); throw error; }
  return <ProjectWorkspace title="Shape the evidence." intro="Maintain the shared project story. Save your changes, preview the result, and choose when it becomes public."><p><Link href={`/student/projects/${projectId}/team`}>Contribution &amp; team</Link></p><ProjectEditor initialData={data} roles={await getProjectRoles(db)} /></ProjectWorkspace>;
}
