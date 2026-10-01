"use client";

import { useRef, useState, type FormEvent } from "react";

import styles from "./inquiry.module.css";

type SourceContext = {
  type: "student" | "project";
  id: string;
  name: string;
};

type FormValues = {
  companyName: string;
  contactName: string;
  contactEmail: string;
  description: string;
  website: string;
};

type FieldName = keyof Omit<FormValues, "website">;

const initialValues: FormValues = {
  companyName: "",
  contactName: "",
  contactEmail: "",
  description: "",
  website: "",
};

export function InquiryForm({ source }: { source: SourceContext }) {
  const [values, setValues] = useState(initialValues);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [confirmationId, setConfirmationId] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const submittingRef = useRef(false);
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLDivElement>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;

    submittingRef.current = true;
    setIsPending(true);
    setFieldErrors({});
    setSubmissionError(null);

    try {
      const response = await fetch("/api/v1/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceType: source.type,
          sourceId: source.id,
          ...values,
        }),
      });
      const body = await response.json() as {
        id?: string;
        error?: { message?: string; details?: Array<{ field: string; message: string }> };
      };

      if (response.status === 201 && body.id) {
        setConfirmationId(body.id);
        requestAnimationFrame(() => successRef.current?.focus());
        return;
      }

      if (response.status === 400 || response.status === 422) {
        const nextErrors: Partial<Record<FieldName, string>> = {};
        for (const detail of body.error?.details ?? []) {
          if (isFieldName(detail.field) && !nextErrors[detail.field]) {
            nextErrors[detail.field] = detail.message;
          }
        }
        setFieldErrors(nextErrors);
        requestAnimationFrame(() => {
          errorSummaryRef.current?.focus();
          const firstField = Object.keys(nextErrors)[0];
          if (firstField) document.getElementById(firstField)?.focus();
        });
        return;
      }

      setSubmissionError(
        body.error?.message ?? "The inquiry could not be submitted. Please try again.",
      );
    } catch {
      setSubmissionError("The inquiry could not be submitted. Check your connection and try again.");
    } finally {
      submittingRef.current = false;
      setIsPending(false);
    }
  }

  if (confirmationId) {
    return (
      <div className={styles.success} role="status" aria-live="polite" tabIndex={-1} ref={successRef}>
        <span aria-hidden="true">✓</span>
        <p>Inquiry received</p>
        <h2>Thank you for reaching out.</h2>
        <p>
          Your inquiry about {source.name} was submitted successfully. Reference {confirmationId}.
        </p>
      </div>
    );
  }

  const errorEntries = Object.entries(fieldErrors);

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate aria-label={`Employer inquiry about ${source.name}`}>
      {errorEntries.length > 0 ? (
        <div className={styles.errorSummary} role="alert" tabIndex={-1} ref={errorSummaryRef}>
          <strong>Review the highlighted fields.</strong>
          <ul>
            {errorEntries.map(([field, message]) => (
              <li key={field}><a href={`#${field}`}>{message}</a></li>
            ))}
          </ul>
        </div>
      ) : null}

      {submissionError ? (
        <div className={styles.submissionError} role="alert">
          <strong>Submission interrupted</strong>
          <p>{submissionError}</p>
          <p>Your entered information is still here. Try submitting again.</p>
        </div>
      ) : null}

      <Field
        id="companyName"
        label="Company name"
        value={values.companyName}
        error={fieldErrors.companyName}
        autoComplete="organization"
        maxLength={120}
        onChange={(value) => setValues((current) => ({ ...current, companyName: value }))}
      />
      <Field
        id="contactName"
        label="Contact name"
        value={values.contactName}
        error={fieldErrors.contactName}
        autoComplete="name"
        maxLength={120}
        onChange={(value) => setValues((current) => ({ ...current, contactName: value }))}
      />
      <Field
        id="contactEmail"
        label="Contact email"
        type="email"
        value={values.contactEmail}
        error={fieldErrors.contactEmail}
        autoComplete="email"
        maxLength={254}
        onChange={(value) => setValues((current) => ({ ...current, contactEmail: value }))}
      />

      <div className={styles.field} data-invalid={Boolean(fieldErrors.description)}>
        <label htmlFor="description">Inquiry description <span>(required)</span></label>
        <textarea
          id="description"
          name="description"
          required
          minLength={20}
          maxLength={2000}
          rows={7}
          value={values.description}
          aria-invalid={Boolean(fieldErrors.description)}
          aria-describedby={fieldErrors.description ? "description-error description-help" : "description-help"}
          onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))}
        />
        <small id="description-help">Include the opportunity, collaboration, or question you would like to discuss.</small>
        {fieldErrors.description ? <p id="description-error" className={styles.fieldError}>Error: {fieldErrors.description}</p> : null}
      </div>

      <div className={styles.honeypot} aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input
          id="website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={values.website}
          onChange={(event) => setValues((current) => ({ ...current, website: event.target.value }))}
        />
      </div>

      <div className={styles.submitRow}>
        <p role="status" aria-live="polite">
          {isPending ? "Submitting inquiry…" : "No account required."}
        </p>
        <button type="submit" disabled={isPending}>
          {isPending ? "Submitting…" : "Submit inquiry"}<span aria-hidden="true">↗</span>
        </button>
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  type = "text",
  value,
  error,
  autoComplete,
  maxLength,
  onChange,
}: {
  id: FieldName;
  label: string;
  type?: "text" | "email";
  value: string;
  error?: string;
  autoComplete: string;
  maxLength: number;
  onChange: (value: string) => void;
}) {
  return (
    <div className={styles.field} data-invalid={Boolean(error)}>
      <label htmlFor={id}>{label} <span>(required)</span></label>
      <input
        id={id}
        name={id}
        type={type}
        required
        maxLength={maxLength}
        autoComplete={autoComplete}
        value={value}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? <p id={`${id}-error`} className={styles.fieldError}>Error: {error}</p> : null}
    </div>
  );
}

function isFieldName(value: string): value is FieldName {
  return ["companyName", "contactName", "contactEmail", "description"].includes(value);
}
