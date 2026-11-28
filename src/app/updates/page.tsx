import type { Metadata } from "next";
import Link from "next/link";
import { getRuntimeDatabase } from "@/db/runtime";
import { publicArticles } from "@/updates/service";
import { categories, categoryLabel, siteUrl } from "@/updates/policy";
import { ArticleCard } from "@/updates/Cards";
import styles from "@/updates/updates.module.css";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Updates & Stories", description: "Student stories, events and news from ImmXrsive.", alternates: { canonical: `${siteUrl}/updates`, types: { "application/rss+xml": `${siteUrl}/updates/rss.xml` } } };
export default async function Updates({ searchParams }: { searchParams: Promise<{ category?: string; page?: string }> }) {
  const query = await searchParams; const category = categories.find(c => c === query.category);
  const posts = await publicArticles(getRuntimeDatabase(), category);
  const page = Math.max(1, Math.min(Math.ceil(posts.length / 12) || 1, Number.parseInt(query.page || "1", 10) || 1));
  const pageHref = (p: number) => `/updates?${new URLSearchParams({ ...(category ? { category } : {}), page: String(p) })}`;
  return <main className={styles.page}><header className={styles.heading}><p className="ui-eyebrow">From ImmXrsive</p><h1>Updates<br />&amp; stories.</h1><p>What we&apos;re building, where we&apos;re gathering, and the people moving things forward.</p></header><nav className={styles.filters} aria-label="Update categories"><Link href="/updates" aria-current={!category ? "page" : undefined}>All</Link>{categories.map(c=><Link key={c} href={`/updates?category=${c}`} aria-current={category===c ? "page" : undefined}>{categoryLabel[c]}</Link>)}</nav>{posts.length ? <div className={styles.grid}>{posts.slice((page-1)*12,page*12).map(a=><ArticleCard article={a} key={a.id} />)}</div> : <p className={styles.empty}>Updates coming soon. Published stories and announcements will appear here.</p>}<nav className={styles.actions} aria-label="Pagination">{page>1 && <Link href={pageHref(page-1)}>Previous</Link>}{posts.length>12 && <span>Page {page} of {Math.ceil(posts.length/12)}</span>}{page*12<posts.length && <Link href={pageHref(page+1)}>Next</Link>}</nav><Link href="/updates/rss.xml">Subscribe via RSS</Link></main>;
}
