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
  const db = getRuntimeDatabase();
  const profile = await getPrivateStudentProfile(db, user.id);
  const projects = profile ? await listProjectRelationships({ db, actorUserId: user.id }) : [];
  return <ProjectWorkspace title="My projects." intro="A workspace for the things you make. Manage your projects, shape your contributions and choose what to publish.">
    {profile ? <>
      <div className={styles.actions}><Link className={styles.primary} href="/student/projects/new">Add Project <span aria-hidden="true">↗</span></Link><Link href="/student/project-invitations">Invitations &amp; shared projects</Link></div>
      <p className={styles.eyebrow}>{projects.filter(project => project.state === "accepted").length} active projects · {projects.filter(project => project.state === "pending").length} pending invitations</p>
      {projects.length ? projects.map(project => <article className={styles.card} key={project.id}>
        <p className={styles.eyebrow}>{project.publicationStatus === "published" ? "Published" : "Private draft"} / {project.isMaintainer ? "Maintainer" : project.state === "accepted" ? "Contributor" : project.state === "pending" ? "Invitation pending" : project.state === "declined" ? "Invitation declined" : "Past contributor"}</p>
        <h2><Link href={`/student/projects/${project.id}/${project.isMaintainer ? "edit" : "team"}`}>{project.title}</Link></h2>
        <p>{project.description}</p>
        <div className={styles.actions}>
          {project.isMaintainer && <><Link href={`/student/projects/${project.id}/edit`}>Edit project</Link><Link href={`/student/projects/${project.id}/showcase`}>XR showcase request &amp; status</Link><Link href={`/student/projects/${project.id}/requests`}>Industry &amp; verification requests</Link></>}
          <Link href={`/student/projects/${project.id}/team`}>{project.state === "pending" ? "Review invitation" : "Contribution & team"}</Link>
          {project.publicationStatus === "published" && <Link href={`/projects/${project.id}`}>View public project</Link>}
        </div>
      </article>) : <section className={styles.card}><h2>Start with something you made.</h2><p>Add a private project, describe your contribution and collect evidence of your work. You can invite collaborators before publishing.</p><Link href="/student/projects/new">Create your first project ↗</Link></section>}
    </> : <section className={styles.card}><h2>Begin with your student profile.</h2><p>Create your private profile before adding a project. Your profile can remain unpublished.</p><Link href="/student/profile/edit">Create private profile ↗</Link></section>}
  </ProjectWorkspace>;
}
