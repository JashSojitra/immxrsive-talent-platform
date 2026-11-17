import Link from "next/link";
import { notFound } from "next/navigation";
import { getRuntimeDatabase } from "@/db/runtime";
import { publicPartner } from "@/partners/service";
import styles from "@/partners/partners.module.css";
export const dynamic = "force-dynamic";
export default async function PartnerPage({params}:{params:Promise<{companyId:string}>}) {
 const company = await publicPartner(getRuntimeDatabase(),(await params).companyId); if(!company) notFound();
 return <main className={styles.page}><nav><Link href="/partners">All partners</Link><Link href="/showcase">Projects</Link></nav><h1>{company.content.name}</h1><p>{company.content.location} / {company.content.sector}</p><h2>About</h2><p>{company.content.description}</p>{new URL(company.content.website).hostname.endsWith(".example.test") ? <p>Reserved fixture website: {company.content.website} (not a hosted source)</p> : <a href={company.content.website} target="_blank" rel="noopener noreferrer">Company website</a>}<p><Link href={`/inquiry/partner/${company.id}`}>Discuss a collaboration with {company.content.name}</Link></p>
 {(["current","past"] as const).map(status=><section key={status}><h2>{status === "current"?"Current collaborations":"Past collaborations"}</h2>{company.collaborations.filter(c=>c.status===status).map(c=><article key={c.id} className={styles.card}><h3>{c.title}</h3><p>{c.year}{c.date?` / ${c.date}`:""}</p><p>{c.description}</p>{c.outcome&&<><h4>Outcomes</h4><p>{c.outcome}</p></>}{c.projects.length>0&&<><h4>Related projects</h4>{c.projects.map(p=><p key={p.id}><Link href={`/projects/${p.id}`}>{p.title}</Link></p>)}</>}{c.students.length>0&&<><h4>Public participants</h4>{c.students.map(s=><p key={s.id}><Link href={`/students/${s.id}`}>{s.name}</Link></p>)}</>}</article>)}{!company.collaborations.some(c=>c.status===status)&&<p>No public {status} collaborations to display.</p>}</section>)}
 </main>;
}
