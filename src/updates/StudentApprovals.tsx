/* eslint-disable @next/next/no-img-element -- Uploaded WebP images and local blob previews need no optimizer. */
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Markdown } from "./Markdown";
import styles from "./updates.module.css";
export type ApprovalStory = { id: string; version: number; title: string; excerpt: string; bodyMarkdown: string; coverMediaId: string | null; coverAlt: string };
export function StudentApprovals({ stories }: { stories: ApprovalStory[] }) {
  return <section className={styles.cardBody}><h2>Stories about you</h2>{stories.length ? stories.map(s=><Story key={`${s.id}-${s.version}`} story={s} />) : <p>No stories are waiting for your approval.</p>}</section>;
}
function Story({ story }: { story: ApprovalStory }) {
  const router = useRouter(); const [note,setNote]=useState(""); const [message,setMessage]=useState(""); const [busy,setBusy]=useState(false);
  async function respond(approve: boolean) {
    setBusy(true);
    try { const r=await fetch("/api/student/stories",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:story.id,version:story.version,approve,note})}); const data=await r.json(); if(!r.ok) throw new Error(data.error?.message || "Could not save."); setMessage("Response saved."); router.refresh(); } catch(e) {setMessage(e instanceof Error ? e.message : "Could not save.");} finally {setBusy(false);}
  }
  return <details><summary>{story.title}</summary><p>{story.excerpt}</p>{story.coverMediaId && <img src={`/media/${story.coverMediaId}`} alt={story.coverAlt} style={{ maxWidth: "100%" }} />}<div className={styles.body}><Markdown body={story.bodyMarkdown} /></div><label>Note for staff<textarea value={note} maxLength={2000} onChange={e=>setNote(e.target.value)} /></label><div className={styles.actions}><button disabled={busy} onClick={()=>respond(true)}>Approve</button><button disabled={busy || !note.trim()} onClick={()=>respond(false)}>Ask for changes</button></div><p role="status">{message}</p></details>;
}
