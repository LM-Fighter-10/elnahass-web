import { expect, type Page } from "@playwright/test";
import { MIN_LOADER_MS } from "../../lib/animations";
import { selectors } from "./selectors";

const LOADER_MIN_MS = 1900;
/** CI / cold compile can exceed 3.5s; still guards against hung loaders. */
const LOADER_MAX_MS = 8000;

/**
 * Navigate, assert PageLoader timing, wait until page chrome is ready.
 * Cold-cache tolerance: elapsed ≥ 1900ms and ≤ 8000ms (2s loader + CI compile slack).
 */
export async function gotoReady(page: Page, path: string): Promise<number> {
  const started = Date.now();
  await page.goto(path, { waitUntil: "domcontentloaded" });

  const spinner = page.locator(selectors.spinner);
  // Next shows .spinner; Django may boot black briefly — tolerate either.
  const spinnerVisible = await spinner
    .isVisible({ timeout: 1500 })
    .catch(() => false);
  if (spinnerVisible) {
    await expect(spinner).toBeVisible();
  }

  await expect(page.locator(selectors.webPage)).toBeVisible({
    timeout: LOADER_MAX_MS + 2000,
  });
  await waitForLoaderGone(page);

  const elapsed = Date.now() - started;
  expect(
    elapsed,
    `Loader ready too fast (${elapsed}ms); expected ≥ ${LOADER_MIN_MS}ms (MIN_LOADER_MS=${MIN_LOADER_MS})`,
  ).toBeGreaterThanOrEqual(LOADER_MIN_MS);
  expect(
    elapsed,
    `Loader ready too slow (${elapsed}ms); expected ≤ ${LOADER_MAX_MS}ms`,
  ).toBeLessThanOrEqual(LOADER_MAX_MS);

  return elapsed;
}

export async function waitForLoaderGone(page: Page): Promise<void> {
  const spinner = page.locator(selectors.spinner);
  await expect(spinner)
    .toBeHidden({ timeout: LOADER_MAX_MS + 2000 })
    .catch(async () => {
      // Some pages (404) intentionally omit spinner — OK if already absent.
      await expect(spinner).toHaveCount(0);
    });
}

/** Measure wall time for an async action (ms). */
export async function measureMs(fn: () => Promise<void>): Promise<number> {
  const t0 = Date.now();
  await fn();
  return Date.now() - t0;
}
