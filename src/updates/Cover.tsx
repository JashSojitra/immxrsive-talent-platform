import Image from "next/image";
import type { PublicArticle } from "./service";
import { categoryLabel } from "./policy";
import styles from "./updates.module.css";

export function ArticleCover({ article, hero = false }: { article: Pick<PublicArticle, "coverMediaId" | "coverAlt" | "category">; hero?: boolean }) {
  const label = categoryLabel[article.category];
  return <div className={`${styles.coverFrame} ${hero ? styles.heroCover : ""}`}>
    {article.coverMediaId ? <Image className={styles.coverImage} src={`/media/${article.coverMediaId}`} alt={article.coverAlt} width={1600} height={1000} unoptimized priority={hero} /> : <div className={styles.coverPlaceholder} role="img" aria-label={`ImmXrsive ${label} cover`}>
      <Image className={styles.coverMark} src="/branding/immxrsive-icon-reverse.svg" alt="" width={144} height={161} aria-hidden="true" />
      <span className={styles.coverLabel}>{label}</span>
    </div>}
  </div>;
}
