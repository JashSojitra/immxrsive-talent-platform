"use client";
import { useState } from "react";
import type { studioDetail } from "./service";
import { authorizeCommand, type Command, type State } from "./policy";
import styles from "@/components/project-editor/project-editor.module.css";
type Detail = Awaited<ReturnType<typeof studioDetail>>;
const labels: Record<Command["action"], string> = { submit: "Submit showcase request", resubmit: "Resubmit this content", withdraw: "Withdraw showcase", review: "Start review", request_changes: "Request changes", approve: "Approve review", reject: "Reject request", suggest: "Save suggestions (requires owner approval)", accept: "Approve this exact showcase content", publish: "Publish approved showcase", moderate: "Unpublish curated showcase" };
function HistoricalContent({ snapshot }: { snapshot: unknown }) {
  if (!snapshot || typeof snapshot !== "object" || !("title" in snapshot) || !("summary" in snapshot)) return null;
  const saved = snapshot as Record<string, unknown>;
  return <details><summary>Saved content at this event</summary><p>{String(saved.title)}</p><p>{String(saved.summary)}</p><p>Media: {String(saved.mediaUrl ?? "")}</p><p>Demo: {String(saved.demoUrl ?? "")}</p></details>;
}
export function Review({ initial }: { initial: Detail }) {
  const [detail, setDetail] = useState(initial); const s = detail.submission;
  const [content, setContent] = useState({ title: s?.title ?? detail.project.title, summary: s?.summary ?? detail.project.description, mediaUrl: s?.mediaUrl ?? "", demoUrl: s?.demoUrl ?? "" });
  const [note, setNote] = useState(""); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  const actions = (Object.keys(labels) as Command["action"][]).filter(action => {
    if (!s) return detail.owner && action === "submit";
    try { authorizeCommand(s.state as State, { action, version: s.version, note: "required" }, detail.owner, detail.role); return true; } catch { return false; }
  });
  async function send(action: Command["action"]) {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/studio/${encodeURIComponent(detail.project.id)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, version: s?.version ?? detail.project.version, note, ...(["submit", "resubmit", "suggest"].includes(action) ? { content } : {}) }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error?.message ?? "Unable to save.");
      setDetail(data); setNote(""); setMessage("Saved. History and status updated.");
    } catch (e) { setMessage(`${(e as Error).message} Your entries are retained. Reload to resolve a revision conflict.`); }
    finally { setBusy(false); }
  }
  return <>
    <p className={styles.eyebrow}>{s?.state.replaceAll("_", " ") ?? "Not submitted"} / {s?.effectivePublished ? "Showcased" : "Not showcased"}</p>
    <p>Canonical project publication and contributor consent stay separately controlled. Submission authorizes staff to review this showcase text. Review notes are visible to the current project owner.</p>
    <section className={styles.section} aria-labelledby="content-heading"><h2 id="content-heading">Showcase content</h2>
      <p>Owner approval applies to the saved content shown below. Save suggestions before asking the owner to approve them. Publishing also requires the canonical project to be public and unchanged since owner approval.</p>
      {s && <article className={styles.card}><h3>{s.title}</h3><p>{s.summary}</p><p>Media: {s.mediaUrl || "None"}</p><p>Demo: {s.demoUrl || "None"}</p><p>Content revision {s.contentVersion}. {s.ownerApprovalCurrent ? "Owner approved this content." : "Awaiting current owner approval; project changes invalidate earlier approval."}</p></article>}
      {(["submit", "resubmit", "suggest"] as const).some(a => actions.includes(a)) && <fieldset disabled={busy}><legend>Proposed text and evidence links</legend>
        <label htmlFor="title">Showcase title</label><input id="title" maxLength={160} value={content.title} onChange={e => setContent({ ...content, title: e.target.value })} />
        <label htmlFor="summary">Showcase summary</label><textarea id="summary" rows={7} maxLength={4000} value={content.summary} onChange={e => setContent({ ...content, summary: e.target.value })} />
        <label htmlFor="media">Media suggestion (HTTPS URL)</label><input id="media" type="url" value={content.mediaUrl} onChange={e => setContent({ ...content, mediaUrl: e.target.value })} />
        <label htmlFor="demo">Demo suggestion (HTTPS URL)</label><input id="demo" type="url" value={content.demoUrl} onChange={e => setContent({ ...content, demoUrl: e.target.value })} />
      </fieldset>}
      <label htmlFor="note">Response / reason (required for suggestions, rejection, changes or moderation)</label><textarea id="note" rows={3} maxLength={2000} value={note} onChange={e => setNote(e.target.value)} />
      <div className={styles.actions}>{actions.map(action => <button key={action} type="button" disabled={busy} onClick={() => send(action)}>{labels[action]}</button>)}</div>
      <p role="status" aria-live="polite">{message}</p>
    </section>
    <section className={styles.section}><h2>Review history</h2>{detail.history.map(event => <article className={styles.card} key={event.id}><h3>{event.action.replaceAll("_", " ")}</h3><p>{event.note || "No additional note."}</p><small>{new Date(event.createdAt).toISOString()} / Actor {event.actorUserId}</small><HistoricalContent snapshot={event.snapshot} /></article>)}</section>
  </>;
}
