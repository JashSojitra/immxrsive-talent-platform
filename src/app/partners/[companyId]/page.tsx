import Link from "next/link";
import { notFound } from "next/navigation";
import { getRuntimeDatabase } from "@/db/runtime";
import { publicPartner } from "@/partners/service";
import { companyWebsiteUrl } from "@/partners/policy";
import styles from "@/partners/partners.module.css";
export const dynamic = "force-dynamic";
export default async function PartnerPage({ params }: { params: Promise<{ companyId: string }> }) {
  const company = await publicPartner(getRuntimeDatabase(), (await params).companyId);
  if (!company) notFound();
  const website = companyWebsiteUrl(company.content.website);
  return <main className={styles.page}>
    <nav aria-label="Breadcrumb"><Link href="/partners">Industry partners</Link><span aria-current="page">Organization</span></nav>
    <p className={`ui-eyebrow ${styles.eyebrow}`}>Industry partner</p>
    <h1 className="ui-display">{company.content.name}</h1>
    <p className={styles.metadata}>{[company.content.location, company.content.sector].filter(Boolean).join(" / ")}</p>
    <p>{company.content.description}</p>
    <div className={styles.actions}>
      <Link className="ui-button ui-button-primary" href={`/inquiry/partner/${company.id}`}>Discuss a collaboration <span aria-hidden="true">&#8599;</span></Link>
      {website ? new URL(website).hostname.endsWith(".example.test") ? <p>Reserved fixture website: {website} (not a hosted source)</p> : <a href={website} target="_blank" rel="noopener noreferrer">Company website <span aria-hidden="true">&#8599;</span></a> : <p>Company website not listed.</p>}
    </div>
    <section className={styles.section} aria-labelledby="verified-projects-title">
      <h2 id="verified-projects-title">Verified project associations</h2>
      <p>Independently approved by staff. Collaboration history is listed separately below.</p>
      {company.verifiedProjects.map(project => <p key={project.id}><Link href={`/projects/${project.id}`}>{project.title}</Link></p>)}
      {!company.verifiedProjects.length && <p className={styles.empty}>No staff-approved project associations yet.</p>}
    </section>
    {(["current", "past"] as const).map(status => <section key={status} className={styles.section} aria-labelledby={`${status}-collaborations-title`}>
      <p className={`ui-eyebrow ${styles.eyebrow}`}>{status === "current" ? "Happening now" : "Collaboration archive"}</p>
      <h2 id={`${status}-collaborations-title`}>{status === "current" ? "Current collaborations" : "Past collaborations"}</h2>
      <div className={styles.timeline}>{company.collaborations.filter(collaboration => collaboration.status === status).map(collaboration => <article key={collaboration.id} className={styles.card}>
        <p className={styles.metadata}>{collaboration.year}{collaboration.date ? ` / ${collaboration.date}` : ""}</p>
        <h3>{collaboration.title}</h3><p>{collaboration.description}</p>
        {collaboration.outcome && <><h4>Outcomes</h4><p>{collaboration.outcome}</p></>}
        {collaboration.projects.length > 0 && <><h4>Related projects</h4>{collaboration.projects.map(project => <p key={project.id}><Link href={`/projects/${project.id}`}>{project.title}</Link></p>)}</>}
        {collaboration.students.length > 0 && <><h4>Public participants</h4>{collaboration.students.map(student => <p key={student.id}><Link href={`/students/${student.id}`}>{student.name}</Link></p>)}</>}
      </article>)}</div>
      {!company.collaborations.some(collaboration => collaboration.status === status) && <p className={styles.empty}>No public {status} collaborations to display.</p>}
    </section>)}
  </main>;
}
