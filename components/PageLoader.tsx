"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type CSSProperties,
} from "react";
import { MIN_LOADER_MS, PAGE_FADE_MS } from "@/lib/animations";
import { EASE_OUT_CUBIC, EASE_OUT_EXPO, SPINNER_FADE_MS } from "@/lib/motion";

type PageLoaderProps = {
  children: ReactNode;
};

function waitForImages(root: HTMLElement): Promise<void> {
  const images = Array.from(root.querySelectorAll("img"));
  if (images.length === 0) return Promise.resolve();

  return Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve();
            return;
          }
          const done = () => resolve();
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
        }),
    ),
  ).then(() => undefined);
}

export default function PageLoader({ children }: PageLoaderProps) {
  const [ready, setReady] = useState(false);
  const [pageOpaque, setPageOpaque] = useState(false);
  const [spinnerGone, setSpinnerGone] = useState(false);
  const webPageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const body = document.body;
    body.style.overflow = "hidden";
    body.style.backgroundColor = "black";
    body.style.position = "relative";

    let cancelled = false;
    const started = performance.now();
    const timers: number[] = [];

    async function run() {
      // Allow ref + first paint before measuring images
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      if (webPageRef.current) {
        await waitForImages(webPageRef.current);
      }
      const elapsed = performance.now() - started;
      const remaining = Math.max(0, MIN_LOADER_MS - elapsed);
      await new Promise((r) => setTimeout(r, remaining));
      if (cancelled) return;

      setReady(true);
      body.style.overflow = "";
      // Double-rAF so opacity transition actually runs (display:none → block)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!cancelled) setPageOpaque(true);
        });
      });

      timers.push(
        window.setTimeout(() => {
          if (!cancelled) setSpinnerGone(true);
        }, SPINNER_FADE_MS),
      );
      timers.push(
        window.setTimeout(() => {
          // Keep black so rubber-band / overscroll above the hero never flashes white
          if (!cancelled) body.style.backgroundColor = "black";
        }, PAGE_FADE_MS),
      );
    }

    void run();
    return () => {
      cancelled = true;
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  const spinnerStyle: CSSProperties = spinnerGone
    ? { opacity: 0, display: "none" }
    : ready
      ? {
          opacity: 0,
          display: "flex",
          transition: `opacity ${SPINNER_FADE_MS}ms ${EASE_OUT_CUBIC}`,
        }
      : { opacity: 1, display: "flex" };

  const webPageStyle: CSSProperties = ready
    ? {
        display: "block",
        opacity: pageOpaque ? 1 : 0,
        transition: `opacity ${PAGE_FADE_MS}ms ${EASE_OUT_EXPO}`,
      }
    : {
        display: "none",
        opacity: 0,
      };

  return (
    <>
      <div className="spinner" style={spinnerStyle} aria-hidden={ready} />
      <div ref={webPageRef} className="webPage" style={webPageStyle}>
        {children}
      </div>
    </>
  );
}
