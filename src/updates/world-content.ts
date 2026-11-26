import type { PublicArticle } from "./service";
export type StoryVolume = { name: string; role: string; photoUrl: string | null; excerpt: string; href: string | null };
export type NewsPaper = { title: string; date: string; excerpt: string; href: string };
export const comingSoonVolume: StoryVolume = { name: "Coming Soon", role: "Student story", photoUrl: null, excerpt: "A student story is being prepared.", href: null };
export function padStoryVolumes(volumes: StoryVolume[]): StoryVolume[] { return Array.from({ length: 7 }, (_, index) => volumes[index] ?? { ...comingSoonVolume }); }
export function newsstandPapers(posts: PublicArticle[]): NewsPaper[] {
  return posts.filter(p => p.category === "event" || p.category === "news").slice(0, 5).map(p => ({ title: p.title, date: p.publishedAt ? new Date(p.publishedAt).toISOString().slice(0, 10) : "", excerpt: p.excerpt, href: `/updates/${p.slug}` }));
}
export function storyPosts<T extends PublicArticle>(posts: T[]) { return posts.filter(p => p.category === "student_success").slice(0, 6); }
export function safeStoryMessage(origin: string, expected: string, data: unknown): string | null {
  if (origin !== expected || !data || typeof data !== "object" || !("type" in data) || data.type !== "immxrsive:open-story" || !("href" in data) || typeof data.href !== "string") return null;
  return /^\/updates\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.href) ? data.href : null;
}
