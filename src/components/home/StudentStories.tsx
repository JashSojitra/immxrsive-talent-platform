import Image from "next/image";
import Link from "next/link";
import type { PublicArticle } from "@/updates/service";
import { storyPosts } from "@/updates/world-content";
import styles from "./stories.module.css";
export type HomeStory = PublicArticle & { student: { name: string; avatarMediaId: string | null } | null };
export function StudentStories({ stories = [] }: { stories?: HomeStory[] }) {
  const posts = storyPosts(stories);
  return <section className={styles.section} aria-labelledby="student-stories-title"><div className={styles.heading}><p className="ui-eyebrow">Student stories</p><h2 id="student-stories-title">The people behind the work.</h2><p>Meet the students building and connecting through ImmXrsive.</p></div><ul className={styles.cards} aria-label="Student stories">{posts.length ? posts.map(story=><li key={story.id}><article className={styles.card}>{story.student?.avatarMediaId && <Image className={styles.photo} src={`/media/${story.student.avatarMediaId}`} alt={story.student.name} width={512} height={512} unoptimized />}<div className={styles.body}><h3>{story.title}</h3>{story.student && <p className={styles.role}>{story.student.name}</p>}<p>{story.excerpt}</p><Link className={styles.link} href={`/updates/${story.slug}`}>Read the story <span aria-hidden="true">&#8599;</span></Link></div></article></li>) : <li><article className={`${styles.card} ${styles.soon}`}><div className={styles.body}><h3>Stories coming soon</h3><p>Student stories will appear here once they are published with approval.</p></div></article></li>}</ul></section>;
}
