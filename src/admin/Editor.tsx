"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { adminContentSchema, canManage, emptyContent, publicationIssues, type AdminContent, type AdminCommand } from "./policy";
import type { Role } from "@/studio/policy";
import type { adminGitHubSuggestions } from "./github";
import styles from "@/components/project-editor/project-editor.module.css";
import admin from "./admin.module.css";
type Suggestions = Awaited<ReturnType<typeof adminGitHubSuggestions>>;
type RecordState = { id: string; version: number; lifecycle: string };
export function AdminEditor({ initial = emptyContent, record, role, focusDemo = false }: { initial?: AdminContent; record?: RecordState; role: Role; focusDemo?: boolean }) {
  const editor = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Server-rendered fields can appear before their client handlers are hydrated.
    if (editor.current) editor.current.dataset.editorReady = "true";
  }, []);
  const router = useRouter(); const [content, setContent] = useState(initial); const [current, setCurrent] = useState(record);
  const [tech, setTech] = useState(initial.technologies.join(", ")); const [tools, setTools] = useState(initial.tools.join(", "));
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState(""); const [errors, setErrors] = useState<string[]>([]); const feedback = useRef<HTMLDivElement>(null);
  const [repo, setRepo] = useState(""); const [suggestions, setSuggestions] = useState<Suggestions | null>(null);
  const [matches, setMatches] = useState<Array<{ id: string; title: string; exact: boolean; adminManaged: boolean }>>([]);
  const [note, setNote] = useState(""); const editable = canManage(role) && current?.lifecycle !== "archived";
  const value = () => ({ ...content, technologies: tech.split(",").map(s => s.trim()).filter(Boolean), tools: tools.split(",").map(s => s.trim()).filter(Boolean) });
  function patch<K extends keyof AdminContent>(key: K, v: AdminContent[K]) { setContent(c => ({ ...c, [key]: v })); }
  async function json(path: string, body: unknown) {
    const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await response.json(); if (!response.ok) throw new Error([data.error?.message ?? "Unable to save.", ...(data.error?.details ?? []).map((d: { field: string; message: string }) => `${d.field}: ${d.message}`)].join(" ")); return data;
  }
  async function save(action: AdminCommand["action"]) {
    setBusy(true); setErrors([]); setMessage("");
    try {
      const parsed = adminContentSchema.safeParse(value());
      if (!parsed.success && !["archive", "unpublish", "restore"].includes(action)) { setErrors(parsed.error.issues.map(i => `${i.path.join(".")}: ${i.message}`)); requestAnimationFrame(() => feedback.current?.focus()); return; }
      const c = parsed.success ? parsed.data : content;
      if (action === "publish" && publicationIssues(c).length) { setErrors(publicationIssues(c)); requestAnimationFrame(() => feedback.current?.focus()); return; }
      let saved = current;
      if (!saved) {
        const created = await json("/api/admin/projects", { content: c }); saved = { id: created.project.id, version: created.project.version, lifecycle: created.detail.lifecycle }; setCurrent(saved);
      }
      if (current || action !== "save") {
        const data = await json(`/api/admin/projects/${saved.id}`, { action, version: saved.version, note, ...(["save", "publish"].includes(action) ? { content: c } : {}) });
        saved = { id: data.project.id, version: data.project.version, lifecycle: data.detail.lifecycle }; setCurrent(saved);
      }
      setMessage(`Saved revision ${saved.version}. Status: ${saved.lifecycle}.`); setNote("");
      if (!record) router.replace(`/admin/projects/${saved.id}/edit`);
      router.refresh();
    } catch (e) { setErrors([`${(e as Error).message} Your entries are retained. Reload and reconcile if another administrator changed this record.`]); requestAnimationFrame(() => feedback.current?.focus()); }
    finally { setBusy(false); }
  }
  async function importRepo() {
    setBusy(true); setErrors([]); setMessage("");
    try { const result = await json("/api/admin/imports/github", { repositoryUrl: repo }); setSuggestions(result.suggestions); setMatches(result.duplicates); setMessage("Suggestions loaded. Review them, then apply to empty fields. Existing entries will be retained."); }
    catch (e) { setErrors([(e as Error).message]); } finally { setBusy(false); }
  }
  async function checkDuplicates() {
    setBusy(true); setErrors([]);
    try { const result = await json("/api/admin/duplicates", { repositoryUrl: content.originalRepository, title: content.title }); setMatches(result.filter((m: { id: string }) => m.id !== current?.id)); setMessage("Project matches checked. Review warnings before creating an independent presentation."); }
    catch (e) { setErrors([(e as Error).message]); } finally { setBusy(false); }
  }
  function applySuggestions() {
    if (!suggestions) return;
    const { title, summary, description, originalRepository, liveUrl, technologies } = suggestions;
    setContent(c => ({ ...c, title: c.title || title, summary: c.summary || summary, description: c.description || description, originalRepository: c.originalRepository || originalRepository, liveUrl: c.liveUrl || liveUrl }));
    if (!tech.trim()) setTech(technologies.join(", "));
    setMessage("Suggestions applied to empty fields. Review and edit before saving."); setSuggestions(null);
  }
  function field(key: keyof AdminContent, label: string, type = "text", multiline = false) {
    return <div key={key}><label htmlFor={`admin-${key}`}>{label}</label>{multiline ? <textarea id={`admin-${key}`} rows={key === "description" ? 8 : 3} value={String(content[key])} onChange={e => patch(key, e.target.value as never)} /> : <input id={`admin-${key}`} type={type} value={String(content[key])} onChange={e => patch(key, e.target.value as never)} />}</div>;
  }
  return <div ref={editor} className={styles.editor} data-editor-ready="false">
    <p className={admin.notice}>{current ? `Status: ${current.lifecycle} / Revision ${current.version}` : "New private draft"}. Administrator-managed publication requires no student account, invitation or approval.</p>
    {current && <div className={styles.actions}><Link href={`/admin/projects/${current.id}/preview`}>Preview saved project</Link><Link href={`/projects/${current.id}`}>Public URL (available when published)</Link></div>}
    <div ref={feedback} tabIndex={-1}>{errors.length > 0 && <div className={styles.feedback} role="alert"><h2>Review this information</h2><ul>{errors.map((e,i) => <li key={i}>{e}</li>)}</ul></div>}<p role="status" aria-live="polite">{message}</p></div>
    {editable && <section className={styles.section}><h2>Repository intake</h2><p>Import public metadata only. No repository code is downloaded, built or executed. Manual creation remains available.</p><label htmlFor="intake-repository">Public GitHub repository URL</label><input id="intake-repository" type="url" value={repo} onChange={e => setRepo(e.target.value)} /><button type="button" disabled={busy || !repo} onClick={importRepo}>Fetch repository suggestions</button><button type="button" disabled={busy} onClick={checkDuplicates}>Check project matches</button>
      {suggestions && <article className={styles.card}><h3>{suggestions.title}</h3><p>{suggestions.description}</p><p>{suggestions.technologies.join(", ")}</p><p>Homepage: {suggestions.liveUrl || "Not supplied"}</p><p>Updated: {suggestions.updatedAt || "Not supplied"}</p><button type="button" onClick={applySuggestions} disabled={busy}>Apply suggestions to empty fields</button></article>}
      {matches.length > 0 && <aside aria-label="Potential duplicates"><h3>Review matching projects</h3>{matches.map(m => <p key={m.id}>{m.exact ? "Exact repository" : "Similar title"}: <Link href={m.adminManaged ? `/admin/projects/${m.id}` : `/projects/${m.id}`}>{m.title}</Link>. {m.adminManaged && m.exact ? "Use the existing admin record." : "Review before creating an independent presentation; no automatic merge."}</p>)}</aside>}
    </section>}
    <form onSubmit={e => { e.preventDefault(); void save("save"); }}>
      <fieldset disabled={!editable || busy} className={styles.section}><legend>Project narrative</legend>{field("title", "Title")}{field("summary", "Summary", "text", true)}{field("description", "Full description", "text", true)}{field("domain", "Domain / category")}
        <label htmlFor="admin-projectStatus">Project progress</label><select id="admin-projectStatus" value={content.projectStatus} onChange={e => patch("projectStatus", e.target.value as AdminContent["projectStatus"])}><option value="in_progress">In progress</option><option value="completed">Completed</option><option value="on_hold">On hold</option></select>
        <div className={styles.columns}>{field("startDate", "Start date", "date")}{field("endDate", "End date", "date")}</div>
        <label htmlFor="admin-technologies">Technologies (comma separated)</label><input id="admin-technologies" value={tech} onChange={e => setTech(e.target.value)} /><label htmlFor="admin-tools">Tools / frameworks (comma separated)</label><input id="admin-tools" value={tools} onChange={e => setTools(e.target.value)} />
        {field("institution", "Institution / program attribution (optional)")}{field("originalRepository", "Original GitHub repository", "url")}{field("adaptedRepository", "Adapted demo source / repository", "url")}
      </fieldset>
      <fieldset id="demo-configuration" disabled={!editable || busy} className={styles.section}><legend>{focusDemo ? "Configure this experience" : "Experience configuration"}</legend><p>Attach an already hosted independent copy. Browser embeds are isolated and some hosts or frameworks require external launch. Native/Unity applications need a compatible WebGL build or device-specific installation.</p>
        <label htmlFor="admin-demoMode">Experience mode</label><select id="admin-demoMode" value={content.demoMode} onChange={e => patch("demoMode", e.target.value as AdminContent["demoMode"])}><option value="static">Static showcase</option><option value="embed">Safe web embed</option><option value="external">Hosted external experience</option><option value="video">Video walkthrough</option><option value="native">XR / native experience</option></select>
        {field("liveUrl", "Live experience URL (HTTPS)", "url")}{field("videoUrl", "Video walkthrough URL (HTTPS; direct MP4/WebM or supported external host)", "url")}{field("videoDescription", "Video description / transcript", "text", true)}{field("fallbackUrl", "Fallback content URL (optional HTTPS)", "url")}{field("fallbackText", "Fallback narrative (required to publish)", "text", true)}{field("deviceInfo", "Supported devices / platforms", "text", true)}{field("instructions", "Installation / source instructions", "text", true)}
      </fieldset>
      <fieldset disabled={!editable || busy} className={styles.section}><legend>Thumbnail and gallery</legend>{field("thumbnail", "Thumbnail HTTPS URL", "url")}{field("thumbnailAlt", "Thumbnail description")}
        {content.gallery.map((g,i) => <div className={styles.row} key={i}><label htmlFor={`gallery-url-${i}`}>Gallery image {i+1} HTTPS URL</label><input id={`gallery-url-${i}`} type="url" value={g.url} onChange={e => patch("gallery", content.gallery.map((v,n) => n === i ? { ...v, url: e.target.value } : v))} /><label htmlFor={`gallery-alt-${i}`}>Gallery image {i+1} description</label><input id={`gallery-alt-${i}`} value={g.alt} onChange={e => patch("gallery", content.gallery.map((v,n) => n === i ? { ...v, alt: e.target.value } : v))} /><button type="button" onClick={() => patch("gallery", content.gallery.filter((_,n) => n !== i))}>Remove gallery image {i+1}</button></div>)}<button type="button" disabled={content.gallery.length >= 12} onClick={() => patch("gallery", [...content.gallery, { url: "", alt: "" }])}>Add gallery image</button>
      </fieldset>
      <fieldset disabled={!editable || busy} className={styles.section}><legend>Descriptive contributor credits</legend><p>Credits do not create accounts, verify identity, grant ownership or generate personal skills. Link only a legitimate existing public profile relationship; leave the profile ID empty for manual credits.</p>
        {content.credits.map((c,i) => <div className={styles.row} key={i}>{([['name','Name'],['role','Project role'],['statement','Contribution description'],['profileId','Public profile internal ID (optional)']] as const).map(([key,label]) => <div key={key}><label htmlFor={`credit-${i}-${key}`}>{label} — credit {i+1}</label><input id={`credit-${i}-${key}`} value={c[key]} onChange={e => patch("credits", content.credits.map((v,n) => n === i ? { ...v, [key]: e.target.value } : v))} /></div>)}<button type="button" onClick={() => patch("credits", content.credits.filter((_,n) => n !== i))}>Remove credit {i+1}</button></div>)}<button type="button" disabled={content.credits.length >= 30} onClick={() => patch("credits", [...content.credits, { name: "", role: "", statement: "", profileId: "" }])}>Add contributor credit</button>
      </fieldset>
      <fieldset disabled={!editable || busy} className={styles.section}><legend>Presentation order</legend><label className={styles.choice}><input type="checkbox" checked={content.featured} onChange={e => patch("featured", e.target.checked)} />Featured showcase</label><label htmlFor="admin-displayOrder">Display order (lower first)</label><input id="admin-displayOrder" type="number" min={0} max={100000} value={content.displayOrder} onChange={e => patch("displayOrder", Number(e.target.value))} /></fieldset>
      {canManage(role) && <section className={`${styles.publication} ${styles.section}`}><h2>Publication and lifecycle</h2><p>Publishing makes the saved project immediately public. Updating published content is immediate. Archiving hides the project; restoring returns a private draft.</p><label htmlFor="change-note">Change note / operational reference (optional)</label><textarea id="change-note" maxLength={2000} value={note} onChange={e => setNote(e.target.value)} disabled={busy} /><div className={styles.actions}>
        {editable && <><button type="submit" className={styles.primary} disabled={busy}>{current?.lifecycle === "published" ? "Save published changes" : "Save draft"}</button><button type="button" disabled={busy} onClick={() => save("publish")}>{current?.lifecycle === "published" ? "Publish current changes" : "Publish directly"}</button></>}
        {current?.lifecycle === "published" && <button type="button" disabled={busy} onClick={() => save("unpublish")}>Unpublish saved project</button>}
        {current && current.lifecycle !== "archived" && <button type="button" disabled={busy} onClick={() => save("archive")}>Archive saved project</button>}
        {current?.lifecycle === "archived" && <button type="button" disabled={busy} onClick={() => save("restore")}>Restore as private draft</button>}
      </div></section>}
    </form>
  </div>;
}
