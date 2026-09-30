import type { Metadata } from "next";

import { TalentDirectory } from "@/components/talent/TalentDirectory";

export const metadata: Metadata = {
  title: "Discover Talent | ImmXrsive",
  description: "Discover student and alumni talent building the future of immersive technology.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function TalentPage({ searchParams }: { searchParams: SearchParams }) {
  const values = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    for (const item of Array.isArray(value) ? value : value ? [value] : []) query.append(key, item);
  }
  return <TalentDirectory initialSearch={query.toString()} />;
}
