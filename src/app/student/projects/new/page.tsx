import Link from "next/link";
import { requireVerifiedStudent } from "@/auth/server";
import { ProjectEditor } from "@/components/project-editor/ProjectEditor";
import { ProjectWorkspace } from "@/components/project-editor/ProjectWorkspace";
import { getRuntimeDatabase } from "@/db/runtime";
import { getPrivateStudentProfile } from "@/profile/service";
import { getProjectRoles } from "@/projects/service";
export const dynamic = "force-dynamic";
export const metadata = { title: "Add Project", robots: { index: false, follow: false } };
export default async function NewProjectPage() {
  const { user } = await requireVerifiedStudent("/student/projects/new");
  const db = getRuntimeDatabase(); const profile = await getPrivateStudentProfile(db, user.id);
  return <ProjectWorkspace title="Give the work a stage." intro="Add a project manually. Tell its story, connect the source material, and gather the evidence.">{profile ? <ProjectEditor initialData={null} roles={await getProjectRoles(db)} /> : <p><Link href="/student/profile/edit">Create your private student profile first</Link>. It does not need to be published.</p>}</ProjectWorkspace>;
}
