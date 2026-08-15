"use client";

import { useEffect, useRef } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation, Pagination } from "swiper/modules";
import type { Swiper as SwiperInstance } from "swiper";
import type { SwiperModule } from "swiper/types";
import {
  SWIPER_AUTOPLAY_MS,
  SWIPER_MANUAL_PREV_MS,
} from "@/lib/animations";

/** Custom “carousel” effect from Django `slider1.mjs` (untyped Swiper internals). */
const EffectCarousel: SwiperModule = ({ swiper, on }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = swiper as any;

  on("beforeInit", () => {
    if (s.params.effect !== "carousel") return;
    s.classNames.push(`${s.params.containerModifierClass}carousel`);
    const overwrite = {
      watchSlidesProgress: true,
      centeredSlides: true,
    };
    Object.assign(s.params, overwrite);
    Object.assign(s.originalParams, overwrite);
  });

  on("progress", () => {
    if (s.params.effect !== "carousel") return;
    const slideCount = s.slides.length;
    for (let i = 0; i < s.slides.length; i += 1) {
      const slideEl = s.slides[i] as HTMLElement & { progress: number };
      const progress = slideEl.progress;
      const absProgress = Math.abs(progress);
      let scaleFactor = 1;
      if (absProgress > 1) {
        scaleFactor = 0.3 * (absProgress - 1) + 1;
      }
      const opacityEls = slideEl.querySelectorAll(
        ".swiper-carousel-animate-opacity",
      );
      const translate =
        progress * scaleFactor * 50 * (s.rtlTranslate ? -1 : 1) + "%";
      const scale = 1 - 0.2 * absProgress;
      const zIndex = slideCount - Math.abs(Math.round(progress));
      slideEl.style.transform = `translateX(${translate}) scale(${scale})`;
      slideEl.style.zIndex = String(zIndex);
      slideEl.style.opacity = absProgress > 3 ? "0" : "1";
      opacityEls.forEach((el) => {
        (el as HTMLElement).style.opacity = String(1 - absProgress / 3);
      });
    }
  });

  on("setTransition", (_sw, duration) => {
    if (s.params.effect !== "carousel") return;
    // Same duration contract as Django; smoother easing only
    const ease = "cubic-bezier(0.33, 1, 0.68, 1)";
    for (let i = 0; i < s.slides.length; i += 1) {
      const slideEl = s.slides[i] as HTMLElement;
      const opacityEls = slideEl.querySelectorAll(
        ".swiper-carousel-animate-opacity",
      );
      slideEl.style.transitionDuration = `${duration}ms`;
      slideEl.style.transitionTimingFunction = ease;
      opacityEls.forEach((el) => {
        const node = el as HTMLElement;
        node.style.transitionDuration = `${duration}ms`;
        node.style.transitionTimingFunction = ease;
      });
    }
  });
};

/** Slightly longer than Swiper default 300ms for a calmer premium glide. */
const SLIDE_SPEED_MS = 520;

type ProjectSwiperProps = {
  images: string[];
};

function mediaSrc(url: string): string {
  if (!url) return url;
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  return url.startsWith("/") ? url : `/${url}`;
}

/**
 * Django `resetSlider`: next click then prev click to settle carousel transforms.
 */
function resetSlider(swiper: SwiperInstance) {
  window.setTimeout(() => {
    swiper.slideNext(0);
    window.setTimeout(() => {
      swiper.slidePrev(0);
    }, 5);
  }, 10);
}

export default function ProjectSwiper({ images }: ProjectSwiperProps) {
  const autoPrevRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const swiperRef = useRef<SwiperInstance | null>(null);

  useEffect(() => {
    return () => {
      if (autoPrevRef.current) clearInterval(autoPrevRef.current);
    };
  }, []);

  if (images.length === 0) {
    return (
      <div className="container">
        <div className="swiper swiper-carousel swiper-initialized swiper-horizontal swiper-watch-progress">
          <div className="swiper-wrapper" />
          <div className="swiper-button-prev" />
          <div className="swiper-button-next" />
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <Swiper
        className="swiper-carousel"
        modules={[Autoplay, Navigation, Pagination, EffectCarousel]}
        // Custom effect name from Django slider1.mjs
        effect={"carousel" as "slide"}
        grabCursor
        speed={SLIDE_SPEED_MS}
        loop={images.length > 1}
        slidesPerView="auto"
        navigation={{
          nextEl: ".swiper-button-next",
          prevEl: ".swiper-button-prev",
        }}
        pagination={{ el: ".swiper-pagination" }}
        autoplay={{
          delay: SWIPER_AUTOPLAY_MS,
          reverseDirection: true,
          disableOnInteraction: false,
        }}
        onSwiper={(swiper) => {
          swiperRef.current = swiper;
          if (autoPrevRef.current) clearInterval(autoPrevRef.current);
          autoPrevRef.current = setInterval(() => {
            swiper.slidePrev();
          }, SWIPER_MANUAL_PREV_MS);

          // After load (PageLoader already waited); match Django 200ms then resetSlider
          window.setTimeout(() => {
            resetSlider(swiper);
          }, 200);
        }}
        onClick={() => {
          if (autoPrevRef.current) {
            clearInterval(autoPrevRef.current);
            autoPrevRef.current = null;
          }
        }}
      >
        {images.map((url, index) => (
          <SwiperSlide key={`${url}-${index}`}>
            <div className="swiper-carousel-animate-opacity">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mediaSrc(url)}
                className="slider-images"
                alt=""
                draggable={false}
              />
            </div>
          </SwiperSlide>
        ))}
        <div className="swiper-button-prev" slot="container-end" />
        <div className="swiper-button-next" slot="container-end" />
      </Swiper>
    </div>
  );
}
