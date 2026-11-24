"use client";
import Link from "next/link";
import { Carousel_001 } from "@/components/v1/skiper47";
import { StickyCard_003 } from "@/components/v1/skiper34";
import styles from "@/components/v1/skiper.module.css";
import { isReviewRecord } from "./featured-content";
export type ExhibitionProject = { id: string; title: string; domain: string; description: string; technologies?: string[]; media: { url: string; alt: string }[] };
export function ProjectExhibition({ projects }: { projects: ExhibitionProject[] }) {
  projects = projects.filter(project => !isReviewRecord(project.title));
  if (!projects.length) return null;
  const images = projects.flatMap(project => project.media.map(media => ({ ...media, id: project.id, title: project.title })));
  return <section className={styles.exhibition} aria-labelledby="exhibition-title">
    <p className="ui-eyebrow">Published work / A closer encounter</p>
    <h2 id="exhibition-title">Enter the collection.</h2>
    <p>Drag or swipe through published projects. Use the arrows, pagination, or keyboard to explore. Each card opens the project and its evidence.</p>
    <Carousel_001 images={projects.map(project => ({ src: project.media[0]?.url, alt: project.media[0]?.alt ?? "", title: project.title, domain: project.domain, description: project.description, technologies: project.technologies, href: `/projects/${encodeURIComponent(project.id)}` }))} showPagination showNavigation loop={false} />
    {images.length > 0 && <section className={styles.imageStory} aria-label="Published project images">{images.slice(0, 5).map((image, index) => <StickyCard_003 key={`${image.id}-${index}`} imgUrl={image.url} alt={image.alt}><Link href={`/projects/${encodeURIComponent(image.id)}`}>{image.title} ↗</Link></StickyCard_003>)}</section>}
  </section>;
}
