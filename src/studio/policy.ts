import { z } from "zod";
import { safeEvidenceUrl } from "@/projects/evidence-url";
export const states = ["submitted", "under_review", "changes_requested", "approved", "rejected", "withdrawn"] as const;
export type State = typeof states[number];
export type Role = "xr_curator" | "xr_admin" | "platform_super_admin";
export const contentSchema = z.object({
  title: z.string().trim().min(1).max(160),
  summary: z.string().trim().min(1).max(4000),
  mediaUrl: z.string().max(2048).refine(v => v === "" || Boolean(safeEvidenceUrl(v)), "Use a safe HTTPS evidence URL."),
  demoUrl: z.string().max(2048).refine(v => v === "" || Boolean(safeEvidenceUrl(v)), "Use a safe HTTPS demo URL."),
}).strict();
export const commandSchema = z.object({
  version: z.number().int().positive(),
  action: z.enum(["submit", "resubmit", "withdraw", "review", "request_changes", "approve", "reject", "suggest", "accept", "publish", "moderate"]),
  note: z.string().trim().max(2000).default(""),
  content: contentSchema.optional(),
}).strict();
export type Command = z.infer<typeof commandSchema>;
export function authorizeCommand(state: State, command: Command, owner: boolean, role: Role | null) {
  const { action, note } = command;
  const ownerActions = ["resubmit", "withdraw", "accept"];
  if (ownerActions.includes(action)) {
    if (!owner) throw new Error("FORBIDDEN");
  } else if (action !== "submit") {
    if (!role) throw new Error("FORBIDDEN");
    if (["publish", "moderate"].includes(action) && role === "xr_curator") throw new Error("FORBIDDEN");
  } else if (!owner) throw new Error("FORBIDDEN");
  if (["request_changes", "reject", "moderate", "suggest"].includes(action) && !note) throw new Error("REASON_REQUIRED");
  const allowed: Record<Command["action"], readonly State[]> = {
    submit: [], resubmit: ["changes_requested", "rejected", "withdrawn"], withdraw: ["submitted", "under_review", "changes_requested", "approved"],
    review: ["submitted"], request_changes: ["under_review"], approve: ["under_review"], reject: ["under_review"],
    suggest: ["under_review", "changes_requested", "approved"], accept: ["under_review", "changes_requested", "approved"], publish: ["approved"], moderate: ["approved"],
  };
  if (!allowed[action].includes(state)) throw new Error("INVALID_TRANSITION");
}

export function showcaseVisibility(s: { published: boolean; state: string; contentVersion: number; acceptedVersion: number | null; acceptedBy: string | null; acceptedProjectVersion: number | null }, p: { maintainerUserId: string | null; version: number; publicationStatus: string }) {
  const ownerApprovalCurrent = s.acceptedVersion === s.contentVersion && s.acceptedBy === p.maintainerUserId && s.acceptedProjectVersion === p.version;
  return { ownerApprovalCurrent, effectivePublished: s.published && s.state === "approved" && ownerApprovalCurrent && p.publicationStatus === "published" };
}
