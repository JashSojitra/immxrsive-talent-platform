/* eslint-disable @next/next/no-img-element -- Uploaded WebP images and local blob previews need no optimizer. */
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { articleSlug, categories, categoryLabel, emptyArticle, type ArticleInput } from "./policy";
import { Markdown } from "./Markdown";
import { MediaUpload } from "./MediaUpload";
import styles from "./updates.module.css";
export type ArticleRecord = ArticleInput & { id: string; version: number; status: string; studentApprovedAt: string | null; studentNote: string };
export function ArticleEditor({ initial, canEdit = true }: { initial?: ArticleRecord; canEdit?: boolean }) {
  const router = useRouter();
  const [content, setContent] = useState<ArticleInput>(initial ? Object.fromEntries(Object.keys(emptyArticle).map(k => [k, initial[k as keyof ArticleInput]])) as ArticleInput : emptyArticle);
  const [record, setRecord] = useState(initial); const [manualSlug, setManualSlug] = useState(Boolean(initial));
  const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  function field<K extends keyof ArticleInput>(key: K, value: ArticleInput[K]) { setContent(c => ({ ...c, [key]: value })); }
  async function save(action: string) {
    setBusy(true); setMessage("");
    try {
      const r = await fetch("/api/admin/articles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: record?.id, version: record?.version, action, content }) });
      const data = await r.json(); if (!r.ok) throw new Error(data.error?.details?.map((d: { message: string }) => d.message).join(" ") || data.error?.message || "Save failed.");
      setRecord(data); setMessage(`Saved: ${data.status}${data.studentApprovedAt ? " · Student approved" : ""}`);
      if (!record) router.replace(`/admin/updates/${data.id}`); router.refresh();
    } catch (e) { setMessage(e instanceof Error ? e.message : "Save failed."); } finally { setBusy(false); }
  }
  return <><p role="status">{message || `Status: ${record?.status ?? "new draft"}`}</p>{record?.studentNote && <p>Student feedback: {record.studentNote}</p>}<div className={styles.editor}><fieldset className={styles.form} disabled={!canEdit || busy}><legend>Post details</legend>
    <label>Title<input value={content.title} maxLength={200} onChange={e => { field("title", e.target.value); if (!manualSlug) field("slug", articleSlug(e.target.value)); }} /></label>
    <label>Slug<input value={content.slug} onChange={e => { setManualSlug(true); field("slug", e.target.value); }} /></label>
    <label>Category<select value={content.category} onChange={e => field("category", e.target.value as ArticleInput["category"])}>{categories.map(c => <option key={c} value={c}>{categoryLabel[c]}</option>)}</select></label>
    <label>Excerpt (up to 200 characters)<input value={content.excerpt} maxLength={200} onChange={e => field("excerpt", e.target.value)} /></label>
    <label>Author display name<input value={content.authorDisplayName} maxLength={160} onChange={e => field("authorDisplayName", e.target.value)} /></label>
    {content.category === "student_success" && <label>Student profile ID<input value={content.studentProfileId ?? ""} onChange={e => field("studentProfileId", e.target.value || null)} /><small>Use the ID at the end of the student&apos;s portfolio URL.</small></label>}
    {content.category === "event" && <><label>Event name<input value={content.eventName} onChange={e => field("eventName", e.target.value)} /></label><label>Event date<input type="date" value={content.eventDate ?? ""} onChange={e => field("eventDate", e.target.value || null)} /></label><label>Event location<input value={content.eventLocation} onChange={e => field("eventLocation", e.target.value)} /></label></>}
    <MediaUpload kind="article_cover" onUpload={id => field("coverMediaId", id)} />{content.coverMediaId && <div className={styles.actions}><button type="button" onClick={() => field("coverMediaId", null)}>Remove cover</button></div>}
    <label>Cover alt text<input value={content.coverAlt} onChange={e => field("coverAlt", e.target.value)} /></label>
    <label>Body (Markdown)<textarea value={content.bodyMarkdown} onChange={e => field("bodyMarkdown", e.target.value)} /></label>
    <MediaUpload kind="article_inline" onUpload={id => field("bodyMarkdown", `${content.bodyMarkdown}\n\n![Describe this image](/media/${id})\n`)} />
    <label>Tags (comma separated)<input value={content.tags.join(", ")} onChange={e => field("tags", e.target.value.split(",").map(v => v.trim()))} onBlur={() => field("tags", content.tags.filter(Boolean))} /></label>
    <div className={styles.actions}>{[["draft", "Save draft"], ["in_review", "Send to review"], ...(content.category === "student_success" ? [["request_approval", "Request student approval"]] : []), ["published", "Publish"], ["draft", "Unpublish"], ["archived", "Archive"]].map(([action,label]) => <button key={label} type="button" onClick={() => save(action)}>{label}</button>)}</div>
  </fieldset><section className={styles.preview} aria-label="Live preview"><h2>Live preview</h2><h3>{content.title}</h3><p>{content.excerpt}</p>{content.coverMediaId && <img src={`/media/${content.coverMediaId}`} alt={content.coverAlt} style={{ maxWidth: "100%" }} />}<div className={styles.body}><Markdown body={content.bodyMarkdown} /></div></section></div></>;
}
