import type { Metadata } from "next";

import { WorldExperience } from "@/components/world/WorldExperience";

export const metadata: Metadata = {
  title: "ImmXrsive World",
  description: "Explore ImmXrsive as a small interactive 3D world: student stories, selected projects, industry and ways to join.",
};

export default function WorldPage() {
  return <WorldExperience />;
}
