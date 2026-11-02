import { z } from "zod";
import { safeEvidenceUrl } from "./evidence-url";
import { PROJECT_MEDIA_KINDS } from "@/db/schema";
import { githubRepository } from "./repository-url";

export const publicProjectUrl = z.string().trim().max(2048).transform((value, context) => {
  const url = safeEvidenceUrl(value);
  if (url) return url;
  context.addIssue({ code: "custom", message: "Use a public HTTPS URL without credentials or a custom port, or an exact hosted course fixture path." });
  return z.NEVER;
});
export function repositoryKey(value: string) {
  if (new URL(value).hostname.toLowerCase() === "github.com") return githubRepository(value).key;
  const url = new URL(publicProjectUrl.parse(value));
  url.hash = ""; url.search = "";
  url.pathname = url.pathname.replace(/\/+$/, "").replace(/\.git$/i, "");
  if (url.hostname === "github.com") url.pathname = url.pathname.toLowerCase();
  return url.href.replace(/\/$/, "");
}
export const repositoryUrl = z.string().trim().superRefine((value, ctx) => {
  try { if (new URL(value).hostname.toLowerCase() === "github.com") githubRepository(value); }
  catch { ctx.addIssue({ code: "custom", message: "Use a repository page URL without encoded paths, credentials or ports." }); }
}).pipe(publicProjectUrl);
export const projectDraftSchema = z.object({
  title: z.string().trim().min(1).max(160), description: z.string().trim().max(2000),
  domain: z.string().trim().min(1).max(120), projectDate: z.iso.date().nullable().default(null),
  projectStatus: z.enum(["in_progress", "completed", "on_hold"]).default("in_progress"),
  technologies: z.array(z.string().trim().min(1).max(80)).max(40).default([]),
  repositories: z.array(z.object({ url: repositoryUrl }).strict()).max(20).default([]),
  links: z.array(z.object({ label: z.string().trim().min(1).max(120), url: publicProjectUrl }).strict()).max(20).default([]),
  media: z.array(z.object({
    kind: z.enum(PROJECT_MEDIA_KINDS), url: publicProjectUrl, label: z.string().trim().min(1).max(120),
    altText: z.string().trim().max(500).default(""),
  }).strict()).max(20).default([]),
}).strict().superRefine((draft, context) => {
  const keys = draft.repositories.map(({ url }) => repositoryKey(url));
  if (new Set(keys).size !== keys.length) context.addIssue({ code: "custom", path: ["repositories"], message: "Remove repeated repository URLs." });
  if (new Set(draft.technologies.map(x => x.toLowerCase())).size !== draft.technologies.length) context.addIssue({ code: "custom", path: ["technologies"], message: "Remove repeated technologies." });
  for (const kind of ["playable", "video"]) if (draft.media.filter(x => x.kind === kind).length > 1) context.addIssue({ code: "custom", path: ["media"], message: `Only one ${kind} link is supported.` });
});
export const contributionSchema = z.object({
  roleId: z.string().min(1).max(80), statement: z.string().trim().max(3000), featured: z.boolean(), publicVisible: z.boolean(),
}).strict();
export type ProjectDraft = z.output<typeof projectDraftSchema>;
