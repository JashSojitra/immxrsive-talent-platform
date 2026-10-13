"use client";

import { useState, type ChangeEvent, type ReactNode } from "react";

import type { ProfileEditorVocabulary } from "@/profile/service";
import type { ResumeCandidates } from "@/resume/types";
import type { EditorValues } from "./ProfileEditor";

import styles from "./resume-importer.module.css";

type ResumeImporterProps = {
  values: EditorValues;
  vocabulary: ProfileEditorVocabulary;
  disabled: boolean;
  onApply: (values: EditorValues) => Promise<boolean>;
};

type ApiBody = {
  candidates?: ResumeCandidates;
  error?: { message?: string };
};

export function ResumeImporter({ values, vocabulary, disabled, onApply }: ResumeImporterProps) {
  const [file, setFile] = useState<File | null>(null);
  const [candidates, setCandidates] = useState<ResumeCandidates | null>(null);
  const [accepted, setAccepted] = useState<Record<string, boolean>>({});
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [skillEdits, setSkillEdits] = useState<Record<string, string>>({});
  const [mergeMode, setMergeMode] = useState<"merge" | "replace">("merge");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<"neutral" | "success" | "error">("neutral");

  async function upload() {
    if (!file) {
      setMessage("Choose a PDF resume first.");
      setTone("error");
      return;
    }
    setBusy(true);
    setMessage("Extracting grounded resume candidates…");
    setTone("neutral");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8_000);
    try {
      const form = new FormData();
      form.set("resume", file);
      const response = await fetch("/api/v1/student/profile/resume/extract", {
        method: "POST",
        body: form,
        signal: controller.signal,
      });
      const body = await response.json() as ApiBody;
      if (!response.ok || !body.candidates) {
        throw new Error(body.error?.message || "The resume could not be processed.");
      }
      const nextAccepted: Record<string, boolean> = {};
      const nextEdits: Record<string, string> = {};
      const nextSkillEdits: Record<string, string> = {};
      for (const candidate of allCandidates(body.candidates)) {
        nextAccepted[candidate.id] = true;
        nextEdits[candidate.id] = candidate.value;
      }
      for (const candidate of body.candidates.skills) {
        nextSkillEdits[candidate.id] = candidate.skillId;
      }
      setCandidates(body.candidates);
      setAccepted(nextAccepted);
      setEdits(nextEdits);
      setSkillEdits(nextSkillEdits);
      setMessage(candidateCount(body.candidates) > 0
        ? "Review every candidate before applying changes."
        : "No grounded profile candidates were found. Your profile is unchanged.");
      setTone("success");
    } catch (error) {
      setCandidates(null);
      setMessage(error instanceof Error && error.name === "AbortError"
        ? "Resume extraction timed out. Your profile is unchanged."
        : error instanceof Error ? error.message : "The resume could not be processed.");
      setTone("error");
    } finally {
      window.clearTimeout(timeout);
      setBusy(false);
    }
  }

  async function applyReview() {
    if (!candidates) return;
    setBusy(true);
    setMessage("Applying approved candidates to your private draft…");
    setTone("neutral");
    const approvedSkills = candidates.skills
      .filter(({ id }) => accepted[id])
      .map(({ id }) => skillEdits[id])
      .filter(Boolean);
    const approvedEducation = approvedText(candidates.education, accepted, edits);
    const approvedExperience = approvedText(candidates.experience, accepted, edits);
    const approvedLinks = candidates.links.filter(({ id }) => accepted[id]).map((candidate) => ({
      ...candidate,
      url: edits[candidate.id]?.trim() ?? "",
    })).filter(({ url }) => url);
    const linkedin = approvedLinks.find(({ type }) => type === "linkedin")?.url;
    const github = approvedLinks.find(({ type }) => type === "github")?.url;
    const external = approvedLinks.filter(({ type }) => type === "portfolio").map((link) => ({
      label: link.label,
      url: link.url,
      type: "portfolio" as const,
    }));
    const nextValues: EditorValues = {
      ...values,
      skillIds: combine(values.skillIds, approvedSkills, mergeMode, candidates.skills.length > 0),
      education: combine(values.education, approvedEducation, mergeMode, candidates.education.length > 0),
      experience: combine(values.experience, approvedExperience, mergeMode, candidates.experience.length > 0),
      linkedinUrl: replaceLink(values.linkedinUrl, linkedin, mergeMode,
        candidates.links.some(({ type }) => type === "linkedin")),
      githubUrl: replaceLink(values.githubUrl, github, mergeMode,
        candidates.links.some(({ type }) => type === "github")),
      externalLinks: combineLinks(values.externalLinks, external, mergeMode,
        candidates.links.some(({ type }) => type === "portfolio")),
    };
    const saved = await onApply(nextValues);
    if (saved) {
      setCandidates(null);
      setFile(null);
      setMessage("Approved resume candidates were saved to your private draft.");
      setTone("success");
    } else {
      setMessage("The approved candidates could not be saved. Your existing draft is unchanged.");
      setTone("error");
    }
    setBusy(false);
  }

  function cancelReview() {
    setCandidates(null);
    setFile(null);
    setAccepted({});
    setEdits({});
    setSkillEdits({});
    setMessage("Resume review cancelled. Your profile was not changed.");
    setTone("neutral");
  }

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
    setMessage("");
    setTone("neutral");
  }

  return (
    <section className={styles.importer} aria-labelledby="resume-import-title">
      <header>
        <div>
          <p>Resume import / optional</p>
          <h2 id="resume-import-title">Extract. Review. Decide.</h2>
        </div>
        <span>PDF only · 5 MB · private processing</span>
      </header>
      <p className={styles.intro}>
        Uploading never changes or publishes your profile. The PDF is processed temporarily,
        and only candidates you approve are saved.
      </p>
      <div className={styles.uploadRow}>
        <label htmlFor="resume-pdf">PDF resume</label>
        <input id="resume-pdf" type="file" accept="application/pdf,.pdf" onChange={chooseFile}
          disabled={disabled || busy} />
        <button type="button" onClick={upload} disabled={disabled || busy || !file}>
          {busy && !candidates ? "Processing…" : candidates ? "Re-upload and replace review" : "Review resume"}
        </button>
      </div>
      <div className={tone === "error" ? styles.error : styles.status} role="status" aria-live="polite">
        {message}
      </div>

      {candidates ? (
        <div className={styles.review}>
          <div className={styles.compare}>
            <strong>Maintained profile</strong>
            <span>{values.skillIds.length} skills</span>
            <span>{values.education.length} education entries</span>
            <span>{values.experience.length} experience entries</span>
            <span>{existingLinkCount(values)} links</span>
          </div>

          <ReviewGroup title="Standardized skills" empty="No canonical skills found.">
            {candidates.skills.map((candidate) => (
              <CandidateCard key={candidate.id} id={candidate.id} accepted={accepted[candidate.id]}
                onDecision={(value) => setAccepted({ ...accepted, [candidate.id]: value })}
                source={candidate.source}>
                <label htmlFor={`candidate-${candidate.id}`}>Canonical skill</label>
                <select id={`candidate-${candidate.id}`} value={skillEdits[candidate.id]}
                  onChange={(event) => setSkillEdits({ ...skillEdits, [candidate.id]: event.target.value })}>
                  {vocabulary.skills.map((skill) => <option key={skill.id} value={skill.id}>{skill.name}</option>)}
                </select>
              </CandidateCard>
            ))}
          </ReviewGroup>

          <ReviewGroup title="Education" empty="No education details found.">
            {candidates.education.map((candidate) => (
              <EditableCandidate key={candidate.id} candidate={candidate} accepted={accepted}
                edits={edits} setAccepted={setAccepted} setEdits={setEdits} />
            ))}
          </ReviewGroup>

          <ReviewGroup title="Experience" empty="No experience details found.">
            {candidates.experience.map((candidate) => (
              <EditableCandidate key={candidate.id} candidate={candidate} accepted={accepted}
                edits={edits} setAccepted={setAccepted} setEdits={setEdits} />
            ))}
          </ReviewGroup>

          <ReviewGroup title="Professional links" empty="No supported professional links found.">
            {candidates.links.map((candidate) => (
              <EditableCandidate key={candidate.id} candidate={candidate} accepted={accepted}
                edits={edits} setAccepted={setAccepted} setEdits={setEdits} />
            ))}
          </ReviewGroup>

          <fieldset className={styles.mergeChoice}>
            <legend>How should approved candidates affect maintained data?</legend>
            <label><input type="radio" name="resume-merge" checked={mergeMode === "merge"}
              onChange={() => setMergeMode("merge")} /> Merge with existing entries</label>
            <label><input type="radio" name="resume-merge" checked={mergeMode === "replace"}
              onChange={() => setMergeMode("replace")} /> Replace represented profile fields</label>
          </fieldset>
          <div className={styles.reviewActions}>
            <button type="button" className={styles.cancel} onClick={cancelReview} disabled={busy}>Cancel review</button>
            <button type="button" onClick={applyReview} disabled={disabled || busy || candidateCount(candidates) === 0}>
              {busy ? "Applying…" : "Apply approved changes"}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function ReviewGroup({ title, empty, children }: { title: string; empty: string; children: ReactNode }) {
  const count = Array.isArray(children) ? children.length : children ? 1 : 0;
  return <section className={styles.group}><h3>{title}</h3>{count ? children : <p>{empty}</p>}</section>;
}

function EditableCandidate({ candidate, accepted, edits, setAccepted, setEdits }: {
  candidate: { id: string; source: string };
  accepted: Record<string, boolean>;
  edits: Record<string, string>;
  setAccepted: (value: Record<string, boolean>) => void;
  setEdits: (value: Record<string, string>) => void;
}) {
  return (
    <CandidateCard id={candidate.id} accepted={accepted[candidate.id]}
      onDecision={(value) => setAccepted({ ...accepted, [candidate.id]: value })}
      source={candidate.source}>
      <label htmlFor={`candidate-${candidate.id}`}>Proposed value</label>
      <textarea id={`candidate-${candidate.id}`} rows={3} maxLength={500}
        value={edits[candidate.id] ?? ""}
        onChange={(event) => setEdits({ ...edits, [candidate.id]: event.target.value })} />
    </CandidateCard>
  );
}

function CandidateCard({ id, accepted, onDecision, source, children }: {
  id: string;
  accepted: boolean;
  onDecision: (accepted: boolean) => void;
  source: string;
  children: ReactNode;
}) {
  return (
    <article className={styles.candidate} data-decision={accepted ? "accept" : "reject"}>
      <div className={styles.decision}>
        <label><input type="radio" name={`decision-${id}`} checked={accepted}
          onChange={() => onDecision(true)} /> Accept</label>
        <label><input type="radio" name={`decision-${id}`} checked={!accepted}
          onChange={() => onDecision(false)} /> Reject</label>
      </div>
      <div className={styles.candidateField}>{children}</div>
      <small>Source: {source}</small>
    </article>
  );
}

function allCandidates(candidates: ResumeCandidates) {
  return [...candidates.skills, ...candidates.education, ...candidates.experience, ...candidates.links];
}

function candidateCount(candidates: ResumeCandidates) {
  return allCandidates(candidates).length;
}

function approvedText(
  candidates: Array<{ id: string }>,
  accepted: Record<string, boolean>,
  edits: Record<string, string>,
) {
  return candidates.filter(({ id }) => accepted[id]).map(({ id }) => edits[id]?.trim()).filter(Boolean) as string[];
}

function combine(existing: string[], approved: string[], mode: "merge" | "replace", represented: boolean) {
  return [...new Set(mode === "merge" || !represented ? [...existing, ...approved] : approved)];
}

function combineLinks(
  existing: EditorValues["externalLinks"],
  approved: EditorValues["externalLinks"],
  mode: "merge" | "replace",
  represented: boolean,
) {
  const links = mode === "merge" || !represented ? [...existing, ...approved] : approved;
  return links.filter((link, index) => links.findIndex((candidate) => candidate.url === link.url) === index).slice(0, 5);
}

function replaceLink(existing: string, approved: string | undefined, mode: "merge" | "replace", represented: boolean) {
  return mode === "replace" && represented ? approved ?? "" : approved ?? existing;
}

function existingLinkCount(values: EditorValues) {
  return values.externalLinks.length + Number(Boolean(values.linkedinUrl)) + Number(Boolean(values.githubUrl));
}
