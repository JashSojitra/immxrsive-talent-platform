import Image from "next/image";
import Link from "next/link";
import { studentStories } from "@/components/world/world-content";
import styles from "./stories.module.css";

export function StudentStories() {
  return <section className={styles.section} aria-labelledby="student-stories-title">
    <div className={styles.heading}>
      <p className="ui-eyebrow">Student stories</p>
      <h2 id="student-stories-title">The people behind the work.</h2>
      <p>Meet the students building and connecting through ImmXrsive.</p>
    </div>
    <ul className={styles.cards} aria-label="Student stories">
      {studentStories.map((story, index) => <li key={story.kind === "student" ? story.name : `soon-${index}`}>
        {story.kind === "student" ? <article className={styles.card}>
          {story.photo && <Image className={styles.photo} src={story.photo} alt={story.name} width={720} height={792} sizes="(max-width: 700px) calc(100vw - 32px), 440px" />}
          <div className={styles.body}>
            <h3>{story.name}</h3>
            <p className={styles.role}>{story.role}</p>
            <p>{story.preview}</p>
            {story.href && <Link href={story.href} className={styles.link}>Meet {story.name} <span aria-hidden="true">↗</span></Link>}
          </div>
        </article> : <article className={`${styles.card} ${styles.soon}`}>
          <span className={styles.placeholder} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
          <div className={styles.body}><h3>Story coming soon</h3><p>More student stories are on the way.</p></div>
        </article>}
      </li>)}
    </ul>
  </section>;
}
