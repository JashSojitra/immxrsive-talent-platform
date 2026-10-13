"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";

import type { ProfileEditorVocabulary } from "@/profile/service";
import { ResumeImporter } from "@/components/student-editor/ResumeImporter";

import styles from "./student-profile-editor.module.css";

export type ExternalLink = { label: string; url: string; type: "portfolio" | "other" };
export type EditorValues = {
  headline: string;
  biography: string;
  publicLocation: string;
  program: string;
  studentStatus: "current" | "alumni" | null;
  showAvailability: boolean;
  showProfessionalLinks: boolean;
  showPublicLocation: boolean;
  showEducation: boolean;
  showExperience: boolean;
  skillIds: string[];
  availability: Array<"internship" | "full-time" | "contract">;
  linkedinUrl: string;
  githubUrl: string;
  externalLinks: ExternalLink[];
  education: string[];
  experience: string[];
  revision: string | null;
};

type SerializableProfile = EditorValues & {
  id: string;
  publicationStatus: "published" | "unpublished";
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
};

type ProfileEditorProps = {
  initialProfile: SerializableProfile | null;
  vocabulary: ProfileEditorVocabulary;
  githubIdentity: { name: string; email: string };
};

type ApiError = {
  error?: {
    message?: string;
    details?: Array<{ field: string; message: string }>;
  };
};

const EMPTY_VALUES: EditorValues = {
  headline: "",
  biography: "",
  publicLocation: "",
  program: "",
  studentStatus: null,
  showAvailability: false,
  showProfessionalLinks: false,
  showPublicLocation: false,
  showEducation: false,
  showExperience: false,
  skillIds: [],
  availability: [],
  linkedinUrl: "",
  githubUrl: "",
  externalLinks: [],
  education: [],
  experience: [],
  revision: null,
};

function toEditorValues(profile: SerializableProfile | null): EditorValues {
  if (!profile) return { ...EMPTY_VALUES };
  return {
    headline: profile.headline,
    biography: profile.biography,
    publicLocation: profile.publicLocation,
    program: profile.program ?? "",
    studentStatus: profile.studentStatus ?? null,
    showAvailability: profile.showAvailability ?? false,
    showProfessionalLinks: profile.showProfessionalLinks ?? false,
    showPublicLocation: profile.showPublicLocation ?? false,
    showEducation: profile.showEducation ?? false,
    showExperience: profile.showExperience ?? false,
    skillIds: [...profile.skillIds],
    availability: [...profile.availability],
    linkedinUrl: profile.linkedinUrl,
    githubUrl: profile.githubUrl,
    externalLinks: profile.externalLinks.map((link) => ({ ...link })),
    education: [...(profile.education ?? [])],
    experience: [...(profile.experience ?? [])],
    revision: profile.updatedAt,
  };
}

