/** Animation / UX timing constants — must match Django reference behavior. */
/** Easing curves: see lib/motion.ts and styles/motion.css (--ease-out-expo etc.). */

export const MIN_LOADER_MS = 2000;
export const PAGE_FADE_MS = 600;
export const CAROUSEL_MS = 8000;
/** Crossfade duration between slides (must stay well below CAROUSEL_MS). */
export const CAROUSEL_FADE_MS = 900;
export const JOIN_OPEN_MS = 250;
export const JOIN_CLOSE_MS = 330;
/** Mobile navbar collapse panel (must match --duration-nav in motion.css). */
export const NAV_MENU_MS = 360;
export const EXPAND_HEIGHT_PX = 615;
export const EXPAND_HEIGHT_MS = 300;
export const MAIL_UI_MS = 5000;
export const MAIL_RESULT_AT_MS = 2500;
/** Deployed Django home.html uses windowHeight * 0.05 for project/section reveals. */
export const SCROLL_REVEAL_RATIO = 0.05;
/** Scroll-reveal tween length (HM-08 only requires `.animated` + opacity). */
export const SCROLL_REVEAL_MS = 700;
/** Spring-like ease-out — prefer over linear / default ease. */
export const EASE_OUT_EXPO = "cubic-bezier(0.22, 1, 0.36, 1)";
export const PROJECTS_PER_PAGE = 6;
export const SWIPER_AUTOPLAY_MS = 3000;
export const SWIPER_MANUAL_PREV_MS = 5000;
export const COUNTER_TICK_MS = 10;
export const CLIENTS_TARGET = 200;
export const PROJECTS_TARGET = 400;
