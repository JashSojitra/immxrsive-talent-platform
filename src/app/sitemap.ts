import type { MetadataRoute } from "next";
import { eq } from "drizzle-orm";
import { getRuntimeDatabase } from "@/db/runtime";
import { projects, students, studentProfiles } from "@/db/schema";
import { publicArticles } from "@/updates/service";
import { siteUrl } from "@/updates/policy";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const db = getRuntimeDatabase();
  const [posts, work, profiles, legacy] = await Promise.all([publicArticles(db), db.select({ id: projects.id, updatedAt: projects.updatedAt }).from(projects).where(eq(projects.publicationStatus,"published")), db.select({ id: studentProfiles.id, updatedAt: studentProfiles.updatedAt }).from(studentProfiles).where(eq(studentProfiles.publicationStatus,"published")), db.select({ id: students.id }).from(students).where(eq(students.profileStatus,"published"))]);
  return [...["", "/talent", "/projects", "/showcase", "/world", "/partners", "/contact", "/updates"].map(path=>({ url: siteUrl+path, lastModified: new Date("2026-11-26") })), ...posts.map(a=>({ url: `${siteUrl}/updates/${a.slug}`, lastModified: a.updatedAt })), ...work.map(p=>({ url: `${siteUrl}/projects/${p.id}`, lastModified: p.updatedAt })), ...profiles.map(p=>({ url: `${siteUrl}/students/${p.id}`, lastModified: p.updatedAt })), ...legacy.map(p=>({ url: `${siteUrl}/students/${p.id}`, lastModified: new Date("2026-11-26") }))];
}
