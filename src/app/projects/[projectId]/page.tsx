import Link from "next/link";
import styles from "@/partners/partners.module.css";
import { publicProjectPartners } from "@/partners/service";
import { getRuntimeDatabase } from "@/db/runtime";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProjectDetailView } from "@/components/project-detail/ProjectDetailView";
import { getPublicProject } from "@/db/public-project";

export const dynamic = "force-dynamic";

type ProjectPageProps = { params: Promise<{ projectId: string }> };

export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
  const { projectId } = await params;
  const project = await getPublicProject(projectId);

  if (!project) {
    return {
      title: "Project not available",
      description: "The requested NOT ImmXrsive project is not available.",
      robots: { index: false, follow: false },
    };
  }

  return { title: project.title, description: project.description };
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
  const project = await getPublicProject(projectId);
  if (!project) notFound();

  const relationships = await publicProjectPartners(getRuntimeDatabase(),projectId);
  return <><ProjectDetailView project={project} /><section aria-label="Official project relationships" className={styles.relationships}>{relationships.official&&<p>✓ Official project verification — approved by staff</p>}<h2>Verified industry partners</h2>{relationships.companies.map(c=><p key={c.id}><Link href={`/partners/${c.id}`}>{c.content.name}</Link></p>)}{!relationships.companies.length&&<p>No staff-approved partner associations yet.</p>}<Link href="/partners">Explore industry partners</Link></section></>;

}
