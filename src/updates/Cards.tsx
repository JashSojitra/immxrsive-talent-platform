import Image from "next/image";
import Link from "next/link";
import type { PublicArticle } from "./service";
import { categoryLabel } from "./policy";
import styles from "./updates.module.css";
export function ArticleCard({ article }: { article: PublicArticle }) {
  return <article className={styles.card}>
    {article.coverMediaId && <Link href={`/updates/${article.slug}`} tabIndex={-1} aria-hidden="true"><Image src={`/media/${article.coverMediaId}`} alt={article.coverAlt} width={640} height={400} unoptimized /></Link>}
    <div className={styles.cardBody}><div className={styles.meta}><span>{categoryLabel[article.category]}</span>{article.publishedAt && <time dateTime={new Date(article.publishedAt).toISOString()}>{new Date(article.publishedAt).toLocaleDateString("en-CA", { timeZone: "America/Toronto" })}</time>}</div><h2><Link href={`/updates/${article.slug}`}>{article.title}</Link></h2><p>{article.excerpt}</p></div>
  </article>;
}
