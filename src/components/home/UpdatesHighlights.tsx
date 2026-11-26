import Image from "next/image";
import Link from "next/link";
import type { PublicArticle } from "@/updates/service";
import { categoryLabel } from "@/updates/policy";
import { PeopleRailCard } from "./PeopleRail";
import styles from "./home.module.css";
export function UpdatesHighlights({ posts }: { posts: PublicArticle[] }) {
  const updates = posts.filter(p=>p.category==="event" || p.category==="news").slice(0,4);
  return <section className={styles.people} aria-labelledby="updates-title"><div className={styles.sectionHeading}><div><p className="ui-eyebrow">What&apos;s happening</p><h2 id="updates-title">Fresh from<br /><em>ImmXrsive.</em></h2></div><Link href="/updates">All updates <span aria-hidden="true">&#8599;</span></Link></div>{updates.length ? <ul className={styles.rail} aria-label="Latest updates">{updates.map(post=><PeopleRailCard key={post.id}><Link className={`${styles.plateLink} ${styles.updatePlate}`} href={`/updates/${post.slug}`}>{post.coverMediaId && <Image className={styles.updateCover} src={`/media/${post.coverMediaId}`} alt={post.coverAlt} width={640} height={400} unoptimized />}<span className={styles.plateTop}><span>{categoryLabel[post.category]}</span>{post.publishedAt && <time dateTime={new Date(post.publishedAt).toISOString()}>{new Date(post.publishedAt).toLocaleDateString("en-CA",{timeZone:"America/Toronto"})}</time>}</span><span className={styles.plateBody}><h3>{post.title}</h3><span className={styles.plateHeadline}>{post.excerpt}</span></span><span className={styles.plateArrow} aria-hidden="true">&#8599;</span></Link></PeopleRailCard>)}</ul> : <div className="ui-empty">Updates coming soon. Our next events and announcements will appear here.</div>}</section>;
}
