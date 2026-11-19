import Link from "next/link";
import { getRuntimeDatabase } from "@/db/runtime";
import { publicCompanies } from "@/partners/service";
import styles from "@/partners/partners.module.css";
export const dynamic = "force-dynamic";
export const metadata = { title: "Industry partners" };
export default async function PartnersPage() {
  const companies = await publicCompanies(getRuntimeDatabase());
  return <main className={styles.page}>
    <p className={styles.eyebrow}>Ideas meet industry</p>
    <h1>Connections that<br />move work forward.</h1>
    <p>Meet our industry partners. Explore the organizations, student projects, and collaborations bringing ideas into practice.</p>
    <div className={styles.actions}><Link href="/projects">Explore connected work <span aria-hidden="true"> &#8599;</span></Link></div>
    <section aria-labelledby="partners-title" className={styles.section}>
      <h2 id="partners-title">Industry partners</h2>
      <p>Published organizations and their public collaborations.</p>
      <div className={styles.grid}>{companies.map(company => <article key={company.id} className={styles.card}>
        <span className={styles.companyMark} aria-hidden="true">{company.content.name.charAt(0)}</span>
        <h2><Link href={`/partners/${company.id}`}>{company.content.name}</Link></h2>
        <p className={styles.metadata}>{[company.content.sector, company.content.location].filter(Boolean).join(" / ")}</p>
        <p>{company.content.description}</p>
        <Link className={styles.cardLink} href={`/partners/${company.id}`}>Explore collaborations <span aria-hidden="true">&#8599;</span></Link>
      </article>)}</div>
      {!companies.length && <div className={styles.empty}><h3>Partnerships are taking shape.</h3><p>No partners have been published yet. In the meantime, discover student projects and the people behind them.</p><Link href="/projects">Explore projects</Link></div>}
    </section>
  </main>;
}
