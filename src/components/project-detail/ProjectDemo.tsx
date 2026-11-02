"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { PublicProjectAsset } from "@/db/queries/project-detail";
import { mayEmbedDemo, safeEvidenceUrl } from "@/projects/evidence-url";
import styles from "./project-demo.module.css";

const WAIT_MS = 10_000;
export function ProjectDemo({ title, assets }: { title: string; assets: PublicProjectAsset[] }) {
  const safe = assets.flatMap(a => { const url = safeEvidenceUrl(a.url); return url ? [{ ...a, url }] : []; });
  const playable = safe.find(a => a.type === "playable");
  const videos = safe.filter(a => a.type === "video");
  const sources = safe.filter(a => ["source", "repository"].includes(a.type));
  const fallbacks = safe.filter(a => ["fallback_image", "fallback_video", "fallback_link"].includes(a.type));
  const [session, setSession] = useState(0);
  const [state, setState] = useState<"idle" | "loading" | "loaded" | "waiting" | "stopped" | "external">("idle");
  const [failedMedia, setFailedMedia] = useState<string[]>([]);
  const [showVideos, setShowVideos] = useState(false);
  const player = useRef<HTMLIFrameElement>(null); const launch = useRef<HTMLButtonElement>(null); const fallback = useRef<HTMLDivElement>(null);
  const active = ["loading", "loaded", "waiting"].includes(state);
  useEffect(() => {
    if (!active) return;
    const timer = window.setTimeout(() => setState(current => current === "loading" ? "waiting" : current), WAIT_MS);
    return () => window.clearTimeout(timer);
  }, [active, session]);
  function start() {
    if (!playable) return;
    if (!mayEmbedDemo(playable.url, window.location.origin)) { setState("external"); return; }
    setSession(n => n + 1); setState("loading");
    requestAnimationFrame(() => player.current?.focus());
  }
  function stop() { setState("stopped"); requestAnimationFrame(() => launch.current?.focus()); }
  const failed = (url: string) => setFailedMedia(previous => previous.includes(url) ? previous : [...previous,url]);
  if (!playable && !videos.length && !sources.length && !fallbacks.length) return null;
  return <section className={styles.section} aria-labelledby="project-demo-title">
    <p className={styles.eyebrow}>01 / Experience the work</p><h2 id="project-demo-title">A window into<br /><em>the experience.</em></h2>
    <p className={styles.intro}>Choose how to explore {title}. Interactive content starts only when you launch it. Project details and alternate evidence remain available throughout.</p>
    <div className={styles.actions}>
      {playable ? <><button className={styles.primary} onClick={start} ref={launch} disabled={active}>Play Demo / Launch Experience</button><a href={playable.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">Open Externally <span className={styles.srOnly}>(new tab)</span></a></> : null}
      {videos.length ? <button onClick={() => setShowVideos(v => !v)}>{showVideos ? "Close video evidence" : "Watch Demo"}</button> : null}
      {sources.map((a,i) => <a key={`${a.url}-${i}`} href={a.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">View Source{sources.length > 1 ? `: ${a.label}` : ""}<span className={styles.srOnly}> (new tab)</span></a>)}
      {fallbacks.length ? <button onClick={() => { fallback.current?.scrollIntoView({ behavior: "auto", block: "start" }); fallback.current?.focus(); }}>View Fallback</button> : null}
    </div>
    {playable ? <div className={styles.playerShell}>
      <p role="status" aria-live="polite" className={styles.state}>{state === "idle" ? "Ready when you are. No interactive demo has been loaded." : state === "loading" ? "Loading the demo frame. Availability has not been confirmed." : state === "loaded" ? "The frame navigation finished; this does not confirm the demo works. If it is blank or blocked, open externally or use fallback evidence." : state === "waiting" ? "The demo may be slow, blocked or unsupported. Its availability cannot be confirmed here. Retry, open externally, or use fallback evidence." : state === "external" ? "This experience is available through external launch. Use Open Externally or alternate evidence." : "Demo stopped. Project details and fallback evidence are still available."}</p>
      {active ? <>
        <iframe key={session} ref={player} title={`${title} playable demo`} src={playable.url} className={styles.frame}
          sandbox="allow-scripts" referrerPolicy="no-referrer" allow="camera 'none'; microphone 'none'; geolocation 'none'; payment 'none'; usb 'none'; fullscreen 'none'; xr-spatial-tracking 'none'"
          onLoad={() => setState(current => current === "loading" ? "loaded" : current)} />
        <div className={styles.actions}><button onClick={start}>Retry demo</button><button onClick={stop}>Stop / Close demo</button></div>
      </> : state !== "idle" ? <div className={styles.actions}><button onClick={start}>Retry demo</button></div> : null}
      <small>Some sites refuse framing or need capabilities this isolated player does not grant. On mobile, external access or fallback evidence may work better. No autoplay, camera, microphone or account access is granted here.</small>
    </div> : null}
    {showVideos ? <div className={styles.mediaGroup}>{videos.map((a,i) => <article className={styles.evidence} key={`${a.url}-${i}`}><h3>{a.label}</h3><p>{a.altText || "Project video evidence. Use the external link if this host does not provide a direct video file."}</p>{!failedMedia.includes(a.url) ? <video controls preload="none" playsInline aria-label={a.altText || a.label} onError={() => failed(a.url)} src={a.url} /> : <p role="status">This video could not be played here. The project remains available.</p>}<a href={a.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">Open video evidence {i + 1} (new tab)</a></article>)}</div> : null}
    {fallbacks.length ? <div className={styles.fallback} ref={fallback} tabIndex={-1} aria-labelledby="fallback-title"><p className={styles.eyebrow}>Alternate evidence / Always within reach</p><h3 id="fallback-title">Understand the work another way.</h3>
      {fallbacks.map((a,i) => <article key={`${a.url}-${i}`} className={styles.evidence}><h4>{a.label}</h4><p>{a.altText || "Alternate project evidence supplied by the maintainer."}</p>
        {a.type === "fallback_image" && !failedMedia.includes(a.url) ? /* Unoptimized evidence loads directly in the browser, never through a server image proxy. */ <Image unoptimized width={900} height={506} src={a.url} alt={a.altText || a.label} loading="lazy" referrerPolicy="no-referrer" onError={() => failed(a.url)} /> : null}
        {a.type === "fallback_video" && !failedMedia.includes(a.url) ? <video controls preload="none" playsInline aria-label={a.altText || a.label} src={a.url} onError={() => failed(a.url)} /> : null}
        {failedMedia.includes(a.url) ? <p role="status">This fallback media could not be displayed. Its description, other evidence and project details remain available.</p> : null}
        <a href={a.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">Open fallback evidence {i + 1} (new tab)</a>
      </article>)}
    </div> : null}
  </section>;
}
