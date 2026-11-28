"use client";
import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import type { Screenshot } from "@/projects/screenshots-policy";
import styles from "./project-gallery.module.css";
export function ProjectGallery({ images }: { images: Pick<Screenshot, "url" | "altText" | "caption">[] }) {
  const [active, setActive] = useState<number | null>(null);
  const [failed, setFailed] = useState<string[]>([]);
  const dialog = useRef<HTMLDialogElement>(null); const opener = useRef<HTMLButtonElement | null>(null); const title = useId();
  useEffect(() => { if (active !== null && !dialog.current?.open) dialog.current?.showModal(); }, [active]);
  if (!images.length) return null;
  function close() { dialog.current?.close(); setActive(null); requestAnimationFrame(() => opener.current?.focus()); }
  function step(by: number) { setActive(n => ((n ?? 0) + by + images.length) % images.length); }
  return <section className={styles.gallery} aria-label="Project screenshots"><h2 className="ui-card-title">Project screenshots</h2>
    <div className={styles.grid}>{images.map((image,i) => <figure key={`${image.url}-${i}`}>{failed.includes(image.url) ? <p>Image unavailable. {image.altText}</p> : <button type="button" aria-label={`Open screenshot ${i + 1}: ${image.altText}`} onClick={e => { opener.current = e.currentTarget; setActive(i); }}><Image src={image.url} alt={image.altText} width={640} height={400} unoptimized loading="lazy" onError={() => setFailed(p => [...p, image.url])} /></button>}{image.caption && <figcaption>{image.caption}</figcaption>}</figure>)}</div>
    <dialog ref={dialog} className={styles.lightbox} aria-labelledby={title} onClose={() => { setActive(null); opener.current?.focus(); }} onKeyDown={e => {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); step(e.key === "ArrowRight" ? 1 : -1); }
      if (e.key === "Tab") {
        const controls = [...e.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)")];
        const first = controls[0], last = controls[controls.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    }}>
      <h2 className="ui-card-title" id={title}>Screenshot {(active ?? 0) + 1} of {images.length}</h2><button className="ui-button ui-button-primary ui-button-compact" type="button" onClick={close} autoFocus>Close gallery</button>
      {active !== null && <figure><Image src={images[active].url} alt={images[active].altText} width={1920} height={1080} unoptimized /><figcaption>{images[active].caption || images[active].altText}</figcaption></figure>}
      <div className={styles.actions}><button className="ui-button ui-button-compact" type="button" onClick={() => step(-1)}>Previous screenshot</button><button className="ui-button ui-button-compact" type="button" onClick={() => step(1)}>Next screenshot</button></div>
    </dialog>
  </section>;
}
