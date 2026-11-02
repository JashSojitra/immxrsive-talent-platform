import { notFound } from "next/navigation";
import { requireVerifiedStudent } from "@/auth/server";
import { ProjectWorkspace } from "@/components/project-editor/ProjectWorkspace";
import { ProjectTeam } from "@/components/project-editor/ProjectTeam";
import { getRuntimeDatabase } from "@/db/runtime";
import { getProjectTeam, ProjectError } from "@/projects/service";
export const dynamic = "force-dynamic";
export const metadata = { title: "Project team", robots: { index: false, follow: false } };
export default async function TeamPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { user } = await requireVerifiedStudent(`/student/projects/${projectId}/team`);
  let data;
  try { data = await getProjectTeam({ db: getRuntimeDatabase(), actorUserId: user.id, projectId }); }
  catch (e) { if (e instanceof ProjectError && [403,404].includes(e.status)) notFound(); throw e; }
  return <ProjectWorkspace title={data.project.title} intro="One shared project. Your own words. Build the team through clear invitations, consent and lasting relationships."><ProjectTeam initialData={data} /></ProjectWorkspace>;
}
