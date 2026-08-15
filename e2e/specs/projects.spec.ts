import { test, expect } from "@playwright/test";
import { gotoReady } from "../fixtures/parity";
import { selectors } from "../fixtures/selectors";
import {
  LANDSCAPE_PROJECT_COUNT,
  PAGE2_PROJECT_IDS,
  PAGE3_FIRST_PROJECT_ID,
  PAGINATION_PAGE_COUNT,
  PROJECT_COUNT,
  PROJECTS_WITHOUT_IMAGES,
} from "../fixtures/seedMeta";
import { PROJECTS_PER_PAGE } from "../../lib/animations";

test.describe("projects", () => {
  // Warm the route so parallel workers don't blow the 3.5s loader ceiling on cold compile
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await page.goto("/projects/", { waitUntil: "domcontentloaded" }).catch(() => undefined);
    await page.waitForTimeout(2500);
    await page.close();
  });

  test("PR-01 Cover and title", async ({ page }) => {
    await gotoReady(page, "/projects/");
    await expect(page.locator(selectors.projectsCover).first()).toBeVisible();
    await expect(page.locator(".projects-title")).toHaveText("Projects Page");
  });

  test(`PR-02 Count ${PROJECT_COUNT} cards`, async ({ page }) => {
    await gotoReady(page, "/projects/");
    await expect(page.locator(selectors.zoomAnim)).toHaveCount(PROJECT_COUNT, {
      timeout: 10_000,
    });
    await expect(page.locator(selectors.projectCard)).toHaveCount(PROJECT_COUNT);
  });

  test("PR-03 Missing img NoImageSelected", async ({ page }) => {
    await gotoReady(page, "/projects/");
    const missing = page.locator('.cta img[src*="NoImageSelected"]');
    await expect(missing).toHaveCount(PROJECTS_WITHOUT_IMAGES);
  });

  test("PR-04 Zoom stagger", async ({ page }) => {
    await page.goto("/projects/", { waitUntil: "domcontentloaded" });
    // Wait until page chrome ready, then assert stagger window from interactive content
    await expect(page.locator(selectors.webPage)).toBeVisible({ timeout: 5000 });
    await page.locator(selectors.spinner).waitFor({ state: "hidden", timeout: 5000 });

    // After ready, first 6 should animate within ~500ms of becoming interactive
    await expect
      .poll(
        async () =>
          page.locator(".zoomAnim.zoom-animate").evaluateAll((els) =>
            els.filter((el) => getComputedStyle(el).display !== "none").length,
          ),
        { timeout: 800 },
      )
      .toBe(PROJECTS_PER_PAGE);

    // First card of page 2 (by list index — ids are not contiguous; seed skips 6)
    const page2First = PAGE2_PROJECT_IDS[0];
    await expect(page.locator(`#zoomAnim${page2First}`)).toBeHidden();
  });

  test("PR-05 Pagination radios", async ({ page }) => {
    await gotoReady(page, "/projects/");
    await expect(page.locator(selectors.zoomAnim)).toHaveCount(PROJECT_COUNT);
    const radios = page.locator('#radio-notch input[type="radio"]');
    await expect(radios).toHaveCount(PAGINATION_PAGE_COUNT);

    const page2First = PAGE2_PROJECT_IDS[0];
    const page2Last = PAGE2_PROJECT_IDS[PAGE2_PROJECT_IDS.length - 1];

    // Inputs are opacity:0 — click the visible label (Django parity)
    await page.locator('label[for="radio2"]').click();
    await expect(page.locator(`#zoomAnim${page2First}`)).toBeVisible({
      timeout: 5000,
    });
    await expect(page.locator(`#zoomAnim${page2Last}`)).toBeVisible();
    await expect(page.locator("#zoomAnim1")).toBeHidden();
    if (PAGE3_FIRST_PROJECT_ID != null) {
      await expect(
        page.locator(`#zoomAnim${PAGE3_FIRST_PROJECT_ID}`),
      ).toBeHidden();
    }
  });

  test("PR-06 Filter construction", async ({ page }) => {
    await gotoReady(page, "/projects/");
    await page.locator(selectors.filterConstruction).click();

    await expect(page.locator("#radio-notch")).toBeHidden();

    const visible = page.locator(".zoomAnim:visible");
    const count = await visible.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const type = await visible.nth(i).getAttribute("data-type");
      expect(type?.toLowerCase()).toContain("construction");
    }
  });

  test(`PR-07 Filter landscape count ${LANDSCAPE_PROJECT_COUNT}`, async ({
    page,
  }) => {
    await gotoReady(page, "/projects/");
    await page.locator("#landscape").click();
    await expect(page.locator(".zoomAnim:visible")).toHaveCount(
      LANDSCAPE_PROJECT_COUNT,
    );
    const visible = page.locator(".zoomAnim:visible");
    const count = await visible.count();
    for (let i = 0; i < count; i++) {
      const type = await visible.nth(i).getAttribute("data-type");
      expect(type?.toLowerCase()).toContain("landscape");
    }
  });

  test("PR-08 Filter repair count 0", async ({ page }) => {
    await gotoReady(page, "/projects/");
    await page.locator("#repair").click();
    await expect(page.locator(".zoomAnim:visible")).toHaveCount(0);
  });

  test("PR-09 Filter clear restores", async ({ page }) => {
    await gotoReady(page, "/projects/");
    await page.locator("#landscape").click();
    await expect(page.locator("#radio-notch")).toBeHidden();

    await page.locator("body").click({ position: { x: 10, y: 400 } });
    await expect(page.locator(".zoomAnim:visible")).toHaveCount(PROJECTS_PER_PAGE);
    await expect(page.locator("#radio-notch")).toBeVisible();
  });

  test("PR-10 Sort newest", async ({ page }) => {
    await gotoReady(page, "/projects/");
    await page.locator(".popup .burger").click();
    await page.locator(".sortby-li").filter({ hasText: "Newest" }).click();

    const visible = page.locator(".zoomAnim:visible");
    await expect(visible).toHaveCount(PROJECTS_PER_PAGE);
    const years = await visible.evaluateAll((els) =>
      els.map((el) => Number(el.getAttribute("data-year"))),
    );
    const first = years[0];
    for (const y of years) {
      expect(first).toBeGreaterThanOrEqual(y);
    }
  });

  test("PR-11 Sort oldest", async ({ page }) => {
    await gotoReady(page, "/projects/");
    await page.locator(".popup .burger").click();
    await page.locator(".sortby-li").filter({ hasText: "Oldest" }).click();

    const visible = page.locator(".zoomAnim:visible");
    await expect(visible).toHaveCount(PROJECTS_PER_PAGE);
    const years = await visible.evaluateAll((els) =>
      els.map((el) => Number(el.getAttribute("data-year"))),
    );
    const first = years[0];
    for (const y of years) {
      expect(first).toBeLessThanOrEqual(y);
    }
  });

  test("PR-12 Clear sort", async ({ page }) => {
    await gotoReady(page, "/projects/");
    await page.locator(".popup .burger").click();
    await page.locator(".sortby-li").filter({ hasText: "Newest" }).click();
    await page.locator(".removeSort").click();

    const firstVisible = page.locator(".zoomAnim:visible").first();
    await expect(firstVisible).toHaveAttribute("data-id", "1");
    await expect(page.locator("#zoomAnim1")).toBeVisible();
  });

  test("PR-13 Card navigate same tab", async ({ page }) => {
    await gotoReady(page, "/projects/");
    await page.locator("#p1").click();
    await expect(page).toHaveURL(/\/project_view\/1\/?/);
  });

  test("PR-14 Card hover body", async ({ page }) => {
    await gotoReady(page, "/projects/");
    await expect(page.locator("#p1")).toBeVisible();
    const card = page.locator("#p1");
    const body = card.locator(".p_body");
    await card.hover();
    await expect
      .poll(async () => body.evaluate((el) => getComputedStyle(el).bottom), {
        timeout: 2000,
      })
      .toBe("0px");
  });
});
