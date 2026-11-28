import { z } from "zod";

export const categories = ["student_success", "event", "news"] as const;
export const statuses = ["draft", "in_review", "published", "archived"] as const;
export const categoryLabel = { student_success: "Student stories", event: "Events", news: "News" };
export function articleSlug(title: string) {
  return title.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 120).replace(/-$/, "");
}
export const articleInput = z.object({
  title: z.string().trim().min(1).max(200), slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120).refine(v => v !== "og", "Choose another slug; og is reserved for share images."),
  category: z.enum(categories), excerpt: z.string().trim().max(200), bodyMarkdown: z.string().max(40000),
  coverMediaId: z.uuid().nullable(), coverAlt: z.string().trim().max(400), studentProfileId: z.uuid().nullable(),
  eventName: z.string().trim().max(200), eventDate: z.iso.date().nullable(), eventLocation: z.string().trim().max(300),
  tags: z.array(z.string().trim().min(1).max(60)).max(20), authorDisplayName: z.string().trim().min(1).max(160),
}).strict().superRefine((v, ctx) => {
  if (v.coverMediaId && !v.coverAlt) ctx.addIssue({ code: "custom", path: ["coverAlt"], message: "Describe the cover image." });
  if (v.category === "student_success" && !v.studentProfileId) ctx.addIssue({ code: "custom", path: ["studentProfileId"], message: "Link the student's profile." });
});
export type ArticleInput = z.infer<typeof articleInput>;
export const emptyArticle: ArticleInput = { title: "", slug: "", category: "news", excerpt: "", bodyMarkdown: "", coverMediaId: null, coverAlt: "", studentProfileId: null, eventName: "", eventDate: null, eventLocation: "", tags: [], authorDisplayName: "" };
export function approvalInvalidated(before: ArticleInput, after: ArticleInput) {
  return (["title", "excerpt", "bodyMarkdown", "studentProfileId", "category", "coverMediaId", "coverAlt"] as const).some(key => before[key] !== after[key]);
}
export function publishIssues(content: ArticleInput, approved: boolean, profilePublished: boolean) {
  const issues: string[] = [];
  if (!content.title || !content.excerpt || !content.bodyMarkdown.trim()) issues.push("Add a title, excerpt and body before publishing.");
  if (content.category === "student_success" && (!content.studentProfileId || !approved || !profilePublished)) issues.push("The linked student must approve this revision and have a published profile.");
  return issues;
}
export function safeImageUrl(value: string) {
  return /^\/media\/[0-9a-f-]{36}$/i.test(value) || /^https:\/\/[^\s\\]+$/i.test(value);
}
export function youtubeId(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    const id = url.hostname === "youtu.be" ? url.pathname.slice(1) : ["youtube.com", "www.youtube.com", "m.youtube.com"].includes(url.hostname) ? url.searchParams.get("v") : null;
    return id && /^[\w-]{11}$/.test(id) ? id : null;
  } catch { return null; }
}
export const siteUrl = (process.env.SITE_URL || "https://immxrsive-talent-platform.vercel.app").replace(/\/$/, "");
export const readingMinutes = (body: string) => Math.max(1, Math.ceil(body.split(/\s+/).length / 200));
