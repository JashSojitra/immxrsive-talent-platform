import Image from "next/image";
import Link from "next/link";

import type { Place, WorldLink } from "./world-content";
import styles from "./world.module.css";

function WorldAnchor({ link }: { link: WorldLink }) {
  if (link.external) {
    return <a className={styles.linkButton} href={link.href} target="_blank" rel="noopener noreferrer">{link.label}<span aria-hidden="true"> ↗</span></a>;
  }
  return <Link className={styles.linkButton} href={link.href}>{link.label}<span aria-hidden="true"> →</span></Link>;
}

/** Content for one place. Shared by the in-world panel and the accessible list view. */
export function PlaceContent({ place, headingId, headingLevel = 2 }: { place: Place; headingId?: string; headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <div className={styles.placeContent} data-place={place.id}>
      <p className={styles.kicker}>{place.kicker}</p>
      <Heading id={headingId} className={styles.placeTitle} tabIndex={-1}>{place.title}</Heading>
      <p className={styles.placeBody}>{place.body}</p>

      {place.stories && (
        <ul className={styles.cardGrid} aria-label="Student stories">
          {place.stories.map((story, index) => story.kind === "student" ? (
            <li key={story.name} className={styles.storyCard}>
              <div className={styles.avatar} aria-hidden="true">{story.photo ? <Image src={story.photo} alt="" width={64} height={64} /> : story.initials}</div>
              <div>
                <p className={styles.cardName}>{story.name}</p>
                <p className={styles.cardMeta}>{story.role}</p>
                {story.href && <a className={styles.cardLink} href={story.href} rel="noopener noreferrer">Read the full story<span aria-hidden="true"> ↗</span></a>}
              </div>
            </li>
          ) : (
            <li key={`soon-${index}`} className={`${styles.storyCard} ${styles.soon}`}>
              <div className={styles.avatar} aria-hidden="true">?</div>
              <div>
                <p className={styles.cardName}>Story coming soon</p>
                <p className={styles.cardMeta}>Another student story is being prepared.</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {place.papers && <section aria-label="Newsstand papers">{place.papers.length ? place.papers.slice(0, 5).map(paper => <article key={paper.href} className={styles.projectCard}><h3><Link href={paper.href}>{paper.title}</Link></h3><time dateTime={paper.date}>{paper.date}</time><p>{paper.excerpt}</p></article>) : <p>News coming soon</p>}</section>}
      {place.showcase && (
        <ul className={styles.cardGrid} aria-label="Showcase projects">
          {place.showcase.map((item, index) => item.kind === "project" ? (
            <li key={item.name} className={styles.projectCard}>
              <p className={styles.cardIndex}>Exhibit {String(index + 1).padStart(2, "0")}</p>
              <p className={styles.cardName}>{item.name}</p>
              <p className={styles.cardMeta}>{item.summary ?? "Project details are coming soon."}</p>
              <ul className={styles.tags} aria-label={`${item.name} tags`}>{item.tags.map(tag => <li key={tag}>{tag}</li>)}</ul>
            </li>
          ) : (
            <li key={`soon-${index}`} className={`${styles.projectCard} ${styles.soon}`}>
              <p className={styles.cardIndex}>Exhibit {String(index + 1).padStart(2, "0")}</p>
              <p className={styles.cardName}>Coming soon</p>
              <p className={styles.cardMeta}>The next exhibit is being prepared.</p>
            </li>
          ))}
        </ul>
      )}

      {place.id === "launchpad" && (
        <figure className={styles.qr}>
          <Image src="/world/join-qr.svg" alt="QR code that opens the ImmXrsive platform" width={148} height={148} unoptimized />
          <figcaption>Scan to open the platform on your phone.</figcaption>
        </figure>
      )}

      {place.links.length > 0 && <div className={styles.links}>{place.links.map(link => <WorldAnchor key={link.href} link={link} />)}</div>}
    </div>
  );
}
