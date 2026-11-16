"use client";
import { useState } from "react";
import type { accessList } from "./service";
import styles from "@/components/project-editor/project-editor.module.css";
import admin from "./admin.module.css";
type Grant = Awaited<ReturnType<typeof accessList>>[number];
export function AdminAccess({ initial }: { initial: Grant[] }) {
  const [grants, setGrants] = useState(initial); const [subject, setSubject] = useState(""); const [role, setRole] = useState("xr_curator"); const [reason, setReason] = useState(""); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  const previous = grants.find(g => g.userId === subject)?.role ?? null;
  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/access", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subject, role: role || null, expectedRole: previous, reason }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error?.message ?? "Access update failed.");
      setMessage("Access changed and audited. Revocations apply to the next protected operation, including open editors."); setReason("");
      const refresh = await fetch("/api/admin/access", { cache: "no-store" }); if (refresh.ok) setGrants(await refresh.json());
    } catch (e) { setMessage(`${(e as Error).message} Refresh this page if access changed concurrently.`); } finally { setBusy(false); }
  }
  return <><p>Use the exact internal account ID shared by an authenticated staff member. This page never searches private student accounts. Changes require a reason and preserve at least one super administrator.</p><div className={admin.scroll}><table><caption>Current staff access</caption><thead><tr><th>Staff name / internal ID</th><th>Role</th><th>Action</th></tr></thead><tbody>{grants.map(g => <tr key={g.userId}><td>{g.name}<br /><code>{g.userId}</code></td><td>{g.role}</td><td><button onClick={() => { setSubject(g.userId); setRole(g.role); }}>Manage {g.name}</button></td></tr>)}</tbody></table></div>
    <form onSubmit={save}><fieldset disabled={busy} className={styles.section}><legend>Assign or revoke staff access</legend><label htmlFor="access-subject">Target internal account ID</label><input id="access-subject" required maxLength={200} value={subject} onChange={e => setSubject(e.target.value)} /><p>Current role: {previous ?? "No staff role"}</p><label htmlFor="access-role">New role</label><select id="access-role" value={role} onChange={e => setRole(e.target.value)}><option value="xr_curator">Curator — read and review</option><option value="xr_admin">XR admin — manage administrator projects</option><option value="platform_super_admin">Platform super admin — full administration</option><option value="">Revoke staff access</option></select><label htmlFor="access-reason">Reason / approved change reference</label><textarea id="access-reason" required maxLength={2000} value={reason} onChange={e => setReason(e.target.value)} /><button className={styles.primary} type="submit">Save access change</button></fieldset></form><p role="status" aria-live="polite">{message}</p></>;
}
