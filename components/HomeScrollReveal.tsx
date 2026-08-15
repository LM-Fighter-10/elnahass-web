"use client";

import { useEffect, useRef } from "react";
import { SCROLL_REVEAL_RATIO } from "@/lib/animations";

type HomeScrollRevealProps = {
  /** Selectors for project img/txt pairs, e.g. `#p1-img`. */
  projectSelectors: string[];
  /** When expand form scrolls out of threshold while open, collapse it. */
  expandOpen: boolean;
  onExpandAutoClose: () => void;
};

/**
 * Port of Django `animateDivs` — toggles `.animated` at 5% viewport
 * (deployed sync/deployed-updates); expand-form uses 10% and auto-closes
 * Cancel when scrolled away.
 *
 * Important: do not re-run the initial `animateDivs()` when `expandOpen`
 * flips to true — Django only evaluates on scroll/resize/load, so opening
 * Join Us must not immediately self-close.
 */
export default function HomeScrollReveal({
  projectSelectors,
  expandOpen,
  onExpandAutoClose,
}: HomeScrollRevealProps) {
  const expandOpenRef = useRef(expandOpen);
  const onExpandAutoCloseRef = useRef(onExpandAutoClose);
  expandOpenRef.current = expandOpen;
  onExpandAutoCloseRef.current = onExpandAutoClose;

  useEffect(() => {
    const base = [
      "#projects-title",
      "#join-section",
      "#footer-sec",
      ".expand-form",
      ...projectSelectors,
    ];

    function animateDivs() {
      const windowHeight = window.innerHeight;
      const scrollPosition = window.scrollY;

      for (const sel of base) {
        const nodes = document.querySelectorAll(sel);
        nodes.forEach((el) => {
          const htmlEl = el as HTMLElement;
          const rect = htmlEl.getBoundingClientRect();
          const elementOffset = rect.top + scrollPosition;
          const className = htmlEl.getAttribute("class") ?? "";

          if (className.includes("expand-form")) {
            const animateStart = windowHeight * 0.1;
            if (elementOffset < scrollPosition + windowHeight - animateStart) {
              if (!htmlEl.classList.contains("animated")) {
                htmlEl.classList.add("animated");
              }
            } else if (expandOpenRef.current) {
              onExpandAutoCloseRef.current();
            }
          } else {
            const animateStart = windowHeight * SCROLL_REVEAL_RATIO;
            if (elementOffset < scrollPosition + windowHeight - animateStart) {
              if (!htmlEl.classList.contains("animated")) {
                htmlEl.classList.add("animated");
              }
            } else if (htmlEl.classList.contains("animated")) {
              htmlEl.classList.remove("animated");
            }
          }
        });
      }
    }

    animateDivs();
    window.addEventListener("scroll", animateDivs, { passive: true });
    window.addEventListener("resize", animateDivs);
    return () => {
      window.removeEventListener("scroll", animateDivs);
      window.removeEventListener("resize", animateDivs);
    };
  }, [projectSelectors]);

  return null;
}
