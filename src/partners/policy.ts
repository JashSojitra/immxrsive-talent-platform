import { z } from "zod";
import { safeAdminUrl } from "@/admin/policy";
const text = (max: number) => z.string().trim().max(max);
// Reserved example.test fixture website values are metadata only, never fetch targets.
export function companyWebsiteUrl(value:string):string|null {
 const safe=safeAdminUrl(value); if(safe)return safe;
 try { const u=new URL(value); if(u.protocol === "https:" && !u.username && !u.password && !u.port && !/[\s\\]/.test(value) && /^[a-z0-9.-]+\.example\.test$/i.test(u.hostname)) return u.href; }catch{}
 return null;
}
export function normalizedDomain(value: string) {
  if (!companyWebsiteUrl(value)) throw new Error("Use a public HTTPS website URL.");
  return new URL(value).hostname.toLowerCase().replace(/\.+$/, "").replace(/^www\./, "");
}
export const companySchema = z.object({ name: text(160).min(1), website: text(2048).refine(v => !v || Boolean(companyWebsiteUrl(v)), "Use a public HTTPS URL"), description: text(6000), sector: text(200), location: text(300) }).strict();
export const collaborationSchema = z.object({ companyId: z.uuid(), title: text(200).min(1), description: text(6000), outcome: text(6000), year: z.number().int().min(1900).max(2200), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0,10) === v).nullable(), status: z.enum(["current", "past"]), visibility: z.enum(["public", "limited", "private"]), projectIds: z.array(text(64).min(1)).max(30), participantIds: z.array(z.uuid()).max(60) }).strict();
export const requestSchema = z.object({ kind: z.enum(["verification", "association"]), projectId: text(64).min(1), note: text(4000).min(1), evidence: text(2048).refine(v => !v || Boolean(safeAdminUrl(v))), companyId: z.uuid().nullable(), suggestedCompany: text(200) }).strict().superRefine((v,c) => { if(v.kind === "association" && !v.companyId && !v.suggestedCompany) c.addIssue({code:"custom",message:"Select or suggest a company."}); });
export type CompanyContent = z.infer<typeof companySchema>;
export type CollaborationContent = z.infer<typeof collaborationSchema>;
export function publicCollaboration<T extends { visibility: string; title: string; year: number; status: string }>(c: T) {
  if(c.visibility === "private") return null;
  if(c.visibility === "limited") return { title: "Anonymized collaboration", year: c.year, status: c.status, visibility: "limited" as const };
  return c;
}
