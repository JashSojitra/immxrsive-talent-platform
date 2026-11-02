"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { ProjectEditorData, ProjectRoleOption } from "@/projects/types";
import type { ProjectDraft } from "@/projects/validation";
import { GitHubImportPanel, type GitHubSuggestions } from "./GitHubImportPanel";
import { DuplicateWarning } from "./DuplicateWarning";
import type { DuplicateResult } from "@/projects/duplicates";
import styles from "./project-editor.module.css";

type FormDraft = Omit<ProjectDraft, "technologies"> & { technologyText: string };
const emptyDraft: ProjectDraft = { title: "", description: "", domain: "", projectDate: null, projectStatus: "in_progress", technologies: [], repositories: [], links: [], media: [] };
const mediaKinds = { playable: "Playable web URL", video: "Video / demo URL", source: "Source URL", fallback_image: "Fallback image", fallback_video: "Fallback video", fallback_link: "Fallback link" };
const toForm = ({ technologies, ...draft }: ProjectDraft): FormDraft => ({ ...draft, technologyText: technologies.join(", ") });
const toDraft = ({ technologyText, ...draft }: FormDraft): ProjectDraft => ({ ...draft, technologies: technologyText.split(/[,\n]/).map(t => t.trim()).filter(Boolean) });
type Feedback = { code: string; message: string; details?: Array<{ field: string; message: string }> };

