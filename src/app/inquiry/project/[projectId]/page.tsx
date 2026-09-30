import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import styles from "@/components/project-detail/project-detail.module.css";
import { getPublicProject } from "@/db/public-project";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Project inquiry",
  description: "Project-specific employer inquiry handoff for ImmXrsive.",
  robots: { index: false, follow: false },
};

export default async function ProjectInquiryPlaceholder({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const project = await getPublicProject(projectId);
  if (!project) notFound();

  return (
    <main className={styles.page}>
      <div className={styles.spatialBackdrop} aria-hidden="true"><span /><span /><span /></div>
      <header className={styles.siteHeader}>
        <Link href="/talent" className={styles.brand} aria-label="ImmXrsive talent directory">
          IMM<span>X</span>RSIVE
        </Link>
        <nav aria-label="Primary navigation"><Link href={`/projects/${project.id}`}>Project</Link></nav>
      </header>
      <section className={styles.inquirySection} aria-labelledby="inquiry-placeholder-title">
        <p className={styles.chapter}>Project inquiry / {project.id}</p>
        <h1 id="inquiry-placeholder-title" className={styles.stateTitle}>Inquiry for<br /><em>{project.title}.</em></h1>
        <p>The complete employer inquiry form will be introduced in M6. This handoff safely preserves the selected project without selecting a contributor.</p>
        <Link className={styles.inquiryCta} href={`/projects/${project.id}`}>
          Return to {project.title} <span aria-hidden="true">↗</span>
        </Link>
      </section>
    </main>
  );
}
