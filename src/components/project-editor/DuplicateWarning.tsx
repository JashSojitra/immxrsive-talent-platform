"use client";
import Link from "next/link";
import { useState } from "react";
import type { DuplicateResult } from "@/projects/duplicates";
import styles from "./project-editor.module.css";
export function DuplicateWarning({ result, onContinue, disabled }: { result: DuplicateResult; onContinue: () => void; disabled: boolean }) {
  const [notice, setNotice] = useState(""); const [pending, setPending] = useState(false);
  async function join(id: string) {
    setPending(true); setNotice("");
    try { const r = await fetch(`/api/v1/student/projects/${id}/join-requests`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }); const body = await r.json();
      if (!r.ok) throw new Error(body.error?.message ?? "Your request could not be sent."); setNotice("Request sent. The maintainer must approve and propose a role; you must then accept the invitation.");
    } catch (e) { setNotice(e instanceof Error ? e.message : "Your request could not be sent."); } finally { setPending(false); }
  }
  return <section className={styles.feedback} aria-labelledby="duplicates-title"><h2 id="duplicates-title">Review possible existing projects.</h2><p>{result.hasExactMatch ? "A repository is already connected to a project. Some matches may not be publicly available; private details are never shown." : "These public project names are similar. This is advice, and your project can remain distinct."}</p>
    {result.matches.map(m => <article key={m.id} className={styles.card}><h3>{m.title}</h3><p>{m.kind === "repository" ? "Matching repository" : "Similar title in this domain"}</p><div className={styles.actions}><Link href={`/projects/${m.id}`} target="_blank" rel="noopener noreferrer" aria-describedby="duplicate-view-help">View Project: {m.title}</Link>{m.canRequestJoin ? <button disabled={disabled || pending} onClick={() => join(m.id)}>Request to Join: {m.title}</button> : <span>Join requests are unavailable here. Existing relationships and ownership are preserved.</span>}</div></article>)}
    <small id="duplicate-view-help">View Project opens a new tab, keeping your draft available here.</small><p role="status">{notice}</p><Link href="/student/project-invitations">Review my requests and invitations</Link><div className={styles.actions}><button disabled={disabled || pending} onClick={onContinue}>Continue with a distinct project</button></div><small>Continuing creates a separate record. Nothing is merged, and no contributor is added to an existing project.</small>
  </section>;
}
