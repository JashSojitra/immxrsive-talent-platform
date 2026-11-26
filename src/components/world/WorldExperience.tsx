"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type RefObject } from "react";

import type { FocusLayout, WorldHandle, WorldMode } from "./engine/world";
import { PlaceContent } from "./PlaceContent";
import { DockIcons, WorldDock } from "./WorldDock";
import { placeById, places, STORIES_SHELF_URL, tourOrder, WORLD_TITLE, type PlaceId } from "./world-content";
import styles from "./world.module.css";

type Phase = "loading" | "intro" | "explore" | "fallback";

const IDLE_TOUR_MS = 45_000;
const KIOSK_IDLE_MS = 25_000;
const TOUR_DWELL_MS = 6_500;

function hasWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export function WorldExperience() {
  const labelEls = useRef(new Map<PlaceId, HTMLElement>());
  const worldElRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<WorldHandle | null>(null);
  const panelHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [mode, setMode] = useState<WorldMode>("intro");
  const [near, setNear] = useState<PlaceId | null>(null);
  const [panel, setPanel] = useState<PlaceId | null>(null);
  const [touring, setTouring] = useState(false);
  const [caption, setCaption] = useState<PlaceId | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showPlaces, setShowPlaces] = useState(false);
  const [shelfOpen, setShelfOpen] = useState(false);
  const [coarse, setCoarse] = useState(false);
  const [kiosk, setKiosk] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [arrived, setArrived] = useState<{ id: PlaceId; key: number } | null>(null);
  const tourIndex = useRef(0);
  const tourTimer = useRef<number | null>(null);
  const lastInput = useRef(0);
  const touringRef = useRef(false);

  const stopTour = useCallback(() => {
    if (!touringRef.current) return;
    touringRef.current = false;
    setTouring(false);
    setCaption(null);
    if (tourTimer.current) window.clearTimeout(tourTimer.current);
  }, []);

  const noteInput = useCallback(() => {
    lastInput.current = performance.now();
    stopTour();
  }, [stopTour]);

  const startTour = useCallback(() => {
    const world = worldRef.current;
    if (!world) return;
    setPanel(null);
    world.focus(null);
    touringRef.current = true;
    setTouring(true);
    tourIndex.current = 0;
    world.flyTo(tourOrder[0]);
  }, []);

  const openPanel = useCallback((id: PlaceId) => {
    const world = worldRef.current;
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    if (id === "stories") {
      // Stories House opens the student shelf full screen.
      world?.setPaused(true);
      setShelfOpen(true);
      setAnnouncement("Stories House shelf opened. Press Escape or Back to the world to return.");
      return;
    }
    const layout: FocusLayout = window.innerWidth < 900 ? "bottom" : "side";
    world?.focus(id, layout);
    setPanel(id);
    setAnnouncement(`${placeById(id).name} opened.`);
  }, []);

  const closeShelf = useCallback(() => {
    worldRef.current?.setPaused(false);
    setShelfOpen(false);
    window.setTimeout(() => returnFocusRef.current?.focus?.(), 0);
  }, []);

  /* The shelf (same-origin iframe) asks to close with Escape. */
  useEffect(() => {
    if (!shelfOpen) return;
    const onMessage = (event: MessageEvent) => {
      if (event.origin === window.location.origin && event.data?.type === "immxrsive:shelf-escape") closeShelf();
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [shelfOpen, closeShelf]);

  const closePanel = useCallback(() => {
    worldRef.current?.focus(null);
    setPanel(null);
    window.setTimeout(() => returnFocusRef.current?.focus?.(), 0);
  }, []);

  /* Boot the engine (code-split; only fetched on /world). */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let disposed = false;
    let handle: WorldHandle | null = null;
    (async () => {
      try {
        setKiosk(params.has("kiosk"));
        setCoarse(window.matchMedia("(pointer: coarse)").matches);
        await document.fonts?.ready;
        if (disposed) return;
        if (params.has("list") || !hasWebGL()) { setPhase("fallback"); return; }
        const { createWorld } = await import("./engine/world");
        if (disposed || !canvasRef.current) return;
        handle = createWorld(canvasRef.current, { reducedMotion: reduce.matches, fixedQuality: params.has("hq") }, {
          onNear: id => {
            setNear(id);
            if (id) setAnnouncement(`${placeById(id).name} is nearby. Press E or Enter to go inside.`);
          },
          onMode: next => setMode(next),
          onInteract: id => openPanel(id),
          onUserInput: () => noteInput(),
          onArrive: id => {
            if (!id) return;
            setAnnouncement(`Arrived at ${placeById(id).name}.`);
            setArrived({ id, key: performance.now() });
            if (!touringRef.current) return;
            setCaption(id);
            tourTimer.current = window.setTimeout(() => {
              if (!touringRef.current) return;
              tourIndex.current = (tourIndex.current + 1) % tourOrder.length;
              setCaption(null);
              worldRef.current?.flyTo(tourOrder[tourIndex.current]);
            }, TOUR_DWELL_MS);
          },
        });
        worldRef.current = handle;
        for (const [id, element] of labelEls.current) handle.setLabel(id, element);
        setPhase("intro");
      } catch (error) {
        if (process.env.NODE_ENV !== "production") console.warn("World failed to start", error);
        setPhase("fallback");
      }
    })();
    const onMotion = () => handle?.setReducedMotion(reduce.matches);
    reduce.addEventListener("change", onMotion);
    return () => {
      disposed = true;
      reduce.removeEventListener("change", onMotion);
      handle?.dispose();
      worldRef.current = null;
    };
  }, [noteInput, openPanel]);

  /* The world fills the viewport below the site header. The header is sticky with a portal bar
     that scrolls away, so measure its real height instead of hard-coding it. */
  useEffect(() => {
    const world = worldElRef.current;
    const header = document.querySelector<HTMLElement>("body > header");
    if (!world || !header) return;
    const sync = () => world.style.setProperty("--world-top", `${header.offsetHeight}px`);
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  /* Kiosk (event tables): full screen, without the site header, footer or page scroll.
     The no-WebGL list view keeps the site chrome (and its project notice). */
  const kioskActive = kiosk && phase !== "fallback";
  useEffect(() => {
    if (!kioskActive) return;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.dataset.worldKiosk = "";
    root.style.overflow = "hidden";
    return () => { delete root.dataset.worldKiosk; root.style.overflow = previous; };
  }, [kioskActive]);

  const enter = useCallback(() => {
    worldRef.current?.enter();
    setPhase("explore");
    lastInput.current = performance.now();
  }, []);

  /* Kiosk: auto-enter, and start the tour when nobody is using it. */
  useEffect(() => {
    if (phase === "intro" && kiosk) {
      const id = window.setTimeout(enter, 5_000);
      return () => window.clearTimeout(id);
    }
  }, [phase, kiosk, enter]);

  useEffect(() => {
    if (phase !== "explore") return;
    const id = window.setInterval(() => {
      const idle = performance.now() - lastInput.current;
      if (!touringRef.current && !panel && !shelfOpen && idle > (kiosk ? KIOSK_IDLE_MS : IDLE_TOUR_MS)) startTour();
    }, 2_000);
    return () => window.clearInterval(id);
  }, [phase, panel, shelfOpen, kiosk, startTour]);

  /* Keyboard: Escape closes panels / help / map. */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (shelfOpen) closeShelf();
      else if (panel) closePanel();
      else if (showPlaces) setShowPlaces(false);
      else if (showHelp) setShowHelp(false);
      else if (mode === "map") worldRef.current?.setMap(false);
      noteInput();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panel, shelfOpen, showPlaces, showHelp, mode, closePanel, closeShelf, noteInput]);

  useEffect(() => {
    if (panel) panelHeadingRef.current?.focus({ preventScroll: true });
  }, [panel]);

  // Automatic without WebGL, or via /world?list. Not advertised in the UI.
  if (phase === "fallback") return <WorldListView />;

  const nearPlace = near ? placeById(near) : null;
  const captionPlace = caption ? placeById(caption) : null;
  const panelPlace = panel ? placeById(panel) : null;

  return (
    <div ref={worldElRef} className={styles.world} data-phase={phase} data-mode={mode} data-panel={panel ? "open" : undefined} data-kiosk={kiosk || undefined}>
      <div className={styles.stage}>
        <canvas ref={canvasRef} className={styles.canvas} aria-label="Interactive 3D world. Use the Places menu to visit each place." role="img" />
      </div>

      {/* Floating place labels (positioned by the engine). */}
      <div className={styles.labels} aria-hidden="true">
        {places.map(place => (
          <button
            key={place.id}
            ref={element => {
              if (element) labelEls.current.set(place.id, element); else labelEls.current.delete(place.id);
              worldRef.current?.setLabel(place.id, element);
            }}
            type="button"
            className={styles.label}
            data-visible="false"
            tabIndex={-1}
            onClick={() => { noteInput(); if (near === place.id && mode === "explore") openPanel(place.id); else worldRef.current?.flyTo(place.id); }}
            aria-label={`Fly to ${place.name}`}
          >
            <span className={styles.labelKicker}>{place.kicker}</span>
            <span className={styles.labelName}>{place.name}</span>
          </button>
        ))}
      </div>

      <div className={styles.letterbox} aria-hidden="true"><span /><span /></div>

      {phase === "loading" && (
        <div className={styles.loading} role="status">
          <span className={styles.loadingMark} aria-hidden="true" />
          <span className={styles.loadingTitle}>{WORLD_TITLE}</span>
          <span className={styles.loadingBar} aria-hidden="true"><i /></span>
          <span className={styles.srOnly}>Building the world…</span>
        </div>
      )}

      {phase === "intro" && (
        <section className={styles.intro} aria-labelledby="world-title">
          <p className={styles.introKicker}>Algoma University · NCoE ImmXrsive</p>
          <h1 id="world-title" className={styles.introTitle} aria-label="Immerse yourself. Meet ImmXrsive.">
            <KineticLine text="Immerse yourself." offset={0} />
            <em><KineticLine text="Meet ImmXrsive." offset={17} /></em>
          </h1>
          <p className={styles.introBody}>A small world of student stories, real projects and ways to connect. Guide Spark around the planet and step into any building.</p>
          <div className={styles.introActions}>
            <button type="button" className={styles.primary} onClick={enter} autoFocus>Enter the world</button>
            {!kiosk && <Link href="/" className={styles.ghost}>Back to main site</Link>}
          </div>
          <p className={styles.introHint}>{coarse ? "Drag the joystick to move · tap a building to fly there" : "WASD or arrow keys to move · click a building to fly there"}</p>
        </section>
      )}

      {phase === "explore" && (
        <WorldDock
          magnetic={!coarse}
          items={[
            { id: "places", label: "Places", icon: DockIcons.places, expanded: showPlaces, controls: "world-places", onClick: () => { setShowHelp(false); setShowPlaces(value => !value); } },
            { id: "map", label: mode === "map" ? "Close map" : "Map", icon: DockIcons.map, active: mode === "map", onClick: () => { noteInput(); setShowPlaces(false); worldRef.current?.setMap(mode !== "map"); } },
            { id: "tour", label: touring ? "Stop tour" : "Tour", icon: touring ? DockIcons.stop : DockIcons.tour, active: touring, onClick: () => { setShowPlaces(false); if (touring) stopTour(); else startTour(); } },
            { id: "help", label: "Help", icon: DockIcons.help, expanded: showHelp, controls: "world-help", onClick: () => { setShowPlaces(false); setShowHelp(value => !value); } },
          ]}
        />
      )}

      {arrived && !panel && !caption && <p key={arrived.key} className={styles.arrived} aria-hidden="true"><span>Arrived</span>{placeById(arrived.id).name}</p>}

      {showPlaces && phase === "explore" && (
        <nav id="world-places" className={styles.placesMenu} aria-label="Places">
          <ul>
            {places.map(place => (
              <li key={place.id}>
                <button type="button" onClick={() => { noteInput(); setShowPlaces(false); if (panel) closePanel(); worldRef.current?.flyTo(place.id); }}>
                  <span className={styles.labelKicker}>{place.kicker}</span>
                  <span>{place.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {showHelp && phase === "explore" && (
        <aside id="world-help" className={styles.help} aria-label="How to explore">
          <ul>
            <li><kbd>W A S D</kbd> or arrows: move</li>
            <li><kbd>Shift</kbd>: boost · <kbd>Space</kbd>: hop</li>
            <li><kbd>E</kbd> / <kbd>Enter</kbd>: go inside</li>
            <li><kbd>M</kbd>: map · <kbd>Esc</kbd>: close</li>
            <li>Click any building or label to fly there</li>
          </ul>
        </aside>
      )}

      {phase === "explore" && nearPlace && !panel && mode === "explore" && !touring && (
        <button type="button" className={styles.prompt} onClick={() => { noteInput(); openPanel(nearPlace.id); }}>
          <span className={styles.promptKicker}>{nearPlace.kicker}</span>
          <span className={styles.promptName}>Enter {nearPlace.name}</span>
          <kbd aria-hidden="true">{coarse ? "Tap" : "E"}</kbd>
        </button>
      )}

      {captionPlace && !panel && (
        <div className={styles.caption} aria-live="polite">
          <p className={styles.kicker}>{captionPlace.kicker}</p>
          <p className={styles.captionTitle}>{captionPlace.title}</p>
          <p className={styles.captionBody}>{captionPlace.body}</p>
        </div>
      )}

      {mode === "map" && !panel && <p className={styles.mapHint}>Drag to spin the planet · click a building to fly there</p>}

      {panelPlace && (
        <aside className={styles.panel} role="dialog" aria-modal="false" aria-labelledby="world-panel-title">
          <button type="button" className={styles.close} onClick={closePanel} aria-label={`Leave ${panelPlace.name}`}>Leave <span aria-hidden="true">×</span></button>
          <div ref={element => { panelHeadingRef.current = element?.querySelector("h2") ?? null; }}>
            <PlaceContent place={panelPlace} headingId="world-panel-title" />
          </div>
        </aside>
      )}

      {phase === "explore" && coarse && !panel && <Joystick world={worldRef} onInput={noteInput} />}

      {shelfOpen && (
        <div className={styles.shelf} role="dialog" aria-modal="true" aria-label="Stories House shelf">
          <iframe className={styles.shelfFrame} src={STORIES_SHELF_URL} title="Stories House: student volumes" />
          <button type="button" className={styles.shelfBack} onClick={closeShelf} autoFocus>
            <span aria-hidden="true">←</span> Back to the world
          </button>
        </div>
      )}

      {/* The site footer carries the disclaimer; kiosk hides the site chrome, so it shows here instead. */}
      {kiosk && <p className={styles.disclaimer}>Independent student-built course project. Not an official ImmXrsive or Algoma University service.</p>}
      <p className={styles.srOnly} aria-live="polite">{announcement}</p>
    </div>
  );
}

/** Letters rise out of a mask with a soft blur, one after another (kinetic text reveal). */
function KineticLine({ text, offset }: { text: string; offset: number }) {
  return (
    <span className={styles.kineticLine} aria-hidden="true">
      {text.split(" ").map((word, w, words) => {
        const before = words.slice(0, w).join(" ").length + (w > 0 ? 1 : 0);
        return (
          <Fragment key={`${word}-${w}`}>
            <span className={styles.kineticWord}>
              {[...word].map((letter, i) => (
                <span key={i} className={styles.kineticLetter} style={{ "--i": offset + before + i } as CSSProperties}>{letter}</span>
              ))}
            </span>
            {w < words.length - 1 && " "}
          </Fragment>
        );
      })}
    </span>
  );
}

function Joystick({ world, onInput }: { world: RefObject<WorldHandle | null>; onInput: () => void }) {
  const baseRef = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const active = useRef<number | null>(null);

  const update = (event: ReactPointerEvent) => {
    const rect = baseRef.current!.getBoundingClientRect();
    const radius = rect.width / 2;
    let x = (event.clientX - rect.left - radius) / radius;
    let y = (event.clientY - rect.top - radius) / radius;
    const length = Math.hypot(x, y);
    if (length > 1) { x /= length; y /= length; }
    setKnob({ x, y });
    world.current?.setStick(-y, x * 0.85);
  };
  const release = () => {
    active.current = null;
    setKnob({ x: 0, y: 0 });
    world.current?.setStick(0, 0);
  };

  return (
    <div className={styles.touch}>
      <div
        ref={baseRef}
        className={styles.stick}
        onPointerDown={event => { active.current = event.pointerId; event.currentTarget.setPointerCapture(event.pointerId); onInput(); update(event); }}
        onPointerMove={event => { if (active.current === event.pointerId) update(event); }}
        onPointerUp={release}
        onPointerCancel={release}
        aria-hidden="true"
      >
        <span className={styles.knob} style={{ transform: `translate(${knob.x * 34}px, ${knob.y * 34}px)` }} />
      </div>
      <button type="button" className={styles.hop} onClick={() => { onInput(); world.current?.hop(); }}>Hop</button>
    </div>
  );
}

/** Accessible, no-WebGL version of the world with the same content. */
export function WorldListView() {
  return (
    <div className={styles.list}>
      <header className={styles.listHeader}>
        <p className={styles.introKicker}>Algoma University · NCoE ImmXrsive</p>
        <h1 className={styles.listTitle}>{WORLD_TITLE}</h1>
        <p className={styles.introBody}>Every place in the world, as a simple list.</p>
      </header>
      {places.map(place => (
        <section key={place.id} className={styles.listSection} aria-labelledby={`list-${place.id}`}>
          <p className={styles.listPlace}>{place.name}</p>
          <PlaceContent place={place} headingId={`list-${place.id}`} />
        </section>
      ))}
    </div>
  );
}
