"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { ImmersiveField } from "./ImmersiveField";
import styles from "./talent.module.css";
import {
  useCinematicMotion,
  type MotionController,
  type SceneMotionState,
} from "./useCinematicMotion";
import type {
  FilterMetadata,
  TalentDirectoryItem,
  TalentDirectoryResponse,
  TalentFilters,
} from "./types";

const EMPTY_FILTERS: TalentFilters = { q: "", skill: [], availability: [], status: [] };
const FILTER_KEYS = ["skill", "availability", "status"] as const;

export function parseTalentFilters(search: string): TalentFilters {
  const params = new URLSearchParams(search);
  return {
    q: params.get("q")?.trim() ?? "",
    skill: params.getAll("skill"),
    availability: params.getAll("availability"),
    status: params.getAll("status"),
  };
}

export function serializeTalentFilters(filters: TalentFilters) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  for (const key of FILTER_KEYS) {
    for (const value of filters[key]) params.append(key, value);
  }
  return params.toString();
}

function prettyValue(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function apiMessage(error: unknown) {
  return error instanceof Error ? error.message : "The directory is temporarily unavailable.";
}

async function fetchJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, { cache: "no-store", signal });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? "The directory is temporarily unavailable.");
  }
  return response.json() as Promise<T>;
}

