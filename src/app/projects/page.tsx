import type { Metadata } from "next";
import Link from "next/link";
import { getRuntimeDatabase } from "@/db/runtime";
import { listPublicProjects } from "@/projects/public-directory";
import { ProjectCard } from "@/components/discovery/ProjectCard";
import { ProjectExhibition } from "@/components/home/ProjectExhibition";
import styles from "@/components/discovery/discovery.module.css";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title:"Explore projects",description:"Discover published student work and staff-curated projects across XR, software and creative technology." };
export default async function ProjectsPage({searchParams}:{searchParams:Promise<{q?:string;domain?:string;managed?:string}>}) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim().slice(0,500) : "";
  const domain = typeof params.domain === "string" ? params.domain : "";
  const managed = typeof params.managed === "string" ? params.managed : "";
  const projects = await listPublicProjects(getRuntimeDatabase());
  const domains = [...new Set(projects.map(p=>p.domain))].sort();
  const results = projects.filter(p=>(!q || `${p.title} ${p.description} ${p.technologies.join(" ")}`.toLocaleLowerCase().includes(q.toLocaleLowerCase())) && (!domain || p.domain === domain) && (!managed || p.managementMode === managed));
  return <main className={styles.page}>
    <nav className={styles.breadcrumb} aria-label="Breadcrumb"><Link href="/">Home</Link> / Projects</nav>
    <p className="ui-eyebrow">The project index</p><h1 className={styles.heading}>Ideas, brought<br /><em>into the world.</em></h1>
    <p className={styles.intro}>Explore student work and staff-curated projects. Meet the contributors, see what they built, and discover the thinking behind it.</p>
    <form key={JSON.stringify([q,domain,managed])} className={styles.filters} role="search"><label>Search projects<input type="search" name="q" defaultValue={q} placeholder="Project, technology, or idea" maxLength={500} /></label><label>Discipline<select name="domain" defaultValue={domain}><option value="">All disciplines</option>{domains.map(d=><option key={d}>{d}</option>)}</select></label><label>Project collection<select name="managed" defaultValue={managed}><option value="">All projects</option><option value="STUDENT_MANAGED">Student projects</option><option value="ADMIN_MANAGED">Staff-curated</option></select></label><button className="ui-button ui-button-primary" type="submit">Find projects <span aria-hidden="true">&#8599;</span></button></form>
    <div className={styles.summary}><span>{results.length} {results.length===1 ? "project" : "projects"}{q ? ` matching “${q}”` : " to explore"}</span>{(q || domain || managed) && <Link href="/projects">Clear filters</Link>}<Link href="/showcase">Explore immersive showcases <span aria-hidden="true">&#8599;</span></Link></div>
    {!(q || domain || managed) && <ProjectExhibition projects={projects.slice(0, 8)} />}
    <div className={styles.grid}>{results.map((project,index)=><ProjectCard key={project.id} project={project} index={index} />)}</div>
    {!results.length && <div className="ui-empty"><h2>{projects.length ? "No projects match these filters." : "The next idea is on its way."}</h2><p>{projects.length ? "Try a broader search or clear your filters to explore all published work." : "Published student work and curated projects will appear here."}</p><Link href={projects.length ? "/projects" : "/talent"}>{projects.length ? "Clear filters" : "Meet the talent"}</Link></div>}
  </main>;
}
