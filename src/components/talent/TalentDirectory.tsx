"use client";
import Image from "next/image";

import Link from "next/link";
import { SpatialStage } from "@/components/spatial/SpatialStage";
import { Skiper31 } from "@/components/v1/skiper31";
import { createPortal } from "react-dom";
import { FormEvent, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";


import styles from "./talent.module.css";
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

class ApiRequestError extends Error {
  readonly code?: string;
  readonly details: Array<{ field?: string; message?: string }>;

  constructor(message: string, code?: string, details: Array<{ field?: string; message?: string }> = []) {
    super(message);
    this.name = "ApiRequestError";
    this.code = code;
    this.details = details;
  }
}

async function fetchJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, { cache: "no-store", signal });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: { code?: string; message?: string; details?: Array<{ field?: string; message?: string }> };
    } | null;
    throw new ApiRequestError(
      body?.error?.message ?? "The directory is temporarily unavailable.",
      body?.error?.code,
      body?.error?.details,
    );
  }
  return response.json() as Promise<T>;
}

export function TalentDirectory({ initialSearch = "" }: { initialSearch?: string }) {
  const pageRef = useRef<HTMLElement>(null);
  const resultSummaryRef = useRef<HTMLParagraphElement>(null);
  const historyReadyRef = useRef(false);
  const restoringHistoryRef = useRef(false);
  const [filters, setFilters] = useState<TalentFilters>(() => parseTalentFilters(initialSearch));
  const [searchDraft, setSearchDraft] = useState(() => parseTalentFilters(initialSearch).q);
  const [metadata, setMetadata] = useState<FilterMetadata | null>(null);
  const [results, setResults] = useState<TalentDirectoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchError, setSearchError] = useState("");
  const [invalidFilters, setInvalidFilters] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const query = serializeTalentFilters(filters);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const settle = () => {
      if (pageRef.current) pageRef.current.dataset.motion = media.matches ? "reduced" : window.__IMMXRSIVE_DISABLE_MOTION__ ? "fallback" : "ready";
    };
    settle();
    media.addEventListener("change", settle);
    return () => media.removeEventListener("change", settle);
  }, []);

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
        const focusedCard = document.activeElement?.closest<HTMLElement>("[data-student-id]");
        if (focusedCard && !response.items.some((student) => student.id === focusedCard.dataset.studentId)) {
          resultSummaryRef.current?.focus({ preventScroll: true });
        }
        setInvalidFilters(false);
        setResults(response);
        setError("");
        setSearchError("");
        setLoading(false);
      })
      .catch((reason: unknown) => {
        if (!abort.signal.aborted) {
          setInvalidFilters(false);
          if (reason instanceof ApiRequestError && reason.code === "INVALID_QUERY") {
            const queryDetail = reason.details.find((detail) => detail.field === "q");
            if (queryDetail) {
              setSearchError(queryDetail.message ?? reason.message);
            } else {
              setInvalidFilters(true);
              setResults(null);
              setError(reason.details.map((detail) => detail.message).filter(Boolean).join(" ") || reason.message);
            }
          } else {
            setError(apiMessage(reason));
          }
          setLoading(false);
        }
      });
    return () => abort.abort();
  }, [query, retryKey]);

  useEffect(() => {
    const nextUrl = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
    if (restoringHistoryRef.current) {
      restoringHistoryRef.current = false;
      return;
    }
    if (!historyReadyRef.current) {
      historyReadyRef.current = true;
      window.history.replaceState(window.history.state, "", nextUrl);
      return;
    }
    window.history.pushState(window.history.state, "", nextUrl);
  }, [query]);

  useEffect(() => {
    const onPopState = () => {
      const restored = parseTalentFilters(window.location.search);
      restoringHistoryRef.current = true;
      setLoading(true);
      setError("");
      setSearchError("");
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
      setSearchError("");
      setFilters((current) => ({
        ...current,
        [key]: checked
          ? Array.from(new Set([...current[key], value]))
          : current[key].filter((item) => key === "skill" ? item.trim().toLowerCase() !== value.trim().toLowerCase() : item !== value),
      }));
    },
    [],
  );

  const clearAll = useCallback(() => {
    setLoading(true);
    setError("");
    setSearchError("");
    setFilters(EMPTY_FILTERS);
    setSearchDraft("");
  }, []);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSearchError("");
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
      setSearchError("");
      setFilters((current) => ({ ...current, q: "" }));
      setSearchDraft("");
      return;
    }
    setFilterValues(key, value, false);
  };

  return (
    <main ref={pageRef} className={styles.page} data-motion="pending">
      <a className={styles.skipLink} href="#directory">Skip to talent directory</a>
      <section className={styles.hero} aria-labelledby="hero-title">
        <SpatialStage className={styles.talentStage} />
        <p className={`ui-eyebrow ${styles.eyebrow}`}>The talent directory</p>
        <h1 id="hero-title" className="ui-display">Discover the people<br />building what&apos;s <em className="ui-display-accent">next.</em></h1>
        <p>Explore published student and alumni portfolios. Find skills, see the work, and start a conversation.</p>
        <div className={styles.directoryLinks}><Link href="/projects">Explore their projects <span aria-hidden="true">&#8599;</span></Link><Link href="/student">Create your profile <span aria-hidden="true">&#8599;</span></Link></div>
      </section>
      <Skiper31 text="One field. Many dimensions." />
      <section id="directory" className={styles.directory} aria-label="Talent directory">
        <div className={styles.discoveryGrid}>
          <aside className={styles.filterPanel} aria-label="Talent filters">
            <form className={styles.searchForm} onSubmit={submitSearch} role="search">
              <div className={styles.searchLabelRow}>
                <label htmlFor="talent-search">Search talent</label>
                <SearchHelp />
              </div>
              <div className={styles.searchRow}>
                <input
                  id="talent-search"
                  type="search"
                  value={searchDraft}
                  onChange={(event) => setSearchDraft(event.target.value)}
                  placeholder="Search talent, skills, or phrases..."
                  aria-describedby={`talent-search-hint${searchError ? " talent-search-error" : ""}`}
                  aria-invalid={searchError ? "true" : undefined}
                />
                <button type="submit" aria-label="Submit talent search">↗</button>
              </div>
              <p id="talent-search-hint" className={styles.searchHint}>Use commas for AND, <code>|</code> for OR</p>
              {searchError ? <p id="talent-search-error" className={styles.searchError} role="alert">{searchError}</p> : null}
            </form>

            {metadata ? (
              <div className={styles.filterGroups}>
                <FilterGroup
                  legend="Skills"
                  options={metadata.skills}
                  selected={filters.skill.map((value) => metadata.skills.find((skill) => skill.value.toLowerCase() === value.trim().toLowerCase())?.value ?? value)}
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
              <p className={styles.metadataLoading}>Loading filters…</p>
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
                  invalidFilters={invalidFilters}
                  onClear={clearAll}
                  onRetry={() => {
                    setLoading(true);
                    setError("");
                    setRetryKey((value) => value + 1);
                  }}
                />
              ) : results?.items.length === 0 ? (
                <EmptyState onClear={clearAll} />
              ) : (
                <div className={styles.cardGrid}>
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

      <aside className={styles.directoryNote}><strong>People, backed by their work.</strong><p>Shared projects, real contributor roles, and published portfolios connect capability to practice. Profile skills are supplied by each student.</p></aside>
    </main>
  );
}

function SearchHelp() {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 16, width: 360, maxHeight: 520 });

  const cancelClose = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  }, []);

  const close = useCallback((restoreFocus = false) => {
    cancelClose();
    setOpen(false);
    setPinned(false);
    if (restoreFocus) buttonRef.current?.focus();
  }, [cancelClose]);

  const scheduleClose = useCallback(() => {
    cancelClose();
    if (!pinned) closeTimer.current = setTimeout(() => setOpen(false), 140);
  }, [cancelClose, pinned]);

  const updatePosition = useCallback(() => {
    const anchor = buttonRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const width = Math.min(360, Math.max(280, window.innerWidth - 32));
    const left = Math.min(Math.max(16, rect.right - width), window.innerWidth - width - 16);
    const belowTop = rect.bottom + 10;
    const belowSpace = window.innerHeight - belowTop - 16;
    const aboveSpace = rect.top - 26;
    const useAbove = belowSpace < 260 && aboveSpace > belowSpace;
    const maxHeight = Math.max(160, Math.min(520, useAbove ? aboveSpace : belowSpace));
    const top = useAbove ? Math.max(16, rect.top - maxHeight - 10) : belowTop;
    setPosition({ top, left, width, maxHeight });
  }, []);

  useLayoutEffect(() => {
    if (open) updatePosition();
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const onPositionChange = () => updatePosition();
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!buttonRef.current?.contains(target) && !panelRef.current?.contains(target)) close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close(true);
    };
    window.addEventListener("resize", onPositionChange);
    window.addEventListener("scroll", onPositionChange, true);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("resize", onPositionChange);
      window.removeEventListener("scroll", onPositionChange, true);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [close, open, updatePosition]);

  useEffect(() => () => cancelClose(), [cancelClose]);

  const panel = open && typeof document !== "undefined" ? createPortal(
    <div
      ref={panelRef}
      id="talent-search-help"
      className={styles.searchHelpPanel}
      role="region"
      aria-labelledby="talent-search-help-title"
      style={{ top: position.top, left: position.left, width: position.width, maxHeight: position.maxHeight }}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") cancelClose();
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") scheduleClose();
      }}
    >
      <p id="talent-search-help-title" className={styles.searchHelpTitle}>Search tips</p>
      <p className={styles.searchHelpIntro}>Find students by name, headline, or skills. Use these shortcuts to refine your search.</p>
      <dl className={styles.searchHelpExamples}>
        <div><dt><code>React</code></dt><dd>Find students matching React.</dd></div>
        <div><dt><code>React, TypeScript</code></dt><dd>Match BOTH keywords.</dd></div>
        <div><dt><code>React | TypeScript</code></dt><dd>Match EITHER keyword.</dd></div>
        <div><dt><code>&quot;Machine Learning&quot;</code></dt><dd>Search for the complete phrase.</dd></div>
        <div><dt><code>React | TypeScript, Figma</code></dt><dd>Match React OR TypeScript, AND Figma.</dd></div>
      </dl>
      <p className={styles.searchHelpFooter}>Tip: Use the Skills, Availability, and Status filters below for more precise results.</p>
    </div>,
    document.body,
  ) : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={styles.searchHelpButton}
        aria-label="Search tips"
        aria-expanded={open}
        aria-controls="talent-search-help"
        onPointerEnter={(event) => {
          if (event.pointerType === "mouse") {
            cancelClose();
            setOpen(true);
          }
        }}
        onPointerLeave={(event) => {
          if (event.pointerType === "mouse") scheduleClose();
        }}
        onClick={() => {
          cancelClose();
          if (pinned) close();
          else {
            setPinned(true);
            setOpen(true);
          }
        }}
      >
        <span aria-hidden="true">?</span>
      </button>
      {panel}
    </>
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
  return (
    <article
      className={styles.studentCard}
      data-student-id={student.id}
    >
      <Link href={`/students/${student.id}`} aria-label={`View ${student.name}'s profile`}>
        <div className={styles.cardTopline}>
          <span>Portfolio {String(index + 1).padStart(2, "0")}</span>
          <span>{prettyValue(student.status)}</span>
        </div>
        <div className={styles.cardIdentity}>
          <span className={styles.avatarMark} aria-hidden="true">{student.avatarMediaId ? <Image src={`/media/${student.avatarMediaId}`} alt="" width={64} height={64} unoptimized style={{ borderRadius: "50%", objectFit: "cover" }} /> : student.name.charAt(0)}</span>
          <div><h3 className="ui-card-title">{student.name}</h3><p>{student.headline}</p></div>
        </div>
        <ul className={styles.skillList} aria-label={`${student.name}'s key skills`}>
          {student.skills.slice(0, 4).map((skill) => <li key={skill}>{skill}</li>)}
        </ul>
        <div className={styles.cardEvidence}>
          <div><span>Availability</span><strong>{student.availability?.map(prettyValue).join(" / ") || "Not public"}</strong></div>
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
      <span className={styles.stateCode}>No results</span>
      <h3>No matching students.</h3>
      <p>Your filters are still active. Remove one or clear all filters to broaden the search.</p>
      <button type="button" onClick={onClear}>Clear all filters</button>
    </div>
  );
}

function ErrorState({ message, onRetry, invalidFilters, onClear }: { message: string; onRetry: () => void; invalidFilters: boolean; onClear: () => void }) {
  return (
    <div className={styles.statePanel} role="alert">
      <span className={styles.stateCode}>{invalidFilters ? "400 / Invalid filters" : "Signal interrupted"}</span>
      <h3>{invalidFilters ? "Check your directory filters." : "We couldn’t load the directory."}</h3>
      <p>{message}</p>
      {invalidFilters ? <button type="button" onClick={onClear}>Clear all filters</button> : <button type="button" onClick={onRetry}>Try again</button>}
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
