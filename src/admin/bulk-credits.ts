import { creditSchema, type AdminContent } from "./policy";
import { normalizeInstitutionalEmail } from "@/verification/validation";
export function parseBulkCredits(text: string, domains: readonly string[]) {
  const credits: AdminContent["credits"] = [], errors: { line: number; message: string }[] = [];
  const approved = new Set(domains);
  text.split(/\r?\n/).forEach((line, index) => {
    if (!line.trim()) return;
    const columns = line.split(",").map(v => v.trim());
    if (columns.length !== 3) { errors.push({ line: index + 1, message: "Use name, email, role." }); return; }
    const [name, email, role] = columns;
    const parsed = creditSchema.safeParse({ name, institutionalEmail: email, role, statement: "", profileId: "" });
    if (!parsed.success) { errors.push({ line: index + 1, message: parsed.error.issues.map(i => `${String(i.path[0])}: ${i.message}`).join(" ") }); return; }
    const normalized = normalizeInstitutionalEmail(email, approved);
    if (!normalized) { errors.push({ line: index + 1, message: "Use an allowed Algoma institutional email." }); return; }
    if (credits.some(c => c.institutionalEmail === normalized)) { errors.push({ line: index + 1, message: "This email is already included in an earlier line." }); return; }
    credits.push({ ...parsed.data, institutionalEmail: normalized });
  });
  return { credits, errors };
}
