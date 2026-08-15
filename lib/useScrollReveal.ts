"use client";

import { useEffect } from "react";
import { SCROLL_REVEAL_RATIO } from "./animations";

/**
 * Scroll reveal: toggle `.animated` (AB-03 / CT-03 / HM-08) when element top
 * is above `scrollY + windowHeight * (1 - SCROLL_REVEAL_RATIO)`.
 * Motion polish lives in page CSS (easing / blur / stagger).
 */
export function useScrollReveal(selector: string): void {
  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const animate = () => {
      const windowHeight = window.innerHeight;
      const scrollPosition = window.scrollY;
      const animateStart = windowHeight * SCROLL_REVEAL_RATIO;

      document.querySelectorAll(selector).forEach((el) => {
        if (reduceMotion) {
          el.classList.add("animated");
          return;
        }
        const elementOffset =
          el.getBoundingClientRect().top + scrollPosition;
        if (elementOffset < scrollPosition + windowHeight - animateStart) {
          el.classList.add("animated");
        } else {
          el.classList.remove("animated");
        }
      });
    };

    animate();
    window.addEventListener("scroll", animate, { passive: true });
    window.addEventListener("resize", animate);
    return () => {
      window.removeEventListener("scroll", animate);
      window.removeEventListener("resize", animate);
    };
  }, [selector]);
}
