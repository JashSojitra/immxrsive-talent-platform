"use client";
import Link from "next/link";
import { useState } from "react";
import type { adminList } from "./service";
import styles from "@/components/project-editor/project-editor.module.css";
import admin from "./admin.module.css";
export function AdminProjectList({ rows, initialStatus = "all" }: { rows: Awaited<ReturnType<typeof adminList>>["projects"]; initialStatus?: string }) {
  const [q, setQ] = useState(""); const [status, setStatus] = useState(initialStatus); const [sort, setSort] = useState("updated");
  const filtered = rows.filter(p => (status === "all" || status === p.lifecycle) && [p.title, p.domain, p.repository].join(" ").toLowerCase().includes(q.toLowerCase())).sort((a,b) => sort === "title" ? a.title.localeCompare(b.title) : new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  return <section className={styles.section}><div className={admin.filters}><div><label htmlFor="project-search">Search projects</label><input id="project-search" type="search" value={q} onChange={e => setQ(e.target.value)} /></div><div><label htmlFor="project-status">Publication status</label><select id="project-status" value={status} onChange={e => setStatus(e.target.value)}>{["all", "draft", "published", "unpublished", "archived"].map(s => <option key={s} value={s}>{s}</option>)}</select></div><div><label htmlFor="project-sort">Sort projects</label><select id="project-sort" value={sort} onChange={e => setSort(e.target.value)}><option value="updated">Recently updated</option><option value="title">Title</option></select></div></div>
    <p role="status">{filtered.length} projects found</p>{filtered.map(p => <article key={p.id} className={styles.card}><p className={styles.eyebrow}>{p.lifecycle} / {p.domain}</p><h2><Link href={`/admin/projects/${p.id}`}>{p.title}</Link></h2><small>Updated {new Date(p.updatedAt).toISOString()} / Revision {p.version}</small><div className={styles.actions}><Link href={`/admin/projects/${p.id}/edit`}>Open editor</Link><Link href={`/admin/projects/${p.id}/preview`}>Preview</Link><Link href={`/admin/projects/${p.id}/demo`}>Configure experience</Link></div></article>)}{!filtered.length && <p>No projects match these filters. Clear the search or create your first project.</p>}</section>;
}
