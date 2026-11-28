"use client";
/* Adapted from https://skiper-ui.com/r/skiper47.json. Original registry payload retained in docs/design/skiper-registry. Styling uses CSS Modules; Motion uses motion/react; shared Lenis is page-owned. */

import { motion } from "motion/react";
import Link from "next/link";
import Image from "next/image";
import { A11y, Keyboard } from "swiper/modules";
import { useReducedMotion } from "motion/react";
import styles from "./skiper.module.css";
import React, { useState } from "react";
import {
  Autoplay,
  EffectCoverflow,
  Navigation,
  Pagination,
} from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css/effect-coverflow";
import "swiper/css/pagination";
import "swiper/css/navigation";
import "swiper/css";
import "swiper/css/effect-cards";





const Carousel_001 = ({
  images,
  className,
  showPagination = false,
  showNavigation = false,
  loop = true,
  autoplay = false,
  spaceBetween = 40,
}: {
  images: { src?: string; alt: string; title: string; href: string; domain: string; description: string; technologies?: string[] }[];
  className?: string;
  showPagination?: boolean;
  showNavigation?: boolean;
  loop?: boolean;
  autoplay?: boolean;
  spaceBetween?: number;
}) => {
  const reduced = useReducedMotion();
  const [failedMedia, setFailedMedia] = useState<Record<string, boolean>>({});
  const css = `
  .Carousal_001 {
    padding-bottom: 50px !important;
  }
  `;
  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{
        duration: 0.3,
        delay: 0.5,
      }}
      data-skiper="47" className={`${styles.carousel} ${className ?? ""}`}
    >
      <style>{css}</style>

      <Swiper
        key={reduced ? "still" : "animated"}
        spaceBetween={spaceBetween}
        autoplay={
          autoplay && !reduced
            ? {
                delay: 1500,
                disableOnInteraction: false,
              }
            : false
        }
        effect={reduced ? "slide" : "coverflow"}
        speed={reduced ? 0 : 350}
        keyboard={{ enabled: true, onlyInViewport: true }}
        a11y={{ enabled: true }}
        grabCursor={true}
        centeredSlides={true}
        loop={loop}
        slidesPerView={1.12}
        breakpoints={{ 700: { slidesPerView: 1.6 }, 1100: { slidesPerView: 2.25 } }}
        coverflowEffect={{
          rotate: 0,
          slideShadows: false,
          stretch: 0,
          depth: 100,
          modifier: 2.5,
        }}
        pagination={
          showPagination
            ? {
                clickable: true,
              }
            : false
        }
        navigation={showNavigation}
        className="Carousal_001"
        modules={[EffectCoverflow, Autoplay, Pagination, Navigation, A11y, Keyboard]}
      >
        {images.map((image, index) => (
          <SwiperSlide key={index} className={styles.slide}>
<Link href={image.href} className={styles.projectSlide}>
              <span className={styles.projectGraphic} data-media-fallback={!image.src || failedMedia[image.src] ? "true" : "false"}>
                <span className={styles.graphicCaption}>Field study / {String(index + 1).padStart(2, "0")}</span>
                <span className={styles.projectNumber} aria-hidden="true">{image.domain.split(/[\s/]+/).filter(Boolean).slice(0, 2).map(word => word[0]).join("").toUpperCase()}</span>
                <span className={styles.graphicLabel}>{image.technologies?.slice(0, 3).join(" / ") || image.domain}</span>
                {image.src && !failedMedia[image.src] && <Image unoptimized width={720} height={480} className={styles.slideImage} src={image.src} alt={image.alt} referrerPolicy="no-referrer" onError={() => setFailedMedia(previous => ({ ...previous, [image.src!]: true }))} />}
              </span>
              <span className={styles.slideCopy}><span className="ui-eyebrow">{image.domain}</span><strong className="ui-card-title">{image.title}</strong><span>{image.description.slice(0, 160)}</span><span>Explore project ↗</span></span>
            </Link>
          </SwiperSlide>
        ))}

      </Swiper>
    </motion.div>
  );
};

export { Carousel_001 };

/**
 * Skiper 47 Carousel_001 — React + Swiper
 * Built with Swiper.js - Read docs to learn more https://swiperjs.com/
 * Illustrations by AarzooAly - https://x.com/AarzooAly
 *
 * License & Usage:
 * - Free to use and modify in both personal and commercial projects.
 * - Attribution to Skiper UI is required when using the free version.
 * - No attribution required with Skiper UI Pro.
 *
 * Feedback and contributions are welcome.
 *
 * Author: @gurvinder-singh02
 * Website: https://gxuri.me
 * Twitter: https://x.com/Gur__vi
 */
