import { ArticleCover } from "@/updates/Cover";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { cache } from "react";
import { notFound } from "next/navigation";
import { getRuntimeDatabase } from "@/db/runtime";
import { publicArticle, publicArticles, articleStudent } from "@/updates/service";
import { categoryLabel, readingMinutes, siteUrl } from "@/updates/policy";
import { Markdown } from "@/updates/Markdown";
import { ArticleCard } from "@/updates/Cards";
import styles from "@/updates/updates.module.css";
export const dynamic = "force-dynamic";
const getPost = cache((slug: string) => publicArticle(getRuntimeDatabase(), slug));
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const a = await getPost((await params).slug); if (!a) return { title: "Post unavailable", robots: { index: false } };
  const url = `${siteUrl}/updates/${a.slug}`; const image = `${siteUrl}${a.coverMediaId ? `/media/${a.coverMediaId}` : "/updates/og"}`;
  return { title: a.title, description: a.excerpt, alternates: { canonical: url }, openGraph: { type: "article", title: a.title, description: a.excerpt, url, images: [{ url: image, alt: a.coverAlt || "ImmXrsive Updates & Stories" }], publishedTime: a.publishedAt?.toISOString(), modifiedTime: a.updatedAt.toISOString(), authors: [a.authorDisplayName] }, twitter: { card: "summary_large_image", title: a.title, description: a.excerpt, images: [image] } };
}
export default async function ArticlePage({ params }: Props) {
  const a = await getPost((await params).slug); if (!a) notFound(); const db = getRuntimeDatabase();
  const [student, related] = await Promise.all([a.category === "student_success" && a.studentProfileId ? articleStudent(db, a.studentProfileId) : Promise.resolve(null), publicArticles(db, a.category, 4)]);
  const schema = { "@context": "https://schema.org", "@type": "BlogPosting", headline: a.title, description: a.excerpt, datePublished: a.publishedAt?.toISOString(), dateModified: a.updatedAt.toISOString(), author: { "@type": "Person", name: a.authorDisplayName }, mainEntityOfPage: `${siteUrl}/updates/${a.slug}`, image: `${siteUrl}${a.coverMediaId ? `/media/${a.coverMediaId}` : "/updates/og"}` };
  return <main className={styles.page}><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} /><Link href="/updates">All updates</Link><article><header className={styles.heading}><div className={styles.meta}><span>{categoryLabel[a.category]}</span>{a.publishedAt && <time dateTime={a.publishedAt.toISOString()}>{a.publishedAt.toLocaleDateString("en-CA", { timeZone: "America/Toronto" })}</time>}<span>{readingMinutes(a.bodyMarkdown)} min read</span></div><h1>{a.title}</h1><p>{a.excerpt}</p><p>By {a.authorDisplayName}</p></header><ArticleCover article={a} hero /><div className={styles.body}>{a.category === "event" && (a.eventName || a.eventDate || a.eventLocation) && <aside><h2>Event details</h2><p>{a.eventName}</p>{a.eventDate && <time dateTime={a.eventDate}>{a.eventDate}</time>}<p>{a.eventLocation}</p></aside>}<Markdown body={a.bodyMarkdown} />{a.tags.length>0 && <p>Tags: {a.tags.join(" · ")}</p>}{student && <aside className={styles.cardBody}>{student.avatarMediaId && <Image src={`/media/${student.avatarMediaId}`} alt="" width={96} height={96} className={styles.avatar} unoptimized />}{!student.avatarMediaId && <span className={`${styles.avatar} ${styles.avatarFallback}`} aria-hidden="true">{student.name.charAt(0)}</span>}<h2>{student.name}</h2><p>{student.headline}</p><Link href={`/students/${student.id}`}>View portfolio</Link></aside>}</div></article>{related.some(r=>r.id!==a.id) && <section><h2>Related posts</h2><div className={styles.grid}>{related.filter(r=>r.id!==a.id).slice(0,3).map(r=><ArticleCard key={r.id} article={r} />)}</div></section>}</main>;
}
