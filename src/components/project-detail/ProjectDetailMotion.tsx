"use client";

import { useEffect, useRef, type ReactNode } from "react";

import styles from "./project-detail.module.css";

export function ProjectDetailMotion({ children }: { children: ReactNode }) {
  const pageRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const page = pageRef.current;
    if (!page) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches || window.__IMMXRSIVE_DISABLE_MOTION__) {
      page.dataset.motion = reducedMotion.matches ? "reduced" : "fallback";
      return;
    }

    let cancelled = false;
    let dispose: () => void = () => undefined;

    void Promise.all([import("gsap"), import("gsap/ScrollTrigger")])
      .then(([gsapModule, scrollModule]) => {
        if (cancelled) return;
        const gsap = gsapModule.gsap;
        const ScrollTrigger = scrollModule.ScrollTrigger;
        gsap.registerPlugin(ScrollTrigger);

        const context = gsap.context(() => {
          page.dataset.motion = "ready";
          gsap.timeline({ defaults: { ease: "power3.out" } })
            .from("[data-project-nav]", { y: -18, opacity: 0, duration: 0.5 })
            .from("[data-project-index]", { x: -18, opacity: 0, duration: 0.42 }, 0.08)
            .from("[data-project-title]", { yPercent: 18, opacity: 0, duration: 0.72 }, 0.14)
            .from("[data-project-lead]", { y: 16, opacity: 0, duration: 0.5 }, 0.38)
            .from("[data-project-meta] > *", { y: 10, opacity: 0, duration: 0.38, stagger: 0.06 }, 0.48);

          for (const section of gsap.utils.toArray<HTMLElement>("[data-project-section]")) {
            gsap.from(section.querySelectorAll("[data-project-reveal]"), {
              y: 24,
              opacity: 0.35,
              duration: 0.65,
              stagger: 0.06,
              ease: "power3.out",
              scrollTrigger: { trigger: section, start: "top 84%", once: true },
            });
            gsap.from(section.querySelectorAll("[data-project-contributor]"), {
              y: 18,
              opacity: 0.35,
              duration: 0.55,
              stagger: 0.08,
              ease: "power3.out",
              scrollTrigger: { trigger: section, start: "top 78%", once: true },
            });
          }
        }, page);

        ScrollTrigger.refresh();
        dispose = () => context.revert();
      })
      .catch(() => {
        page.dataset.motion = "fallback";
      });

    return () => {
      cancelled = true;
      dispose();
    };
  }, []);

  return <main ref={pageRef} className={styles.page} data-motion="pending">{children}</main>;
}
