import { z } from "zod";
import { safeEvidenceUrl } from "@/projects/evidence-url";
import { githubRepository } from "@/projects/repository-url";
import type { Role } from "@/studio/policy";

export const demoModes = ["static", "embed", "external", "video", "native"] as const;
const text = (max: number) => z.string().trim().max(max);
export function safeAdminUrl(value: string) {
  if (!value || !value.startsWith("https://") || /[\s\\]/.test(value)) return null;
  const safe = safeEvidenceUrl(value);
  if (!safe) return null;
  const host = new URL(safe).hostname.replace(/\.+$/, "");
  // Avoid local/private shorthand domains and public wildcard IP resolvers too.
  if (/(^|\.)(nip\.io|sslip\.io|localtest\.me|lvh\.me)$/.test(host)) return null;
  return safe;
}
const url = text(2048).refine(v => !v || Boolean(safeAdminUrl(v)), "Use a public HTTPS URL without credentials or local addresses.");
const repository = text(2048).refine(v => { try { return !v || Boolean(githubRepository(v)); } catch { return false; } }, "Use a public GitHub repository page.").transform(v => v ? githubRepository(v).key : "");
const date = text(10).refine(v => !v || /^(?!0000)\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v, "Use a valid YYYY-MM-DD date from year 0001 onwards.");
export const creditSchema = z.object({ name: text(160).min(1), role: text(160).min(1), statement: text(2000), profileId: z.union([z.uuid(), z.literal("")]).transform(v => v.toLowerCase()) }).strict();
export const adminContentSchema = z.object({
  title: text(160).min(1), summary: text(600), description: text(12000), domain: text(100).min(1),
  projectStatus: z.enum(["in_progress", "completed", "on_hold"]), startDate: date, endDate: date,
  technologies: z.array(text(80).min(1)).max(30), tools: z.array(text(80).min(1)).max(30),
  thumbnail: url, thumbnailAlt: text(300), gallery: z.array(z.object({ url, alt: text(300).min(1) }).strict()).max(12),
  originalRepository: repository, adaptedRepository: url,
  demoMode: z.enum(demoModes), liveUrl: url, videoUrl: url, videoDescription: text(2000),
  fallbackUrl: url, fallbackText: text(4000), deviceInfo: text(2000), instructions: text(4000),
  credits: z.array(creditSchema).max(30), institution: text(300), featured: z.boolean(), displayOrder: z.number().int().min(0).max(100000),
}).strict().superRefine((v, ctx) => {
  const issue = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });
  if (v.startDate && v.endDate && v.startDate > v.endDate) issue("endDate", "End date must follow start date.");
  if (v.thumbnail && !v.thumbnailAlt) issue("thumbnailAlt", "Describe the thumbnail.");
  if (v.videoUrl && !v.videoDescription) issue("videoDescription", "Provide an accessible video description or transcript.");
  if (v.gallery.some(g => !g.url)) issue("gallery", "Gallery images need a URL.");
  if (new Set(v.technologies).size !== v.technologies.length) issue("technologies", "Remove duplicate technologies.");
});
export type AdminContent = z.infer<typeof adminContentSchema>;
export const emptyContent: AdminContent = { title: "", summary: "", description: "", domain: "XR", projectStatus: "in_progress", startDate: "", endDate: "", technologies: [], tools: [], thumbnail: "", thumbnailAlt: "", gallery: [], originalRepository: "", adaptedRepository: "", demoMode: "static", liveUrl: "", videoUrl: "", videoDescription: "", fallbackUrl: "", fallbackText: "", deviceInfo: "", instructions: "", credits: [], institution: "", featured: false, displayOrder: 0 };
export const adminCommandSchema = z.object({ action: z.enum(["save", "publish", "unpublish", "archive", "restore"]), version: z.number().int().positive(), content: adminContentSchema.optional(), note: text(2000).default("") }).strict().superRefine((c, ctx) => {
  if (c.content && !["save", "publish"].includes(c.action)) ctx.addIssue({ code: "custom", path: ["content"], message: "This lifecycle action operates on the saved revision. Save edits separately." });
});
export type AdminCommand = z.infer<typeof adminCommandSchema>;
export const accessCommandSchema = z.object({ subject: text(200).min(1), role: z.enum(["xr_curator", "xr_admin", "platform_super_admin"]).nullable(), expectedRole: z.enum(["xr_curator", "xr_admin", "platform_super_admin"]).nullable(), reason: text(2000).min(1) }).strict();
export function canManage(role: Role | null) { return role === "xr_admin" || role === "platform_super_admin"; }
export function publicationIssues(c: AdminContent): string[] {
  const issues: string[] = [];
  if (!c.summary || !c.description) issues.push("Add a summary and full description.");
  if (c.demoMode === "embed" && !c.liveUrl) issues.push("Add an HTTPS web experience URL.");
  if (c.demoMode === "external" && !c.liveUrl) issues.push("Add an external experience URL.");
  if (c.demoMode === "video" && !c.videoUrl) issues.push("Add a video walkthrough URL.");
  if (c.demoMode === "native" && (!c.deviceInfo || !c.instructions)) issues.push("Add device information and installation/source instructions.");
  if (!c.fallbackText) issues.push("Add fallback narrative for unsupported or unavailable media.");
  return issues;
}
