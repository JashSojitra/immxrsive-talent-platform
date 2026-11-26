"use client";
import Link from "next/link";
import { useState } from "react";
import { categories, categoryLabel, statuses } from "./policy";
import styles from "./updates.module.css";
export function ArticleList({ rows }: { rows: { id: string; title: string; category: typeof categories[number]; status: string; studentNote: string }[] }) {
  const [q,setQ] = useState(""); const [category,setCategory] = useState(""); const [status,setStatus] = useState("");
  return <><Link href="/admin/updates/new">Create post</Link><div className={styles.filters}><label>Search posts<input value={q} onChange={e => setQ(e.target.value)} /></label><label>Category<select value={category} onChange={e=>setCategory(e.target.value)}><option value="">All categories</option>{categories.map(c=><option value={c} key={c}>{categoryLabel[c]}</option>)}</select></label><label>Status<select value={status} onChange={e=>setStatus(e.target.value)}><option value="">All statuses</option>{statuses.map(s=><option key={s}>{s}</option>)}</select></label></div>{rows.filter(r=>(!category || r.category===category) && (!status || r.status===status) && r.title.toLowerCase().includes(q.toLowerCase())).map(r=><article className={styles.cardBody} key={r.id}><h2><Link href={`/admin/updates/${r.id}`}>{r.title}</Link></h2><p>{categoryLabel[r.category]} · {r.status}</p>{r.studentNote && <p>Student feedback: {r.studentNote}</p>}</article>)}</>;
}