export function ProjectEditor({ initialData, roles }: { initialData: ProjectEditorData | null; roles: ProjectRoleOption[] }) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialData);
  const [draft, setDraft] = useState(() => toForm(initialData?.draft ?? emptyDraft));
  const [creatorRoleId, setCreatorRoleId] = useState(roles[0]?.id ?? "");
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateResult | null>(null);
  const duplicateRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (duplicates) duplicateRef.current?.focus(); }, [duplicates]);
  const [success, setSuccess] = useState("");
  const feedbackRef = useRef<HTMLDivElement>(null);
  const busy = useRef(false);
  const dirty = !saved || JSON.stringify(draft) !== JSON.stringify(toForm(saved.draft));
  useEffect(() => { if (feedback) feedbackRef.current?.focus(); }, [feedback]);
  useEffect(() => {
    if (!dirty) return;
    const protect = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", protect);
    return () => window.removeEventListener("beforeunload", protect);
  }, [dirty]);
  const set = <K extends keyof FormDraft>(key: K, value: FormDraft[K]) => { setDuplicates(null); setDraft(current => ({ ...current, [key]: value })); };

  async function request(action: "save" | "publication" | "reload", acknowledgement?: string) {
    if (busy.current) return;
    if (action === "reload" && dirty && !window.confirm("Replace your unsaved edits with the latest saved project?")) return;
    if (action === "publication" && (!saved || dirty || !window.confirm(saved.project.publicationStatus === "published" ? "Unpublish this project? Its saved information will remain private." : "Publish this project so visitors can view it?"))) return;
    busy.current = true; setPending(true); setFeedback(null); setSuccess("");
    const id = saved?.project.id;
    const path = `/api/v1/student/projects${id ? `/${id}` : ""}${action === "publication" ? "/publication" : ""}`;
    const payload = action === "publication" ? { version: saved!.project.version, published: saved!.project.publicationStatus !== "published" }
      : saved ? { version: saved.project.version, draft: toDraft(draft) } : { draft: toDraft(draft), creatorRoleId, ...(acknowledgement ? { duplicateAcknowledgement: acknowledgement } : {}) };
    try {
      if (!id && action === "save" && !acknowledgement) {
        const check = await fetch("/api/v1/student/project-duplicates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ draft: toDraft(draft) }) });
        const result = await check.json();
        if (!check.ok) { setFeedback(result.error ?? { code: "CHECK_FAILED", message: "Existing projects could not be checked. Your input is kept; try again." }); return; }
        if (result.hasExactMatch || result.matches.length) { setDuplicates(result); return; }
      }
      const response = await fetch(path, action === "reload" ? { cache: "no-store" } : { method: action === "publication" || !id ? "POST" : "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const body = await response.json() as ProjectEditorData & { error?: Feedback; duplicates?: DuplicateResult };
      if (!response.ok) { if (body.duplicates) setDuplicates(body.duplicates); setFeedback(body.error ?? { code: "SAVE_FAILED", message: "The project could not be saved. Your edits have been kept." }); return; }
      setSaved(body); setDraft(toForm(body.draft));
      if (action === "reload") requestAnimationFrame(() => document.getElementById("project-title")?.focus());
      setSuccess(action === "publication" ? body.project.publicationStatus === "published" ? "Project published." : "Project unpublished. Your saved information is preserved." : action === "reload" ? "Latest saved project loaded." : "Project saved.");
      if (!id) router.replace(`/student/projects/${body.project.id}/edit`);
      router.refresh();
    } catch { setFeedback({ code: "SAVE_FAILED", message: "The project could not be saved. Your edits have been kept. Try again." }); }
    finally { busy.current = false; setPending(false); }
  }
  function save(event: FormEvent) { event.preventDefault(); void request("save"); }
  const focusNew = (id: string) => requestAnimationFrame(() => document.getElementById(id)?.focus());
  const validationProps = (field: string) => {
    const invalid = feedback?.details?.some(detail => detail.field === `draft.${field}` || detail.field === field) ?? false;
    return { "aria-invalid": invalid, "aria-describedby": invalid ? "project-errors" : undefined, "aria-errormessage": invalid ? "project-errors" : undefined };
  };
  function applySuggestions(s: GitHubSuggestions) {
    if ((draft.title || draft.description || draft.technologyText || draft.repositories.length) && !window.confirm("Apply reviewed title and description, and add repository/technology suggestions to your current draft? Existing repositories are kept.")) return false;
    setDuplicates(null); setDraft(current => ({ ...current, title: s.title, description: s.description,
      technologyText: [...new Set([...toDraft(current).technologies, ...s.technologies])].join(", "),
      repositories: current.repositories.some(r => r.url.toLowerCase() === s.repositoryUrl.toLowerCase()) ? current.repositories : [...current.repositories, { url: s.repositoryUrl }] }));
    setSuccess("Suggestions applied to your editable draft. Nothing has been saved."); return true;
  }
  return <>
    {!saved ? <GitHubImportPanel onApply={applySuggestions} disabled={pending} /> : null}
    {duplicates ? <div ref={duplicateRef} tabIndex={-1}><DuplicateWarning result={duplicates} disabled={pending} onContinue={() => void request("save", duplicates.acknowledgement)} /></div> : null}
    {saved ? <aside className={styles.identity} aria-label="Saved project"><span>{saved.project.publicationStatus === "published" ? "Published project" : "Private draft"}</span><code>{saved.project.id}</code><p>{dirty ? "You have unsaved changes." : "Your saved project is up to date."}</p></aside> : null}
    {feedback ? <div id="project-errors" className={styles.feedback} role="alert" aria-labelledby="project-errors-title" tabIndex={-1} ref={feedbackRef}><h2 id="project-errors-title">{feedback.code === "EDIT_CONFLICT" ? "This project changed in another session." : "Project not saved"}</h2><p>{feedback.message}</p>{feedback.details?.length ? <ul>{feedback.details.map((detail, index) => <li key={index}>{detail.message}</li>)}</ul> : null}<p>Your entered information has been kept.</p>{feedback.code === "EDIT_CONFLICT" ? <button type="button" disabled={pending} onClick={() => void request("reload")}>Load latest saved project</button> : null}</div> : null}
    {success ? <p className={styles.success} role="status">{success}</p> : null}
    <form onSubmit={save} aria-label="Project editor" className={styles.editor}>
      <fieldset disabled={pending} className={styles.section}><legend><span>01 / The idea</span>Make the work legible.</legend>
        <label htmlFor="project-title">Project title</label><input {...validationProps("title")} id="project-title" required maxLength={160} value={draft.title} onChange={e => set("title", e.target.value)} />
        <label htmlFor="project-description">Short description</label><textarea {...validationProps("description")} id="project-description" maxLength={2000} rows={4} value={draft.description} onChange={e => set("description", e.target.value)} aria-describedby="description-help" /><small id="description-help">Summarize the project. Add a description before publishing.</small>
        <div className={styles.columns}><div><label htmlFor="project-domain">Domain / type</label><input {...validationProps("domain")} id="project-domain" required maxLength={120} value={draft.domain} onChange={e => set("domain", e.target.value)} /></div><div><label htmlFor="project-status">Project status</label><select id="project-status" value={draft.projectStatus} onChange={e => set("projectStatus", e.target.value as FormDraft["projectStatus"])}><option value="in_progress">In progress</option><option value="completed">Completed</option><option value="on_hold">On hold</option></select></div><div><label htmlFor="project-date">Project date (optional)</label><input {...validationProps("projectDate")} id="project-date" type="date" value={draft.projectDate ?? ""} onChange={e => set("projectDate", e.target.value || null)} /></div></div>
        {!saved ? <><label htmlFor="creator-role">Your contributor role</label><select id="creator-role" required value={creatorRoleId} onChange={e => setCreatorRoleId(e.target.value)}>{roles.map(role => <option value={role.id} key={role.id}>{role.name}</option>)}</select><small>You become the initial maintainer and an accepted contributor.</small></> : null}
      </fieldset>
      <fieldset disabled={pending} className={styles.section}><legend><span>02 / Technology system</span>Built with intention.</legend><label htmlFor="project-technologies">Project technologies</label><textarea {...validationProps("technologies")} id="project-technologies" rows={2} value={draft.technologyText} onChange={e => set("technologyText", e.target.value)} aria-describedby="technology-help" /><small id="technology-help">Separate technologies with commas or new lines. These describe the project and do not become anyone&apos;s personal skills.</small></fieldset>
      <fieldset disabled={pending} className={styles.section}><legend><span>03 / Source material</span>Repositories, connected.</legend><p>A project can have no repositories, or several. Its project URL stays the same when repositories change.</p>
        {draft.repositories.map((row, index) => <div className={styles.row} key={index}><label htmlFor={`repository-${index}`}>Repository {index + 1} URL</label><input {...validationProps(`repositories.${index}.url`)} id={`repository-${index}`} type="url" required maxLength={2048} placeholder="https://github.com/your-team/project" value={row.url} onChange={e => set("repositories", draft.repositories.map((r, i) => i === index ? { url: e.target.value } : r))} /><button type="button" aria-label={`Remove repository ${index + 1}`} onClick={() => set("repositories", draft.repositories.filter((_, i) => i !== index))}>Remove</button></div>)}
        <button type="button" disabled={draft.repositories.length >= 20} onClick={() => { set("repositories", [...draft.repositories, { url: "" }]); focusNew(`repository-${draft.repositories.length}`); }}>Add repository</button>
      </fieldset>
      <fieldset disabled={pending} className={styles.section}><legend><span>04 / Around the project</span>More ways to explore.</legend>
        {draft.links.map((row, index) => <div className={styles.row} key={index}><label htmlFor={`link-label-${index}`}>Public link {index + 1} label</label><input {...validationProps(`links.${index}.label`)} id={`link-label-${index}`} required maxLength={120} value={row.label} onChange={e => set("links", draft.links.map((r, i) => i === index ? { ...r, label: e.target.value } : r))} /><label htmlFor={`link-url-${index}`}>Public link {index + 1} URL</label><input {...validationProps(`links.${index}.url`)} id={`link-url-${index}`} required type="url" maxLength={2048} value={row.url} onChange={e => set("links", draft.links.map((r, i) => i === index ? { ...r, url: e.target.value } : r))} /><button type="button" aria-label={`Remove public link ${index + 1}`} onClick={() => set("links", draft.links.filter((_, i) => i !== index))}>Remove</button></div>)}
        <button type="button" disabled={draft.links.length >= 20} onClick={() => { set("links", [...draft.links, { label: "", url: "" }]); focusNew(`link-label-${draft.links.length}`); }}>Add public link</button>
      </fieldset>
      <fieldset disabled={pending} className={styles.section}><legend><span>05 / Evidence</span>A window into the work.</legend><p>Add public HTTPS links for playable, video, source, or fallback evidence. Each type is optional. The hosted course example uses /fixtures/r3/working_demo.html for playable content and /fixtures/r3/fallback.svg for its fallback image.</p>
        {draft.media.map((row, index) => <div className={styles.row} key={index}><label htmlFor={`media-kind-${index}`}>Media {index + 1} type</label><select id={`media-kind-${index}`} value={row.kind} onChange={e => set("media", draft.media.map((r, i) => i === index ? { ...r, kind: e.target.value as typeof row.kind } : r))}>{Object.entries(mediaKinds).map(([kind, label]) => <option value={kind} key={kind}>{label}</option>)}</select><label htmlFor={`media-label-${index}`}>Media {index + 1} label</label><input {...validationProps(`media.${index}.label`)} id={`media-label-${index}`} required maxLength={120} value={row.label} onChange={e => set("media", draft.media.map((r, i) => i === index ? { ...r, label: e.target.value } : r))} /><label htmlFor={`media-url-${index}`}>Media {index + 1} URL</label><input {...validationProps(`media.${index}.url`)} id={`media-url-${index}`} type="text" inputMode="url" required maxLength={2048} value={row.url} onChange={e => set("media", draft.media.map((r, i) => i === index ? { ...r, url: e.target.value } : r))} /><label htmlFor={`media-alt-${index}`}>Media {index + 1} description (optional)</label><input id={`media-alt-${index}`} maxLength={500} value={row.altText} onChange={e => set("media", draft.media.map((r, i) => i === index ? { ...r, altText: e.target.value } : r))} /><button type="button" aria-label={`Remove media ${index + 1}`} onClick={() => set("media", draft.media.filter((_, i) => i !== index))}>Remove</button></div>)}
        <button type="button" disabled={draft.media.length >= 20} onClick={() => { set("media", [...draft.media, { kind: "playable", label: "", url: "", altText: "" }]); focusNew(`media-kind-${draft.media.length}`); }}>Add media link</button>
      </fieldset>
      <div className={styles.actions}><button className={styles.primary} disabled={pending || Boolean(saved && !dirty)} type="submit">{pending ? "Saving…" : saved ? "Save project" : "Create project"}</button><span>{saved ? "Only you, as maintainer, can edit shared fields." : "Your project starts as a private draft."}</span></div>
    </form>
    {saved ? <section className={styles.publication} aria-labelledby="publication-title"><p className={styles.eyebrow}>06 / Share the evidence</p><h2 id="publication-title">Ready for an audience?</h2><p>Preview the saved project, then choose when it becomes public. Your profile&apos;s publication and contributor visibility remain separate.</p><div className={styles.actions}><Link href={`/student/projects/${saved.project.id}/preview`}>Preview saved project</Link><button type="button" disabled={pending || dirty} onClick={() => void request("publication")}>{saved.project.publicationStatus === "published" ? "Unpublish project" : "Publish project"}</button>{saved.project.publicationStatus === "published" ? <Link href={`/projects/${saved.project.id}`}>View public project</Link> : null}</div>{dirty ? <p>Save your changes before publishing or unpublishing.</p> : null}</section> : null}
  </>;
}