export function TalentDirectory({ initialSearch = "" }: { initialSearch?: string }) {
  const pageRef = useRef<HTMLElement>(null);
  const cardGridRef = useRef<HTMLDivElement>(null);
  const resultSummaryRef = useRef<HTMLParagraphElement>(null);
  const sceneState = useRef<SceneMotionState>({
    progress: 0,
    chapter: 0,
    intensity: 0.55,
    spread: 0,
    grid: 0.35,
    parallax: 1,
  });
  const motionController = useRef<MotionController>({
    captureGrid: () => undefined,
    playGrid: () => undefined,
  });
  const [filters, setFilters] = useState<TalentFilters>(() => parseTalentFilters(initialSearch));
  const [searchDraft, setSearchDraft] = useState(() => parseTalentFilters(initialSearch).q);
  const [metadata, setMetadata] = useState<FilterMetadata | null>(null);
  const [results, setResults] = useState<TalentDirectoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const query = serializeTalentFilters(filters);
  const resultIds = results?.items.map((student) => student.id).join("|") ?? "";

  useCinematicMotion(pageRef, cardGridRef, sceneState, motionController);

  useEffect(() => {
    const abort = new AbortController();
    fetchJson<FilterMetadata>("/api/v1/skills", abort.signal)
      .then(setMetadata)
      .catch((reason: unknown) => {
        if (!abort.signal.aborted) setError(apiMessage(reason));
      });
    return () => abort.abort();
  }, [retryKey]);

  useEffect(() => {
    const abort = new AbortController();
    fetchJson<TalentDirectoryResponse>(`/api/v1/talent${query ? `?${query}` : ""}`, abort.signal)
      .then((response) => {
        motionController.current.captureGrid();
        const focusedCard = document.activeElement?.closest<HTMLElement>("[data-student-id]");
        if (focusedCard && !response.items.some((student) => student.id === focusedCard.dataset.studentId)) {
          resultSummaryRef.current?.focus({ preventScroll: true });
        }
        setResults(response);
        setError("");
        setLoading(false);
      })
      .catch((reason: unknown) => {
        if (!abort.signal.aborted) {
          setError(apiMessage(reason));
          setLoading(false);
        }
      });
    return () => abort.abort();
  }, [query, retryKey]);

  useLayoutEffect(() => {
    motionController.current.playGrid();
  }, [resultIds]);

  useEffect(() => {
    const nextUrl = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
    window.history.replaceState(null, "", nextUrl);
  }, [query]);

  useEffect(() => {
    const onPopState = () => {
      const restored = parseTalentFilters(window.location.search);
      setLoading(true);
      setError("");
      setFilters(restored);
      setSearchDraft(restored.q);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const setFilterValues = useCallback(
    (key: (typeof FILTER_KEYS)[number], value: string, checked: boolean) => {
      setLoading(true);
      setError("");
      setFilters((current) => ({
        ...current,
        [key]: checked
          ? Array.from(new Set([...current[key], value]))
          : current[key].filter((item) => item !== value),
      }));
    },
    [],
  );

  const clearAll = useCallback(() => {
    setLoading(true);
    setError("");
    setFilters(EMPTY_FILTERS);
    setSearchDraft("");
  }, []);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setFilters((current) => ({ ...current, q: searchDraft.trim() }));
  };

  const activeFilters = [
    ...(filters.q ? [{ key: "q" as const, value: filters.q, label: `Search: ${filters.q}` }] : []),
    ...FILTER_KEYS.flatMap((key) =>
      filters[key].map((value) => ({ key, value, label: prettyValue(value) })),
    ),
  ];

  const removeActiveFilter = (key: "q" | (typeof FILTER_KEYS)[number], value: string) => {
    if (key === "q") {
      setLoading(true);
      setError("");
      setFilters((current) => ({ ...current, q: "" }));
      setSearchDraft("");
      return;
    }
    setFilterValues(key, value, false);
  };

  return (
    <main ref={pageRef} className={styles.page} data-motion="pending">
      <a className={styles.skipLink} href="#directory">Skip to talent directory</a>
      <div className={styles.worldLayer} aria-hidden="true">
        <ImmersiveField sceneState={sceneState} />
      </div>

      <header className={styles.siteHeader} data-nav>
        <Link href="/talent" className={styles.brand} aria-label="ImmXrsive talent directory home">
          IMM<span>X</span>RSIVE
        </Link>
        <nav aria-label="Primary navigation">
          <a href="#directory" className={styles.navLink}>Talent <span>Index</span></a>
        </nav>
        <div className={styles.chapterProgress} aria-hidden="true">
          <span /><span /><span /><span /><span /><span />
        </div>
      </header>

      <section id="signal" className={styles.hero} aria-labelledby="hero-title" data-chapter="signal">
        <div className={styles.heroGrid} data-hero-grid aria-hidden="true" />
        <div className={styles.heroContent} data-hero-copy>
          <p className={styles.eyebrow} data-hero-kicker>Chapter 01 / Signal</p>
          <h1 id="hero-title" className={styles.heroTitle}>
            <span className={styles.lineMask}><span data-hero-line>Discover the people</span></span>
            <span className={styles.lineMask}><span data-hero-line>building what&apos;s <em>next.</em></span></span>
          </h1>
          <div className={styles.heroFoot}>
            <p data-hero-support>
              Student and alumni talent across immersive technology, software, design,
              spatial computing, AI, and interactive experiences.
            </p>
            <a href="#field" className={styles.primaryCta} data-hero-cta>
              Enter the field <span aria-hidden="true">↘</span>
            </a>
          </div>
        </div>
        <p className={styles.scrollCue} aria-hidden="true">Scroll to discover <span /></p>
      </section>

      <section id="field" className={styles.fieldChapter} aria-labelledby="field-title" data-chapter="field">
        <div className={styles.fieldStage}>
          <div className={styles.fieldHeading}>
            <p className={styles.chapter}>Chapter 02 — The field</p>
            <h2 id="field-title">One field.<br /><em>Many dimensions.</em></h2>
            <p>Real disciplines intersect here. These are signals in the talent landscape, not artificial categories.</p>
          </div>
          <ul className={styles.disciplineField} aria-label="Talent disciplines represented in ImmXrsive">
            <li data-field-word="far">Spatial Computing</li>
            <li data-field-word="near">XR</li>
            <li data-field-word="far">Accessibility</li>
            <li data-field-word="near">3D</li>
            <li data-field-word="far">Artificial Intelligence</li>
            <li data-field-word="near">Web</li>
            <li data-field-word="far">Interactive Systems</li>
          </ul>
          <div className={styles.fieldOrbit} data-field-orbit aria-hidden="true"><span>07</span></div>
        </div>
      </section>

      <section className={styles.discoveryTransition} aria-labelledby="transition-title" data-chapter="transition">
        <p className={styles.chapter}>Chapter 03 — From atmosphere to action</p>
        <div className={styles.transitionLine} data-transition-line aria-hidden="true" />
        <h2 id="transition-title" data-transition-word>
          The spatial field becomes<br />a <em>searchable index.</em>
        </h2>
        <p>Move from possibility to evidence. Search the same world without leaving it.</p>
      </section>

      <section id="directory" className={styles.directory} aria-labelledby="directory-title" data-chapter="directory">
        <div className={styles.transitionBand} aria-hidden="true">
          <span>Spatial thinkers</span><span>Creative engineers</span><span>Future builders</span>
        </div>
        <div className={styles.directoryIntro} data-motion-section>
          <p className={styles.chapter} data-section-part>Chapter 04 — Talent index</p>
          <h2 id="directory-title" data-section-part>Find the signal<br />in the <em>field.</em></h2>
          <p data-section-part>Search published talent, combine evidence-based filters, and open a stable profile route.</p>
        </div>

        <div className={styles.discoveryGrid}>
          <aside className={styles.filterPanel} aria-label="Talent filters">
            <form className={styles.searchForm} onSubmit={submitSearch} role="search">
              <label htmlFor="talent-search">Search talent</label>
              <div className={styles.searchRow}>
                <input
                  id="talent-search"
                  type="search"
                  value={searchDraft}
                  onChange={(event) => setSearchDraft(event.target.value)}
                  placeholder="Name, headline, or skill"
                />
                <button type="submit" aria-label="Submit talent search">↗</button>
              </div>
            </form>

            {metadata ? (
              <div className={styles.filterGroups}>
                <FilterGroup
                  legend="Skills"
                  options={metadata.skills}
                  selected={filters.skill}
                  onChange={(value, checked) => setFilterValues("skill", value, checked)}
                />
                <FilterGroup
                  legend="Availability"
                  options={metadata.availability}
                  selected={filters.availability}
                  onChange={(value, checked) => setFilterValues("availability", value, checked)}
                />
                <FilterGroup
                  legend="Status"
                  options={metadata.status}
                  selected={filters.status}
                  onChange={(value, checked) => setFilterValues("status", value, checked)}
                />
              </div>
            ) : (
              <p className={styles.metadataLoading}>Loading filter system…</p>
            )}
          </aside>

          <div className={styles.resultsColumn}>
            <div className={styles.resultsHeader}>
              <div>
                <p className={styles.resultKicker}>Published profiles</p>
                <p
                  ref={resultSummaryRef}
                  className={styles.resultCount}
                  aria-live="polite"
                  aria-atomic="true"
                  tabIndex={-1}
                  aria-label={`${loading && !results ? "Loading" : results?.count ?? 0} ${results?.count === 1 ? "match" : "matches"}`}
                >
                  <strong>{loading && !results ? "—" : results?.count ?? 0}</strong>
                  <span>{results?.count === 1 ? " match" : " matches"}</span>
                </p>
              </div>
              {activeFilters.length > 0 ? (
                <button type="button" className={styles.clearButton} onClick={clearAll}>Clear all</button>
              ) : null}
            </div>

            {activeFilters.length > 0 ? (
              <div className={styles.activeFilters} aria-label="Active filters">
                {activeFilters.map((filter) => (
                  <button
                    type="button"
                    key={`${filter.key}-${filter.value}`}
                    onClick={() => removeActiveFilter(filter.key, filter.value)}
                    aria-label={`Remove ${filter.label} filter`}
                  >
                    {filter.label}<span aria-hidden="true">×</span>
                  </button>
                ))}
              </div>
            ) : null}

            <div className={styles.resultStage} aria-busy={loading}>
              {loading && results ? <div className={styles.loadingBar} aria-hidden="true" /> : null}
              {error ? (
                <ErrorState
                  message={error}
                  onRetry={() => {
                    setLoading(true);
                    setError("");
                    setRetryKey((value) => value + 1);
                  }}
                />
              ) : results?.items.length === 0 ? (
                <EmptyState onClear={clearAll} />
              ) : (
                <div ref={cardGridRef} className={styles.cardGrid}>
                  {(results?.items ?? []).map((student, index) => (
                    <StudentCard key={student.id} student={student} index={index} />
                  ))}
                </div>
              )}
              {loading && !results ? <LoadingCards /> : null}
            </div>
          </div>
        </div>
      </section>

      <section className={styles.evidenceChapter} aria-labelledby="evidence-title" data-chapter="evidence" data-motion-section>
        <div className={styles.evidenceCopy}>
          <p className={styles.chapter} data-section-part>Chapter 05 — Evidence</p>
          <h2 id="evidence-title" data-section-part>Talent is more than<br />a list of <em>skills.</em></h2>
          <p data-section-part>See the work behind the profile. Shared projects, real contributor roles, and clear evidence connect capability to practice.</p>
        </div>
        <div className={styles.evidenceDiagram} data-section-part aria-hidden="true">
          <div className={styles.evidenceOrbit} data-evidence-orbit>
            <span>Profile</span><span>Role</span><span>Project</span>
          </div>
          <strong>WORK<br />BECOMES<br />EVIDENCE</strong>
        </div>
      </section>

      <section className={styles.continueChapter} aria-labelledby="continue-title" data-chapter="continue" data-motion-section>
        <p className={styles.chapter} data-section-part>Chapter 06 — Continue discovery</p>
        <h2 id="continue-title" data-section-part>Find the person<br />behind the <em>possibility.</em></h2>
        <a href="#directory" className={styles.finalCta} data-section-part>
          Return to talent index <span aria-hidden="true">↑</span>
        </a>
      </section>

      <footer className={styles.footer}>
        <span>ImmXrsive</span>
        <p>Algoma University-connected talent, built for what comes next.</p>
      </footer>
    </main>
  );
}

function FilterGroup({
  legend,
  options,
  selected,
  onChange,
}: {
  legend: string;
  options: FilterMetadata["skills"];
  selected: string[];
  onChange: (value: string, checked: boolean) => void;
}) {
  return (
    <fieldset className={styles.filterGroup}>
      <legend>{legend}<span>{String(options.length).padStart(2, "0")}</span></legend>
      <div className={styles.filterOptions}>
        {options.map((option) => (
          <label key={option.value}>
            <input
              type="checkbox"
              checked={selected.includes(option.value)}
              onChange={(event) => onChange(option.value, event.target.checked)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function StudentCard({ student, index }: { student: TalentDirectoryItem; index: number }) {
  const onPointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (event.pointerType === "touch") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--pointer-x", `${event.clientX - bounds.left}px`);
    event.currentTarget.style.setProperty("--pointer-y", `${event.clientY - bounds.top}px`);
  };

  return (
    <article
      className={styles.studentCard}
      style={{ "--card-index": index } as React.CSSProperties}
      data-student-id={student.id}
      onPointerMove={onPointerMove}
    >
      <Link href={`/students/${student.id}`} aria-label={`View ${student.name}'s profile`}>
        <div className={styles.cardTopline}>
          <span>{student.id}</span>
          <span>{prettyValue(student.status)}</span>
        </div>
        <div className={styles.cardIdentity}>
          <span className={styles.avatarMark} aria-hidden="true">{student.name.charAt(0)}</span>
          <div><h3>{student.name}</h3><p>{student.headline}</p></div>
        </div>
        <ul className={styles.skillList} aria-label={`${student.name}'s key skills`}>
          {student.skills.slice(0, 4).map((skill) => <li key={skill}>{skill}</li>)}
        </ul>
        <div className={styles.cardEvidence}>
          <div><span>Availability</span><strong>{student.availability.map(prettyValue).join(" / ") || "Not listed"}</strong></div>
          <div><span>Project evidence</span><strong>{student.projectEvidenceCount.toString().padStart(2, "0")}</strong></div>
          <span className={styles.cardArrow} aria-hidden="true">↗</span>
        </div>
      </Link>
    </article>
  );
}

function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className={styles.statePanel} role="status">
      <span className={styles.stateCode}>00 / No signal</span>
      <h3>No matching students.</h3>
      <p>Your filters are still active. Remove one or clear the field to broaden the search.</p>
      <button type="button" onClick={onClear}>Clear all filters</button>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className={styles.statePanel} role="alert">
      <span className={styles.stateCode}>503 / Signal interrupted</span>
      <h3>We couldn&apos;t load the directory.</h3>
      <p>{message}</p>
      <button type="button" onClick={onRetry}>Try again</button>
    </div>
  );
}

function LoadingCards() {
  return (
    <div className={styles.loadingCards} aria-label="Loading talent results">
      {[0, 1, 2].map((value) => <div key={value} />)}
    </div>
  );
}