export function ProfileEditor({
  initialProfile,
  vocabulary,
  githubIdentity,
}: ProfileEditorProps) {
  const [profileId, setProfileId] = useState(initialProfile?.id ?? null);
  const [values, setValues] = useState<EditorValues>(() => toEditorValues(initialProfile));
  const [lastSavedValues, setLastSavedValues] = useState<EditorValues>(() =>
    toEditorValues(initialProfile));
  const [saving, setSaving] = useState(false);
  const [publicationStatus, setPublicationStatus] = useState<"published" | "unpublished">(
    initialProfile?.publicationStatus ?? "unpublished",
  );
  const [publishedAt, setPublishedAt] = useState(initialProfile?.publishedAt ?? null);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"neutral" | "success" | "error">("neutral");
  const [errors, setErrors] = useState<Array<{ field: string; message: string }>>([]);
  const dirty = useMemo(
    () => JSON.stringify(values) !== JSON.stringify(lastSavedValues),
    [lastSavedValues, values],
  );

  useEffect(() => {
    if (!dirty) return;
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [dirty]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await persistValues(values);
  }

  async function persistValues(nextValues: EditorValues) {
    setSaving(true);
    setMessage("");
    setMessageTone("neutral");
    setErrors([]);
    try {
      const response = await fetch("/api/v1/student/profile/me", {
        method: profileId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextValues),
      });
      const body = await response.json() as ApiError & { profile?: SerializableProfile };
      if (!response.ok || !body.profile) {
        setErrors(body.error?.details ?? []);
        throw new Error(body.error?.message || "Your profile could not be saved.");
      }
      const savedValues = toEditorValues(body.profile);
      setProfileId(body.profile.id);
      setPublicationStatus(body.profile.publicationStatus);
      setPublishedAt(body.profile.publishedAt);
      setValues(savedValues);
      setLastSavedValues(savedValues);
      setMessage(body.profile.publicationStatus === "published"
        ? "Published profile changes saved."
        : "Private draft saved.");
      setMessageTone("success");
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Your profile could not be saved.");
      setMessageTone("error");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function changePublication(action: "publish" | "unpublish") {
    if (!profileId || !values.revision || dirty) {
      setMessage("Save your current changes before previewing or changing publication.");
      setMessageTone("error");
      return;
    }
    const confirmed = window.confirm(action === "publish"
      ? "Publish this saved profile to the public talent directory now?"
      : "Unpublish this profile now? Its maintained private data will be preserved.");
    if (!confirmed) return;
    setSaving(true);
    setErrors([]);
    setMessage("");
    try {
      const response = await fetch("/api/v1/student/profile/publication", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, revision: values.revision }),
      });
      const body = await response.json() as ApiError & { profile?: SerializableProfile };
      if (!response.ok || !body.profile) {
        setErrors(body.error?.details ?? []);
        throw new Error(body.error?.message || "Publication could not be changed.");
      }
      const savedValues = toEditorValues(body.profile);
      setValues(savedValues);
      setLastSavedValues(savedValues);
      setPublicationStatus(body.profile.publicationStatus);
      setPublishedAt(body.profile.publishedAt);
      setMessage(body.profile.publicationStatus === "published"
        ? "Profile published. It is now available in public discovery."
        : "Profile unpublished. Your maintained private data is preserved.");
      setMessageTone("success");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Publication could not be changed.");
      setMessageTone("error");
    } finally {
      setSaving(false);
    }
  }

  function toggleSkill(skillId: string, checked: boolean) {
    setValues((current) => ({
      ...current,
      skillIds: checked
        ? [...current.skillIds, skillId]
        : current.skillIds.filter((value) => value !== skillId),
    }));
  }

  function toggleAvailability(
    value: "internship" | "full-time" | "contract",
    checked: boolean,
  ) {
    setValues((current) => ({
      ...current,
      availability: checked
        ? [...current.availability, value]
        : current.availability.filter((item) => item !== value),
    }));
  }

  function updateExternalLink(index: number, update: Partial<ExternalLink>) {
    setValues((current) => ({
      ...current,
      externalLinks: current.externalLinks.map((link, linkIndex) =>
        linkIndex === index ? { ...link, ...update } : link,
      ),
    }));
  }

  return (
    <form className={styles.editor} onSubmit={save} noValidate>
      <header className={styles.editorHeader}>
        <div>
          <p className={styles.kicker}>Student profile workspace</p>
          <h1>Shape your professional profile.</h1>
          <p>
            Maintain your private profile data, choose which optional fields may be public,
            and publish only when you are ready.
          </p>
        </div>
        <div className={styles.draftStatus}>
          <span className={styles.statusDot} aria-hidden="true" />
          <strong>{publicationStatus === "published" ? "Published profile" : "Private draft"}</strong>
          <small>{dirty ? "Unsaved changes" : profileId ? "All changes saved" : "Not created yet"}</small>
          {publishedAt ? <small>Last published {new Date(publishedAt).toLocaleString()}</small> : null}
        </div>
      </header>

      <ResumeImporter
        values={values}
        vocabulary={vocabulary}
        disabled={saving}
        onApply={persistValues}
      />

      <EditorSection index="01" title="Profile identity" description="The concise professional context at the top of your future profile.">
        <div className={styles.fieldGrid}>
          <Field label="Professional headline" field="headline" errors={errors} wide>
            <input
              id="headline"
              maxLength={140}
              value={values.headline}
              onChange={(event) => setValues({ ...values, headline: event.target.value })}
              aria-describedby="headline-hint"
            />
            <span id="headline-hint" className={styles.hint}>140 characters maximum</span>
          </Field>
          <Field label="Public location" field="publicLocation" errors={errors}>
            <input
              id="publicLocation"
              maxLength={100}
              placeholder="Sault Ste. Marie, ON"
              value={values.publicLocation}
              onChange={(event) => setValues({ ...values, publicLocation: event.target.value })}
            />
          </Field>
          <Field label="Program" field="program" errors={errors}>
            <input
              id="program"
              maxLength={140}
              placeholder="Computer Science"
              value={values.program}
              onChange={(event) => setValues({ ...values, program: event.target.value })}
            />
          </Field>
          <Field label="Student status" field="studentStatus" errors={errors}>
            <select id="studentStatus" value={values.studentStatus ?? ""}
              onChange={(event) => setValues({
                ...values,
                studentStatus: event.target.value === "current" || event.target.value === "alumni"
                  ? event.target.value : null,
              })}>
              <option value="">Choose status</option>
              <option value="current">Current student</option>
              <option value="alumni">Alumni</option>
            </select>
          </Field>
          <div className={styles.identityCard}>
            <span>GitHub identity</span>
            <strong>{githubIdentity.name}</strong>
            <small>{githubIdentity.email}</small>
          </div>
        </div>
      </EditorSection>

      <EditorSection index="02" title="About" description="Introduce your interests, direction, and the kind of work you want to do.">
        <Field label="Biography" field="biography" errors={errors} wide>
          <textarea
            id="biography"
            rows={8}
            maxLength={4_000}
            value={values.biography}
            onChange={(event) => setValues({ ...values, biography: event.target.value })}
            aria-describedby="biography-count"
          />
          <span id="biography-count" className={styles.hint}>
            {values.biography.length.toLocaleString()} / 4,000 characters
          </span>
        </Field>
      </EditorSection>

      <EditorSection index="03" title="Education and experience" description="Maintain the grounded history employers may later review on your public profile.">
        <div className={styles.maintainedGrid}>
          <MaintainedEntries
            field="education"
            title="Education"
            values={values.education}
            errors={errors}
            onChange={(education) => setValues({ ...values, education })}
          />
          <MaintainedEntries
            field="experience"
            title="Experience"
            values={values.experience}
            errors={errors}
            onChange={(experience) => setValues({ ...values, experience })}
          />
        </div>
      </EditorSection>

      <EditorSection index="04" title="Capabilities" description="Choose from the same standardized vocabulary used by talent discovery.">
        <fieldset className={styles.choiceFieldset}>
          <legend>Standardized skills</legend>
          <div className={styles.choiceGrid}>
            {vocabulary.skills.map((skill) => (
              <label key={skill.id} className={styles.choice}>
                <input
                  type="checkbox"
                  checked={values.skillIds.includes(skill.id)}
                  onChange={(event) => toggleSkill(skill.id, event.target.checked)}
                />
                <span>{skill.name}</span>
              </label>
            ))}
          </div>
          <FieldError field="skillIds" errors={errors} />
          <p className={styles.hint}>Missing skills can be proposed in a later workflow; they are not added automatically.</p>
        </fieldset>
      </EditorSection>

      <EditorSection index="05" title="Opportunities" description="Select every engagement type you are currently open to.">
        <fieldset className={styles.choiceFieldset}>
          <legend>Availability</legend>
          <div className={styles.availabilityGrid}>
            {vocabulary.availability.map((option) => (
              <label key={option.value} className={styles.choice}>
                <input
                  type="checkbox"
                  checked={values.availability.includes(option.value)}
                  onChange={(event) => toggleAvailability(option.value, event.target.checked)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
          <FieldError field="availability" errors={errors} />
        </fieldset>
      </EditorSection>

      <EditorSection index="06" title="Professional presence" description="Add secure HTTPS links that support your work and identity.">
        <div className={styles.fieldGrid}>
          <Field label="LinkedIn URL" field="linkedinUrl" errors={errors}>
            <input
              id="linkedinUrl"
              type="url"
              placeholder="https://www.linkedin.com/in/…"
              value={values.linkedinUrl}
              onChange={(event) => setValues({ ...values, linkedinUrl: event.target.value })}
            />
          </Field>
          <Field label="GitHub profile URL" field="githubUrl" errors={errors}>
            <input
              id="githubUrl"
              type="url"
              placeholder="https://github.com/…"
              value={values.githubUrl}
              onChange={(event) => setValues({ ...values, githubUrl: event.target.value })}
            />
          </Field>
        </div>
        <div className={styles.linksHeader}>
          <h3>Portfolio and external links</h3>
          <button
            type="button"
            className={styles.secondaryButton}
            disabled={values.externalLinks.length >= 5}
            onClick={() => setValues((current) => ({
              ...current,
              externalLinks: [...current.externalLinks, { label: "", url: "", type: "portfolio" }],
            }))}
          >
            Add link
          </button>
        </div>
        {values.externalLinks.map((link, index) => (
          <div className={styles.linkRow} key={`link-${index}`}>
            <label>
              <span>Label</span>
              <input
                value={link.label}
                maxLength={60}
                onChange={(event) => updateExternalLink(index, { label: event.target.value })}
              />
            </label>
            <label>
              <span>HTTPS URL</span>
              <input
                type="url"
                value={link.url}
                onChange={(event) => updateExternalLink(index, { url: event.target.value })}
              />
            </label>
            <button
              type="button"
              className={styles.removeButton}
              aria-label={`Remove ${link.label || `link ${index + 1}`}`}
              onClick={() => setValues((current) => ({
                ...current,
                externalLinks: current.externalLinks.filter((_, linkIndex) => linkIndex !== index),
              }))}
            >
              Remove
            </button>
          </div>
        ))}
        <FieldError field="externalLinks" errors={errors} />
      </EditorSection>

      <EditorSection index="07" title="Privacy controls" description="Optional fields remain private unless you explicitly include them in the public projection.">
        <fieldset className={styles.privacyFieldset}>
          <legend>Public field visibility</legend>
          <VisibilityChoice checked={values.showAvailability}
            onChange={(showAvailability) => setValues({ ...values, showAvailability })}
            title="Show availability" detail="Allows availability to appear publicly and participate in directory availability filters." />
          <VisibilityChoice checked={values.showProfessionalLinks}
            onChange={(showProfessionalLinks) => setValues({ ...values, showProfessionalLinks })}
            title="Show professional links" detail="Includes maintained GitHub, LinkedIn, portfolio, and external links." />
          <VisibilityChoice checked={values.showPublicLocation}
            onChange={(showPublicLocation) => setValues({ ...values, showPublicLocation })}
            title="Show location" detail="Includes your maintained public location text." />
          <VisibilityChoice checked={values.showEducation}
            onChange={(showEducation) => setValues({ ...values, showEducation })}
            title="Show education" detail="Includes maintained education entries." />
          <VisibilityChoice checked={values.showExperience}
            onChange={(showExperience) => setValues({ ...values, showExperience })}
            title="Show experience" detail="Includes maintained experience entries." />
        </fieldset>
      </EditorSection>

      <EditorSection index="08" title="Preview and publication" description="Preview the saved public projection, then explicitly publish or unpublish it.">
        <div className={styles.publicationPanel}>
          <div>
            <span>Current state</span>
            <strong>{publicationStatus === "published" ? "Public and discoverable" : "Private and undiscoverable"}</strong>
            <p>Saving, importing a resume, and previewing never publish automatically.</p>
          </div>
          <div className={styles.publicationActions}>
            {profileId && !dirty ? (
              <Link href="/student/profile/preview">Preview saved public profile</Link>
            ) : (
              <span aria-disabled="true">Save changes to enable preview</span>
            )}
            {publicationStatus === "published" ? (
              <button type="button" className={styles.unpublishButton}
                disabled={saving || dirty} onClick={() => changePublication("unpublish")}>Unpublish profile</button>
            ) : (
              <button type="button" className={styles.publishButton}
                disabled={saving || dirty || !profileId} onClick={() => changePublication("publish")}>Publish profile</button>
            )}
          </div>
        </div>
      </EditorSection>

      <footer className={styles.saveBar}>
        <div
          aria-live="polite"
          role="status"
          className={messageTone === "success" ? styles.success : styles.feedback}
          data-tone={messageTone}
        >
          {message || (dirty
            ? "You have unsaved changes. Preview and publication use the last saved version."
            : publicationStatus === "published" ? "Your saved profile is public." : "Your draft is private.")}
        </div>
        <button type="submit" disabled={saving || !dirty}>
          {saving ? "Saving…" : profileId ? "Save changes" : "Create private draft"}
        </button>
      </footer>
    </form>
  );
}

function MaintainedEntries({
  field,
  title,
  values,
  errors,
  onChange,
}: {
  field: "education" | "experience";
  title: string;
  values: string[];
  errors: Array<{ field: string; message: string }>;
  onChange: (values: string[]) => void;
}) {
  return (
    <fieldset className={styles.entryFieldset}>
      <legend>{title}</legend>
      {values.map((value, index) => (
        <div className={styles.entryRow} key={`${field}-${index}`}>
          <label htmlFor={`${field}-${index}`}>{title} entry {index + 1}</label>
          <textarea
            id={`${field}-${index}`}
            maxLength={500}
            rows={3}
            value={value}
            onChange={(event) => onChange(values.map((entry, entryIndex) =>
              entryIndex === index ? event.target.value : entry))}
          />
          <button type="button" onClick={() => onChange(values.filter((_, entryIndex) => entryIndex !== index))}>
            Remove
          </button>
        </div>
      ))}
      <button type="button" className={styles.secondaryButton} onClick={() => onChange([...values, ""])}>
        Add {title.toLowerCase()}
      </button>
      <FieldError field={field} errors={errors} />
    </fieldset>
  );
}

function VisibilityChoice({
  checked,
  onChange,
  title,
  detail,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  title: string;
  detail: string;
}) {
  return (
    <label className={styles.visibilityChoice}>
      <input type="checkbox" checked={checked}
        onChange={(event) => onChange(event.target.checked)} />
      <span><strong>{title}</strong><small>{detail}</small></span>
    </label>
  );
}

function EditorSection({
  index,
  title,
  description,
  children,
}: {
  index: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className={styles.section} aria-labelledby={`section-${index}`}>
      <header>
        <span>{index}</span>
        <div>
          <h2 id={`section-${index}`}>{title}</h2>
          <p>{description}</p>
        </div>
      </header>
      <div className={styles.sectionBody}>{children}</div>
    </section>
  );
}

function Field({
  label,
  field,
  errors,
  wide = false,
  children,
}: {
  label: string;
  field: string;
  errors: Array<{ field: string; message: string }>;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`${styles.field} ${wide ? styles.wideField : ""}`}>
      <label htmlFor={field}>{label}</label>
      {children}
      <FieldError field={field} errors={errors} />
    </div>
  );
}

function FieldError({
  field,
  errors,
}: {
  field: string;
  errors: Array<{ field: string; message: string }>;
}) {
  const relevant = errors.filter((error) =>
    error.field === field || error.field.startsWith(`${field}.`),
  );
  return relevant.map((error, index) => (
    <span className={styles.fieldError} role="alert" key={`${error.field}-${index}`}>
      {error.message}
    </span>
  ));
}
