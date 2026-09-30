"use client";

import type { RefObject } from "react";
import { useEffect, useRef } from "react";

export interface SceneMotionState {
  progress: number;
  chapter: number;
  intensity: number;
  spread: number;
  grid: number;
  parallax: number;
}

export interface MotionController {
  captureGrid: () => void;
  playGrid: () => void;
}

declare global {
  interface Window {
    __IMMXRSIVE_DISABLE_MOTION__?: boolean;
    __IMMXRSIVE_MOTION_ACTIVE__?: boolean;
  }
}

const NOOP_CONTROLLER: MotionController = {
  captureGrid: () => undefined,
  playGrid: () => undefined,
};

export function useCinematicMotion(
  pageRef: RefObject<HTMLElement | null>,
  gridRef: RefObject<HTMLDivElement | null>,
  sceneState: RefObject<SceneMotionState>,
  controllerRef: RefObject<MotionController>,
) {
  const initializedRef = useRef(false);

  useEffect(() => {
    const page = pageRef.current;
    if (!page || initializedRef.current) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches || window.__IMMXRSIVE_DISABLE_MOTION__) {
      page.dataset.motion = reducedMotion.matches ? "reduced" : "fallback";
      controllerRef.current = NOOP_CONTROLLER;
      window.__IMMXRSIVE_MOTION_ACTIVE__ = false;
      return;
    }

    initializedRef.current = true;
    let cancelled = false;
    let dispose = () => undefined;

    void Promise.all([
      import("gsap"),
      import("gsap/ScrollTrigger"),
      import("gsap/Flip"),
    ]).then(([gsapModule, scrollModule, flipModule]) => {
      if (cancelled) return;

      const gsap = gsapModule.gsap;
      const ScrollTrigger = scrollModule.ScrollTrigger;
      const Flip = flipModule.Flip;
      gsap.registerPlugin(ScrollTrigger, Flip);
      let flipState: ReturnType<typeof Flip.getState> | null = null;
      const media = gsap.matchMedia();
      const context = gsap.context(() => {
        page.dataset.motion = "ready";
        window.__IMMXRSIVE_MOTION_ACTIVE__ = true;

        const entrance = gsap.timeline({ defaults: { ease: "power3.out" } });
        entrance
          .from("[data-nav]", { y: -20, autoAlpha: 0, duration: 0.65 })
          .from("[data-hero-kicker]", { x: -24, autoAlpha: 0, duration: 0.55 }, 0.12)
          .from("[data-hero-line]", {
            yPercent: 112,
            rotate: 2,
            duration: 0.9,
            stagger: 0.1,
          }, 0.18)
          .from("[data-hero-support]", { y: 18, autoAlpha: 0, duration: 0.6 }, 0.58)
          .from("[data-hero-cta]", { x: 18, autoAlpha: 0, duration: 0.55 }, 0.66);

        gsap.timeline({
          scrollTrigger: {
            trigger: "[data-chapter='signal']",
            start: "top top",
            end: "bottom top",
            scrub: 0.55,
          },
        })
          .to("[data-hero-copy]", { yPercent: -18, autoAlpha: 0.08, ease: "none" }, 0)
          .to("[data-hero-grid]", { scale: 1.08, autoAlpha: 0.08, ease: "none" }, 0)
          .to(sceneState.current, { progress: 0.23, intensity: 0.78, spread: 0.22, ease: "none" }, 0);

        gsap.timeline({
          scrollTrigger: {
            trigger: "[data-chapter='field']",
            start: "top bottom",
            end: "bottom top",
            scrub: 0.7,
          },
        })
          .fromTo("[data-field-word='far']", { xPercent: 18 }, { xPercent: -18, ease: "none" }, 0)
          .fromTo("[data-field-word='near']", { xPercent: -12 }, { xPercent: 14, ease: "none" }, 0)
          .fromTo("[data-field-orbit]", { rotate: -8, scale: 0.88 }, { rotate: 12, scale: 1.1, ease: "none" }, 0)
          .to(sceneState.current, { progress: 0.48, chapter: 1, spread: 0.8, grid: 0.7, ease: "none" }, 0);

        gsap.timeline({
          scrollTrigger: {
            trigger: "[data-chapter='transition']",
            start: "top 85%",
            end: "bottom 20%",
            scrub: 0.65,
            toggleClass: { targets: "[data-nav]", className: "motion-nav-condensed" },
          },
        })
          .fromTo("[data-transition-line]", { scaleX: 0 }, { scaleX: 1, transformOrigin: "left", ease: "none" }, 0)
          .fromTo("[data-transition-word]", { yPercent: 45, autoAlpha: 0.1 }, { yPercent: -12, autoAlpha: 1, ease: "none" }, 0)
          .to(sceneState.current, { progress: 0.67, chapter: 2, intensity: 0.35, grid: 1, ease: "none" }, 0);

        for (const section of gsap.utils.toArray<HTMLElement>("[data-motion-section]")) {
          const elements = section.querySelectorAll("[data-section-part]");
          if (elements.length === 0) continue;
          gsap.from(elements, {
            y: 42,
            autoAlpha: 0,
            duration: 0.9,
            stagger: 0.08,
            ease: "power3.out",
            scrollTrigger: {
              trigger: section,
              start: "top 78%",
              once: true,
            },
          });
        }

        gsap.to(page, {
          "--page-progress": 1,
          ease: "none",
          scrollTrigger: {
            trigger: page,
            start: "top top",
            end: "bottom bottom",
            scrub: 0.2,
            onUpdate: (self) => {
              sceneState.current.progress = Math.max(sceneState.current.progress, self.progress * 0.9);
            },
          },
        });

        media.add("(min-width: 761px) and (hover: hover)", () => {
          gsap.to("[data-evidence-orbit]", {
            rotate: 160,
            ease: "none",
            scrollTrigger: {
              trigger: "[data-chapter='evidence']",
              start: "top bottom",
              end: "bottom top",
              scrub: 0.7,
            },
          });
        });
      }, page);

      controllerRef.current = {
        captureGrid: () => {
          const grid = gridRef.current;
          if (grid?.children.length) flipState = Flip.getState(grid.children);
        },
        playGrid: () => {
          if (!flipState) return;
          const state = flipState;
          flipState = null;
          Flip.from(state, {
            duration: 0.48,
            ease: "power2.inOut",
            absolute: true,
            stagger: 0.025,
            onEnter: (elements) => gsap.fromTo(elements, { autoAlpha: 0, scale: 0.97 }, { autoAlpha: 1, scale: 1, duration: 0.3 }),
            onLeave: (elements) => gsap.to(elements, { autoAlpha: 0, scale: 0.97, duration: 0.22 }),
          });
        },
      };

      ScrollTrigger.refresh();
      dispose = () => {
        controllerRef.current = NOOP_CONTROLLER;
        media.revert();
        context.revert();
        window.__IMMXRSIVE_MOTION_ACTIVE__ = false;
      };
    }).catch(() => {
      page.dataset.motion = "fallback";
      controllerRef.current = NOOP_CONTROLLER;
      window.__IMMXRSIVE_MOTION_ACTIVE__ = false;
    });

    return () => {
      cancelled = true;
      dispose();
      initializedRef.current = false;
    };
  }, [controllerRef, gridRef, pageRef, sceneState]);
}
