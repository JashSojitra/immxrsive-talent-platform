import Link from "next/link";
import { requireVerifiedStudent } from "@/auth/server";
import { ProjectWorkspace } from "@/components/project-editor/ProjectWorkspace";
import styles from "@/components/project-editor/project-editor.module.css";
import { getRuntimeDatabase } from "@/db/runtime";
import { getPrivateStudentProfile } from "@/profile/service";
import { listProjectRelationships } from "@/projects/service";

export const dynamic = "force-dynamic";
export const metadata = { title: "My Projects", robots: { index: false, follow: false } };
export default async function MyProjectsPage() {
  const { user } = await requireVerifiedStudent("/student/projects");
  const db = getRuntimeDatabase(); const profile = await getPrivateStudentProfile(db, user.id);
  const projects = profile ? await listProjectRelationships({ db, actorUserId: user.id }) : [];
  return <ProjectWorkspace title="Work worth sharing." intro="Build a clear record of what you made. Start privately, shape the evidence, then decide when to share it.">
    {profile ? <><div className={styles.actions}><Link href="/student/projects/new">Add Project</Link><Link href="/student/project-invitations">Invitations &amp; shared projects</Link></div>{projects.length ? projects.map(project => <article className={styles.card} key={project.id}><p className={styles.eyebrow}>{project.publicationStatus === "published" ? "Published" : "Private draft"}</p><h2><Link href={`/student/projects/${project.id}/${project.isMaintainer ? "edit" : "team"}`}>{project.title}</Link></h2><code>{project.id}</code><div className={styles.actions}>{project.isMaintainer ? <Link href={`/student/projects/${project.id}/edit`}>Edit project</Link> : null}<Link href={`/student/projects/${project.id}/team`}>Contribution &amp; team ({project.state})</Link>{project.publicationStatus === "published" ? <Link href={`/projects/${project.id}`}>View public project</Link> : null}</div></article>) : <p>No projects yet. Your next piece of evidence starts here.</p>}</> : <section className={styles.card}><h2>Begin with your student profile.</h2><p>Create your private profile before adding a project. Your profile can remain unpublished.</p><Link href="/student/profile/edit">Create private profile</Link></section>}
  </ProjectWorkspace>;
}
