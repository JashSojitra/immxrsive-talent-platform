import { notFound } from "next/navigation";
import { requireAuthenticatedUser } from "@/auth/server";
import { getRuntimeDatabase } from "@/db/runtime";
import { ProjectError } from "@/projects/service";
import { ProjectWorkspace } from "@/components/project-editor/ProjectWorkspace";
import { studioDetail } from "./service";
import { Review } from "./Review";
export async function DetailPage({ projectId, staff = false }: { projectId: string; staff?: boolean }) {
  const user = await requireAuthenticatedUser(staff ? `/studio/${encodeURIComponent(projectId)}` : `/student/projects/${encodeURIComponent(projectId)}/showcase`);
  let detail: Awaited<ReturnType<typeof studioDetail>>;
  try { detail = await studioDetail(getRuntimeDatabase(), user.id, projectId); }
  catch (e) { if (e instanceof ProjectError && e.status === 404) notFound(); throw e; }
  if (staff ? !detail.role : !detail.owner) notFound();
  return <ProjectWorkspace title={detail.project.title} intro="XR showcase / Review, respond and retain ownership."><Review initial={detail} /></ProjectWorkspace>;
}
