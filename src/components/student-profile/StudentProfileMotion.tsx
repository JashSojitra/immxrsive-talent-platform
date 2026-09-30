"use client";

import { useEffect, useRef, type ReactNode } from "react";

import styles from "./student-profile.module.css";

declare global {
  interface Window {
    __IMMXRSIVE_DISABLE_MOTION__?: boolean;
  }
}

export function StudentProfileMotion({ children }: { children: ReactNode }) {
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
            .from("[data-profile-nav]", { y: -18, autoAlpha: 0, duration: 0.55 })
            .from("[data-profile-index]", { x: -20, autoAlpha: 0, duration: 0.45 }, 0.08)
            .from("[data-profile-name]", { yPercent: 22, autoAlpha: 0, duration: 0.78 }, 0.14)
            .from("[data-profile-lead]", { y: 18, autoAlpha: 0, duration: 0.55 }, 0.42)
            .from("[data-profile-meta] > *", {
              y: 12,
              autoAlpha: 0,
              duration: 0.42,
              stagger: 0.06,
            }, 0.52);

          for (const section of gsap.utils.toArray<HTMLElement>("[data-profile-section]")) {
            gsap.from(section.querySelectorAll("[data-profile-reveal]"), {
              y: 30,
              opacity: 0.35,
              duration: 0.7,
              stagger: 0.07,
              ease: "power3.out",
              scrollTrigger: {
                trigger: section,
                start: "top 82%",
                once: true,
              },
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

  return (
    <main ref={pageRef} className={styles.page} data-motion="pending" id="profile-content">
      {children}
    </main>
  );
}
