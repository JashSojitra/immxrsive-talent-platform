"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { importGitHubRepository } from "@/projects/github-import";
import styles from "./project-editor.module.css";
export type GitHubSuggestions = Awaited<ReturnType<typeof importGitHubRepository>>;
export function GitHubImportPanel({ onApply, disabled }: { onApply: (suggestions: GitHubSuggestions) => boolean | void; disabled: boolean }) {
  const [url, setUrl] = useState(""); const [suggestions, setSuggestions] = useState<GitHubSuggestions | null>(null);
  const [technologyText, setTechnologyText] = useState("");
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const errorRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);
  async function load(e: FormEvent) {
    e.preventDefault(); if (busy) return; setBusy(true); setError(""); setSuggestions(null);
    try { const response = await fetch("/api/v1/student/project-imports/github", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) });
      const body = await response.json(); if (!response.ok) throw new Error(body.error?.message ?? "GitHub is unavailable. Continue manually."); setSuggestions(body); setTechnologyText(body.technologies.join(", "));
    } catch (e) { setError(e instanceof Error ? e.message : "Import failed. Continue manually."); } finally { setBusy(false); }
  }
  return <section className={styles.section} aria-labelledby="github-title"><p className={styles.eyebrow}>A starting point, in your hands</p><h2 id="github-title">Import from GitHub.</h2><p>Optional public repository suggestions. Manual creation stays available, and nothing is saved or applied until you choose it.</p>
    <form onSubmit={load}><label htmlFor="github-repository">Public GitHub repository URL</label><input id="github-repository" type="url" maxLength={2048} required value={url} onChange={e => setUrl(e.target.value)} disabled={busy || disabled} /><div className={styles.actions}><button disabled={busy || disabled}>{busy ? "Loading suggestions..." : "Review GitHub suggestions"}</button></div></form>
    {error ? <p className={styles.feedback} role="alert" tabIndex={-1} ref={errorRef}>{error}</p> : null}
    {suggestions ? <div className={styles.card}><h3>Review editable suggestions</h3><label htmlFor="import-title">Suggested title</label><input id="import-title" maxLength={160} value={suggestions.title} onChange={e => setSuggestions({ ...suggestions, title: e.target.value })} /><label htmlFor="import-description">Suggested short description</label><textarea id="import-description" maxLength={2000} value={suggestions.description} onChange={e => setSuggestions({ ...suggestions, description: e.target.value })} /><label htmlFor="import-technologies">Suggested project technologies</label><input id="import-technologies" value={technologyText} onChange={e => setTechnologyText(e.target.value)} /><label htmlFor="import-url">Suggested repository URL</label><input id="import-url" type="url" value={suggestions.repositoryUrl} maxLength={2048} onChange={e => setSuggestions({ ...suggestions, repositoryUrl: e.target.value })} /><small>Languages are repository evidence, not your personal skills. No GitHub contributor is added to the platform team.</small><div className={styles.actions}><button disabled={disabled || !suggestions.title.trim()} onClick={() => { if (onApply({ ...suggestions, technologies: technologyText.split(",").map(x => x.trim()).filter(Boolean) }) !== false) setSuggestions(null); }}>Apply reviewed suggestions</button><button disabled={disabled} onClick={() => setSuggestions(null)}>Discard suggestions</button></div></div> : null}
  </section>;
}
