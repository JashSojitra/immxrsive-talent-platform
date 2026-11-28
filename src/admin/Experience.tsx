"use client";
import { ProjectGallery } from "@/components/project-detail/ProjectGallery";
import type { Screenshot } from "@/projects/screenshots-policy";
import { useEffect, useRef, useState } from "react";
import { safeAdminUrl } from "./policy";
import type { PublicAdminPresentation } from "./public";
import styles from "@/components/project-detail/project-demo.module.css";
export function AdminExperience({ content: c, screenshots = [] }: { content: PublicAdminPresentation; screenshots?: Screenshot[] }) {
  const [active, setActive] = useState(false); const [status, setStatus] = useState(""); const [failed, setFailed] = useState<string[]>([]);
  const frame = useRef<HTMLIFrameElement>(null); const launch = useRef<HTMLButtonElement>(null);
  const live = safeAdminUrl(c.liveUrl); const video = safeAdminUrl(c.videoUrl);
  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => setStatus("This frame may be unavailable or blocked. Open the experience externally or use the fallback below."), 10000);
    return () => clearTimeout(timer);
  }, [active]);
  const external = (url: string, label: string) => <a href={url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">{label} (new tab)</a>;
  const fail = (url: string) => setFailed(v => [...v, url]);
  function start() {
    if (!live) return;
    if (new URL(live).origin === window.location.origin) { setStatus("Use an independently hosted origin for embedded experiences. External launch and fallback remain available."); return; }
    setActive(true); setStatus("Loading isolated experience. Frame navigation does not verify that the experience works.");
    requestAnimationFrame(() => frame.current?.focus());
  }
  function stop() { setActive(false); setStatus("Experience closed. Alternate evidence remains available."); requestAnimationFrame(() => launch.current?.focus()); }
  return <section className={styles.section} aria-labelledby="admin-experience-title">
    <p className={`ui-eyebrow ${styles.eyebrow}`}>01 / Experience the work</p><h2 id="admin-experience-title">Explore the experience.</h2>
    <p className={styles.intro}>{c.summary}</p>
    {c.demoMode === "native" && <div className={styles.evidence}><h3>XR / native experience</h3><p>This experience may require a supported device and installed software. It does not run automatically in this browser.</p><p>{c.deviceInfo}</p><p>{c.instructions}</p></div>}
    <div className={styles.actions}>
      {c.demoMode === "embed" && live && <button ref={launch} onClick={start} disabled={active}>Launch embedded experience</button>}
      {live && c.demoMode !== "static" && external(live, "Launch externally")}
      {active && <><button onClick={stop}>Close experience</button><button onClick={() => { void frame.current?.requestFullscreen?.().catch(() => setStatus("Fullscreen is unavailable. Use the external launch link.")); }}>Fullscreen</button></>}
    </div>
    <p role="status" aria-live="polite">{status}</p>
    {active && live && <iframe title={`${c.title} isolated experience`} ref={frame} src={live} className={styles.frame} sandbox="allow-scripts" referrerPolicy="no-referrer" allowFullScreen allow="fullscreen; camera 'none'; microphone 'none'; geolocation 'none'; payment 'none'; usb 'none'; xr-spatial-tracking 'none'" onLoad={() => setStatus("Frame navigation finished. If framing is blocked or the experience is blank, launch externally or use the fallback below.")} onError={() => setStatus("Experience could not load. Use external launch or fallback evidence.")} />}
    {video && <article className={styles.evidence}><h3>Video walkthrough</h3><p>{c.videoDescription}</p>{/\.(mp4|webm|ogv)(\?|$)/i.test(new URL(video).pathname) && !failed.includes(video) && <video src={video} controls playsInline preload="none" aria-label={`${c.title} video walkthrough`} onError={() => fail(video)} />}{failed.includes(video) && <p>Video unavailable here. Use the external link or fallback narrative.</p>}{external(video, "Watch walkthrough")}</article>}
    <div className={styles.fallback}><h3>Alternate evidence</h3><p>{c.fallbackText || "Read the project narrative and source links below."}</p><p>On mobile or unsupported devices, use the video, gallery and external links. Some hosts block framing; their availability cannot be confirmed by this player.</p>{safeAdminUrl(c.fallbackUrl) && external(c.fallbackUrl, "Open fallback content")}
      <ProjectGallery images={[...screenshots, ...[...(c.thumbnail ? [{ url: c.thumbnail, alt: c.thumbnailAlt }] : []), ...c.gallery].filter(g => safeAdminUrl(g.url)).map(g => ({ url: g.url, altText: g.alt, caption: g.alt }))]} />
    </div>
  </section>;
}
