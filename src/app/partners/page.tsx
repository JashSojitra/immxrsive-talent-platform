import Link from "next/link";
import { getRuntimeDatabase } from "@/db/runtime";
import { publicCompanies } from "@/partners/service";
import styles from "@/partners/partners.module.css";
export const dynamic = "force-dynamic";
export const metadata = {title:"Industry partners"};
export default async function PartnersPage() {
 const companies = await publicCompanies(getRuntimeDatabase());
 return <main className={styles.page}><nav aria-label="Public navigation"><Link href="/">Home</Link><Link href="/talent">Talent</Link><Link href="/showcase">Projects</Link></nav><h1>Industry partners</h1><p>Meet the organizations collaborating with our students and explore their current and past work.</p><div className={styles.grid}>{companies.map(c=><article key={c.id} className={styles.card}><h2><Link href={`/partners/${c.id}`}>{c.content.name}</Link></h2><p>{c.content.sector} / {c.content.location}</p><p>{c.content.description}</p></article>)}</div>{!companies.length&&<p>No partners have been published yet.</p>}</main>;
}
