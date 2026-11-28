import Link from "next/link";
import Image from "next/image";
import type { PublicProjectListItem } from "@/projects/public-directory";
import styles from "./discovery.module.css";
export function ProjectCard({ project, index = 0 }: { project: PublicProjectListItem; index?: number }) {
  return <article className={styles.projectCard}>
    {project.media[0] && <Image className={styles.projectThumbnail} src={project.media[0].url} alt={project.media[0].alt} width={640} height={400} unoptimized />}
    <div className={styles.cardTop}><span>{project.domain}</span><span>{String(index + 1).padStart(2,"0")}</span></div>
    <h2 className="ui-card-title"><Link href={`/projects/${encodeURIComponent(project.id)}`}>{project.title}<span aria-hidden="true">&#8599;</span></Link></h2>
    <p>{project.description.length > 190 ? `${project.description.slice(0,187)}…` : project.description}</p>
    <div className={styles.tags}>{project.technologies.slice(0,4).map(tech => <span key={tech}>{tech}</span>)}</div>
    <div className={styles.cardMeta}><span>{project.managementMode === "ADMIN_MANAGED" ? "Staff-curated" : "Student project"}</span><span>{project.status.replaceAll("_"," ")}</span></div>
  </article>;
}
