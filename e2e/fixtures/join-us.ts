import { expect, type Page, type Route } from "@playwright/test";
import {
  EXPAND_HEIGHT_PX,
  MAIL_RESULT_AT_MS,
  MAIL_UI_MS,
} from "../../lib/animations";
import { selectors } from "./selectors";

export type ContactMockMode = "success" | "duplicate" | "fail";

export type ValidPayload = {
  name: string;
  email: string;
  phone: string;
  desc: string;
};

/** Unique valid payload for submit paths (unique email avoids cross-test pollution if mocks miss). */
export function uniquePayload(prefix = "JoinUs"): ValidPayload {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    name: `${prefix} Tester`,
    email: `${prefix.toLowerCase()}-${suffix}@example.com`,
    phone: "01234567890",
    desc: `Outline for ${prefix} ${suffix}`,
  };
}

/**
 * Mock SMTP-backed contact APIs. Tracks that both endpoints were hit.
 * Delays are optional so UI still awaits the network then applies 2500/5000 floors.
 */
export async function mockContactApis(
  page: Page,
  mode: ContactMockMode = "success",
  opts?: { delayMs?: number },
): Promise<{ fetchHits: number; sendHits: number }> {
  const state = { fetchHits: 0, sendHits: 0 };
  const delayMs = opts?.delayMs ?? 50;

  await page.route(/\/fetchCustomer(?:\?|$)/, async (route: Route) => {
    state.fetchHits += 1;
    if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
    const duplicated = mode === "duplicate";
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ customers: [{ duplicated }] }),
    });
  });

  // Browser posts to `/send/` (Next rewrite → /api/send). Mock SMTP here.
  await page.route(/\/send\/?$/, async (route: Route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }
    state.sendHits += 1;
    if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
    if (mode === "fail") {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ ok: false, error: "smtp mock fail" }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        inserted: mode === "success",
        duplicated: mode === "duplicate",
      }),
    });
  });

  return state;
}

export async function openOverlayForm(page: Page): Promise<void> {
  await page.setViewportSize({ width: 1200, height: 800 });
  await page.locator(selectors.joinBtn).click();
  await expect(page.locator(selectors.contactBody)).toBeVisible({
    timeout: 500,
  });
}

export async function openExpandForm(page: Page): Promise<void> {
  const btn = page.locator(selectors.joinExpandCta);
  await page.locator("#join-section").scrollIntoViewIfNeeded();
  await btn.click();
  await expect(btn).toHaveText("Cancel", { timeout: 1000 });
  await expect
    .poll(
      async () =>
        page
          .locator(selectors.expandForm)
          .evaluate((el) => Math.round((el as HTMLElement).offsetHeight)),
      { timeout: 1500 },
    )
    .toBeGreaterThanOrEqual(EXPAND_HEIGHT_PX - 5);
}

/** Expand submit can sit under overflow clipping during height tween — force click. */
export async function clickExpandSubmit(page: Page): Promise<void> {
  await page.locator(selectors.joinExpandSubmit).click({ force: true });
}

export async function fillOverlayForm(
  page: Page,
  payload: ValidPayload,
): Promise<void> {
  await page.locator("#contact-form .name").fill(payload.name);
  await page.locator("#contact-form .email").fill(payload.email);
  await page.locator("#contact-form .phone").fill(payload.phone);
  await page.locator("#contact-form .desc").fill(payload.desc);
}

export async function fillExpandForm(
  page: Page,
  payload: ValidPayload,
): Promise<void> {
  await page.locator(".name2").fill(payload.name);
  await page.locator(".email2").fill(payload.email);
  await page.locator(".phone2").fill(payload.phone);
  await page.locator(".desc2").fill(payload.desc);
}

/** Assert overlay fields cleared after a valid submit starts. */
export async function expectOverlayFieldsCleared(page: Page): Promise<void> {
  await expect(page.locator("#contact-form .name")).toHaveValue("");
  await expect(page.locator("#contact-form .email")).toHaveValue("");
  await expect(page.locator("#contact-form .phone")).toHaveValue("");
  await expect(page.locator("#contact-form .desc")).toHaveValue("");
}

export async function expectExpandFieldsCleared(page: Page): Promise<void> {
  await expect(page.locator(".name2")).toHaveValue("");
  await expect(page.locator(".email2")).toHaveValue("");
  await expect(page.locator(".phone2")).toHaveValue("");
  await expect(page.locator(".desc2")).toHaveValue("");
}

/**
 * Valid submit UX: loader (opacity 1) → result mark at ≥ MAIL_RESULT_AT_MS.
 * Timing is anchored to `startedAt` so setup assertions cannot burn the
 * MAIL_UI_MS window before the mark is observed.
 */
export async function expectSubmitResultTiming(
  page: Page,
  opts: {
    loading: string;
    checkmark: string;
    crossmark: string;
    expectSuccess: boolean;
    startedAt: number;
  },
): Promise<void> {
  const loading = page.locator(opts.loading);
  const mark = page.locator(
    opts.expectSuccess ? opts.checkmark : opts.crossmark,
  );
  const other = page.locator(
    opts.expectSuccess ? opts.crossmark : opts.checkmark,
  );

  await expect(loading).toHaveCSS("opacity", "1");

  // Floor: result must not appear before ~MAIL_RESULT_AT_MS − 400ms.
  const earlyAt = opts.startedAt + MAIL_RESULT_AT_MS - 400;
  const earlyWait = Math.max(0, earlyAt - Date.now());
  if (earlyWait > 0) await page.waitForTimeout(earlyWait);
  await expect(page.locator(opts.checkmark)).toBeHidden();
  await expect(page.locator(opts.crossmark)).toBeHidden();

  // Mark must show before the MAIL_UI_MS cycle clears the done UI.
  const remainForMark = Math.max(
    1500,
    opts.startedAt + MAIL_UI_MS - 200 - Date.now(),
  );
  await expect(mark).toBeVisible({ timeout: remainForMark });
  await expect(other).toBeHidden();

  const elapsedToResult = Date.now() - opts.startedAt;
  expect(
    elapsedToResult,
    `Result appeared too early (${elapsedToResult}ms); expected ≥ ~${MAIL_RESULT_AT_MS}ms`,
  ).toBeGreaterThanOrEqual(MAIL_RESULT_AT_MS - 200);
}
