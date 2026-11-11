import type { ReactNode } from "react";
import { notFound } from "next/navigation";

import { getPublicProject } from "@/db/public-project";

// Resolve public visibility before this segment's loading boundary can flush
// HTTP 200. Keep the page/loading UI for projects that pass the public query.
export default async function PublicProjectLayout({ children, params }: {
  children: ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  if (!await getPublicProject(projectId)) notFound();
  return children;
}
