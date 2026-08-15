"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CAROUSEL_MS } from "@/lib/animations";

type HomeCarouselProps = {
  /** Home project thumbnail URLs (order matches Our Work feed). */
  images: string[];
};

/**
 * BS3-like carousel: indicators + `.item` / `.active`.
 * Django starts `click_count = 2`, so the first auto tick advances to slide 2.
 * Pauses when `document.visibilityState === "hidden"`.
 * Motion: CSS crossfade/scale on `.item` (see home.css) — interval stays 8s.
 */
export default function HomeCarousel({ images }: HomeCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const nextClickCountRef = useRef(2); // 1-based indicator id for next auto advance
  const activeIndexRef = useRef(0);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  const goTo = useCallback(
    (index: number) => {
      if (images.length === 0) return;
      const next = ((index % images.length) + images.length) % images.length;
      setActiveIndex(next);
    },
    [images.length],
  );

  useEffect(() => {
    if (images.length === 0) return;

    const advance = () => {
      const target = nextClickCountRef.current; // 1-based
      goTo(target - 1);
      if (nextClickCountRef.current < images.length) {
        nextClickCountRef.current += 1;
      } else {
        nextClickCountRef.current = 1;
      }
    };

    let slideInterval: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (slideInterval) clearInterval(slideInterval);
      slideInterval = setInterval(advance, CAROUSEL_MS);
    };

    const stop = () => {
      if (slideInterval) {
        clearInterval(slideInterval);
        slideInterval = null;
      }
    };

    if (document.visibilityState !== "hidden") {
      start();
    }

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        stop();
      } else {
        start();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [images.length, goTo]);

  return (
    <div className="tcb-bs-fullscreen">
      <div id="carousel-example-generic" className="carousel slide carousel-bg">
        <div className="container welcome-box-container">
          <div id="welcome-box" className="container" style={{ zIndex: 1 }}>
            <h1 id="welcome" className="display-5">
              Elnahass For Construction and Technology
            </h1>
            <p style={{ marginBottom: 5, color: "white" }}>
              Empowering Progress with Expertise - Elnahass For Construction and
              Technology
            </p>
            <p style={{ color: "white" }}>
              Where Vision Meets Precision, Building Dreams and Redefining
              Success.
            </p>
          </div>
        </div>

        <ol className="carousel-indicators" id="nav-slider">
          {images.map((_, i) => (
            <li
              key={i}
              id={`nav-slider${i + 1}`}
              data-target="#carousel-example-generic"
              data-slide-to={i}
              className={i === activeIndex ? "active" : undefined}
              onClick={() => goTo(i)}
            />
          ))}
        </ol>

        <div id="slider-pics" className="carousel-inner" role="listbox">
          {images.map((src, i) => (
            <div
              key={`${src}-${i}`}
              className={i === activeIndex ? "item active" : "item"}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="item-img" src={src} alt="" draggable={false} />
              <div className="carousel-caption" />
            </div>
          ))}
        </div>

        <a
          className="left carousel-control"
          href="#carousel-example-generic"
          role="button"
          data-slide="prev"
          id="prev"
          style={{ display: "none" }}
          onClick={(e) => {
            e.preventDefault();
            goTo(activeIndexRef.current - 1);
          }}
        >
          <span
            className="glyphicon glyphicon-chevron-left"
            aria-hidden="true"
          />
          <span className="sr-only">Previous</span>
        </a>
        <a
          className="right carousel-control"
          href="#carousel-example-generic"
          role="button"
          data-slide="next"
          id="next"
          style={{ display: "none" }}
          onClick={(e) => {
            e.preventDefault();
            goTo(activeIndexRef.current + 1);
          }}
        >
          <span
            className="glyphicon glyphicon-chevron-right"
            aria-hidden="true"
          />
          <span className="sr-only">Next</span>
        </a>
      </div>
    </div>
  );
}
