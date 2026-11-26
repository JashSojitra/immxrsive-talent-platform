/* eslint-disable @next/next/no-img-element -- Uploaded WebP images and local blob previews need no optimizer. */
"use client";
import { useEffect, useState } from "react";
import styles from "./updates.module.css";
export function MediaUpload({ kind, onUpload }: { kind: "avatar" | "article_cover" | "article_inline"; onUpload: (id: string) => void | Promise<void> }) {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [position, setPosition] = useState("centre");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  function selectFile(next: File | null) { setFile(next); setUrl(next ? URL.createObjectURL(next) : ""); }
  async function upload() {
    if (!file) return;
    setBusy(true); setMessage("");
    try {
      // Bound the transport below Vercel's request limit; the server still validates and strips metadata.
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
      const body = await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Image could not be prepared.")), "image/webp", .86));
      if (body.size > 4 * 1024 * 1024) throw new Error("This image is too complex to upload. Try a smaller image.");
      const response = await fetch("/api/media", { method: "POST", headers: { "Content-Type": body.type, "X-Media-Kind": kind, "X-Crop-Position": position }, body });
      const data = await response.json(); if (!response.ok) throw new Error(data.error?.message || "Upload failed.");
      await onUpload(data.id); selectFile(null); setMessage("Image saved.");
    } catch (e) { setMessage(e instanceof Error ? e.message : "Upload failed."); } finally { setBusy(false); }
  }
  return <fieldset disabled={busy}><legend>{kind === "avatar" ? "Profile photo" : kind === "article_cover" ? "Cover image" : "Insert image"}</legend>
    <label>Choose JPG, PNG or WebP (up to 8 MB)<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => { const next = e.target.files?.[0] ?? null; if (next && next.size > 8 * 1024 * 1024) { setMessage("Use an image up to 8 MB."); selectFile(null); } else { selectFile(next); setMessage(""); } }} /></label>
    {kind === "avatar" && file && <label>Crop position<select value={position} onChange={e => setPosition(e.target.value)}>{["centre", "north", "south", "east", "west"].map(p => <option key={p}>{p}</option>)}</select></label>}
    
    {url && <img src={url} alt="Upload preview" className={kind === "avatar" ? styles.avatar : undefined} style={kind === "avatar" ? { objectPosition: { centre: "center", north: "top", south: "bottom", east: "right", west: "left" }[position] } : { maxWidth: "100%", maxHeight: 240 }} />}
    <div className={styles.actions}><button type="button" disabled={!file} onClick={upload}>{busy ? "Uploading…" : kind === "article_inline" ? "Upload and insert image" : "Upload image"}</button></div><p role="status">{message}</p>
  </fieldset>;
}
export function AvatarEditor({ initialId }: { initialId: string | null }) {
  const [id, setId] = useState(initialId); const [message, setMessage] = useState("");
  async function save(mediaId: string | null) {
    const r = await fetch("/api/media", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mediaId }) });
    if (!r.ok) { const data = await r.json(); throw new Error(data.error?.message || "Photo could not be saved."); } setId(mediaId); setMessage("Profile photo updated. Reload the profile editor before saving other edits.");
  }
  return <section className={styles.form}><h2>Your profile photo</h2>{id && <img src={`/media/${id}`} alt="Current profile photo" className={styles.avatar} />}<MediaUpload kind="avatar" onUpload={save} />{id && <div className={styles.actions}><button type="button" onClick={() => save(null).catch(e => setMessage(e.message))}>Remove photo</button></div>}<p role="status">{message}</p></section>;
}
