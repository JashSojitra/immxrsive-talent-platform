"use client";
import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { screenshotTextSchema, type Screenshot, type ScreenshotState } from "@/projects/screenshots-policy";
import styles from "./project-editor.module.css";
type PendingImage = { file: File; altText: string; caption: string };
export function ScreenshotsEditor({ projectId, disabled = false }: { projectId?: string; disabled?: boolean }) {
  const [saved, setSaved] = useState<ScreenshotState | null>(null);
  const [items, setItems] = useState<Screenshot[]>([]);
  const [pending, setPending] = useState<PendingImage[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const working = useRef(false); const fileId = useId();
  const dirty = Boolean(saved && JSON.stringify(items) !== JSON.stringify(saved.screenshots));
  useEffect(() => {
    let alive = true;
    if (projectId) fetch(`/api/projects/${projectId}/screenshots`, { cache: "no-store" }).then(async r => { const data = await r.json(); if (!r.ok || !Array.isArray(data.screenshots)) throw Error(data.error?.message ?? "Unable to load screenshots."); if (alive) { setSaved(data); setItems(data.screenshots); } }).catch(() => { if (alive) setMessage("Unable to load screenshots. Reload the page to try again."); });
    return () => { alive = false; };
  }, [projectId]);
  function choose(files: File[]) {
    if (files.some(f => !["image/jpeg", "image/png", "image/webp"].includes(f.type) || f.size > 8 * 1024 * 1024)) { setMessage("Use JPG, PNG or WebP files up to 8 MB each."); return; }
    if (items.length + pending.length + files.length > 10) { setMessage("A project can have at most 10 screenshots."); return; }
    setPending(p => [...p, ...files.map(file => ({ file, altText: "", caption: "" }))]); setMessage("");
  }
  async function update(next: Screenshot[]) {
    if (!projectId || !saved || working.current) return;
    if (next.some(s => !screenshotTextSchema.safeParse({ altText: s.altText, caption: s.caption }).success)) { setMessage("Add an alt description to every screenshot (up to 300 characters)."); return; }
    working.current = true; setBusy(true); setMessage("Saving screenshots…");
    try {
      const response = await fetch(`/api/projects/${projectId}/screenshots`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ revision: saved.revision, screenshots: next.map(({ id, altText, caption }) => ({ id, altText, caption })) }) });
      const data = await response.json(); if (!response.ok) throw Error(data.error?.message ?? "Screenshots could not be saved.");
      setSaved(data); setItems(data.screenshots); setMessage("Screenshots saved.");
    } catch (error) { setMessage((error as Error).message); } finally { setBusy(false); working.current = false; }
  }
  async function upload() {
    if (!projectId || !saved || working.current || !pending.length) return;
    if (pending.some(s => !screenshotTextSchema.safeParse({ altText: s.altText, caption: s.caption }).success)) { setMessage("Add an alt description to every selected image before uploading."); return; }
    working.current = true; setBusy(true); setMessage("");
    let uploaded = 0;
    try {
      for (const image of pending) {
        setMessage(`Uploading image ${uploaded + 1} of ${pending.length}…`);
        const response = await fetch("/api/media", { method: "POST", headers: { "Content-Type": image.file.type, "x-media-kind": "project_screenshot", "x-project-id": projectId, "x-alt-text": encodeURIComponent(image.altText), "x-caption": encodeURIComponent(image.caption) }, body: image.file });
        const data = await response.json(); if (!response.ok) throw Error(data.error?.message ?? "Image could not be uploaded.");
        uploaded++; setSaved(data); setItems(data.screenshots);
      }
      setMessage("Screenshots uploaded.");
    } catch (error) { setMessage(`${(error as Error).message} Uploaded images are kept; retry the remaining images.`); }
    finally { setPending(p => p.slice(uploaded)); setBusy(false); working.current = false; }
  }
  function move(index: number, by: number) { const next = [...items]; [next[index], next[index + by]] = [next[index + by], next[index]]; void update(next); }
  function remove(id: string) { if (window.confirm("Delete this screenshot and its uploaded image? This cannot be undone.")) void update(items.filter(v => v.id !== id)); }
  return <section className={styles.section} aria-label="Screenshots">
    <h2 className="ui-card-title">Screenshots</h2><p>Upload up to 10 real project images. Describe each image before uploading; captions are optional. Changes here save separately from the project narrative.</p>
    {!projectId ? <p>Save the project first to add screenshots.</p> : <fieldset disabled={disabled || busy || !saved}>
      <div className={styles.dropZone} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); if (!disabled && !busy && !dirty) choose([...e.dataTransfer.files]); }}>
        <label className={`ui-button ui-button-primary ${styles.uploadButton}`} htmlFor={fileId}><span aria-hidden="true">+</span> Choose screenshots</label><p>or drop your project images here</p><p className={styles.uploadHint}>JPG, PNG or WebP / up to 8 MB each / 10 images per project</p><input id={fileId} className={styles.fileInput} aria-label="Choose screenshots" type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={dirty || items.length + pending.length >= 10} onChange={e => { choose([...e.target.files ?? []]); e.target.value = ""; }} />
      </div>
      {pending.map((image,i) => <div className={styles.row} key={`${image.file.name}-${i}`}><p>{image.file.name}</p><label>Alt text for selected image {i + 1}<input value={image.altText} maxLength={300} onChange={e => setPending(p => p.map((v,n) => n === i ? { ...v, altText: e.target.value } : v))} /></label><label>Caption for selected image {i + 1}<input value={image.caption} maxLength={300} onChange={e => setPending(p => p.map((v,n) => n === i ? { ...v, caption: e.target.value } : v))} /></label><button type="button" onClick={() => setPending(p => p.filter((_,n) => n !== i))}>Remove selected image {i + 1}</button></div>)}
      {pending.length > 0 && <button type="button" disabled={dirty} onClick={upload}>Upload screenshots</button>}
      <ol className={styles.screenshotList}>{items.map((item,i) => <li className={styles.row} key={item.id}><Image src={item.url} alt={item.altText} width={320} height={180} unoptimized /><label>Screenshot {i + 1} alt text<input value={item.altText} maxLength={300} onChange={e => setItems(p => p.map(v => v.id === item.id ? { ...v, altText: e.target.value } : v))} /></label><label>Screenshot {i + 1} caption<input value={item.caption} maxLength={300} onChange={e => setItems(p => p.map(v => v.id === item.id ? { ...v, caption: e.target.value } : v))} /></label><div className={styles.actions}><button type="button" disabled={i === 0} onClick={() => move(i, -1)}>Move screenshot {i + 1} earlier</button><button type="button" disabled={i === items.length - 1} onClick={() => move(i, 1)}>Move screenshot {i + 1} later</button><button type="button" onClick={() => remove(item.id)}>Delete screenshot {i + 1}</button></div></li>)}</ol>
      {dirty && <button type="button" onClick={() => void update(items)}>Save screenshot descriptions</button>}
    </fieldset>}
    <p role="status" aria-live="polite">{message}</p>
  </section>;
}
