import { getRuntimeDatabase } from "@/db/runtime";
import { worldUpdates } from "@/updates/world";
import type { Metadata } from "next";

import { WorldExperience } from "@/components/world/WorldExperience";

export const metadata: Metadata = {
  title: "ImmXrsive World",
  description: "Explore ImmXrsive as a small interactive 3D world: student stories, selected projects, industry and ways to join.",
};

export const dynamic = "force-dynamic";
export default async function WorldPage() {
  const data = await worldUpdates(getRuntimeDatabase());
  return <WorldExperience {...data} />;
}
