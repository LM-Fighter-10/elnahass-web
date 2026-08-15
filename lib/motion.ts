/**
 * Shared motion tokens for chrome + page agents.
 * Mirror the CSS variables in styles/motion.css.
 */

/** Soft decelerate — fades, reveals, underlines */
export const EASE_OUT_CUBIC = "cubic-bezier(0.33, 1, 0.68, 1)";

/** Stronger settle — page fade-in, overlay expand */
export const EASE_OUT_EXPO = "cubic-bezier(0.16, 1, 0.3, 1)";

/** Snappy morph — burger lines, icon micro-moves */
export const EASE_OUT_BACK = "cubic-bezier(0.34, 1.2, 0.64, 1)";

/** Balanced in-out — height/width expands, label float */
export const EASE_IN_OUT_SMOOTH = "cubic-bezier(0.65, 0, 0.35, 1)";

/** Quick exit — overlay dismiss, spinner out */
export const EASE_IN_CUBIC = "cubic-bezier(0.32, 0, 0.67, 0)";

/** Spinner exit before display:none (ms) — keep short vs PAGE_FADE_MS */
export const SPINNER_FADE_MS = 320;
