"use client";
import Link from "next/link";
import { useState } from "react";
import type { publicAdminShowcases } from "./public";
import styles from "@/components/project-editor/project-editor.module.css";
export function AdminDiscovery({ rows }: { rows: Awaited<ReturnType<typeof publicAdminShowcases>> }) {
  const [q, setQ] = useState("");
  const filtered = rows.filter(r => [r.title, r.summary, r.domain, ...r.technologies].join(" ").toLowerCase().includes(q.toLowerCase()));
  return <section className={styles.section}><h2>Administrator showcases</h2><p>Independent presentations prepared and published by platform staff. Credits are descriptive attribution.</p>{rows.length > 0 && <><label htmlFor="showcase-search">Search administrator projects</label><input id="showcase-search" type="search" value={q} onChange={e => setQ(e.target.value)} /><p role="status">{filtered.length} projects</p></>}
    {filtered.map(r => <article className={styles.card} key={r.projectId}><p>{r.domain}{r.featured ? " / Featured" : ""}</p><h3><Link href={`/projects/${r.projectId}`}>{r.title}</Link></h3><p>{r.summary}</p><p>{r.technologies.join(" · ")}</p></article>)}{!filtered.length && <div className={styles.identity}><h3>{rows.length ? "No showcases match this search." : "The next experience is taking shape."}</h3><p>{rows.length ? "Try another project title, discipline or technology." : "Staff-curated experiences appear here after publication. Explore the project collection while the next showcase is prepared."}</p>{!rows.length && <Link href="/projects">Explore published projects ↗</Link>}</div>}</section>;
}
