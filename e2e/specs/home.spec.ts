import { test, expect } from "@playwright/test";
import { gotoReady } from "../fixtures/parity";
import { selectors } from "../fixtures/selectors";
import {
  HOME_CAROUSEL_INDICATORS,
  HOME_PROJECT_COUNT,
  HOME_PROJECT_NAMES,
} from "../fixtures/seedMeta";
import { CAROUSEL_MS, EXPAND_HEIGHT_PX } from "../../lib/animations";

/** Home page specs (HM-01…11) — Home Agent. */
test.describe("home", () => {
  test("HM-01 Welcome copy", async ({ page }) => {
    await gotoReady(page, "/");
    await expect(page.locator("#welcome")).toHaveText(
      "Elnahass For Construction and Technology",
    );
    await expect(page.locator("#welcome-box")).toContainText(
      "Empowering Progress with Expertise - Elnahass For Construction and Technology",
    );
    await expect(page.locator("#welcome-box")).toContainText(
      "Where Vision Meets Precision, Building Dreams and Redefining Success.",
    );
  });

  test("HM-02 Our Work rows", async ({ page }) => {
    await gotoReady(page, "/");
    await expect(page.locator(selectors.projectsTitle)).toHaveText("Our Work");
    const rows = page.locator("#projects .project.row");
    await expect(rows).toHaveCount(HOME_PROJECT_COUNT);
    const names = await rows.locator(".project-title").allTextContents();
    expect(names).toEqual(expect.arrayContaining([...HOME_PROJECT_NAMES]));
  });

  test("HM-03 Alternating order class", async ({ page }) => {
    await gotoReady(page, "/");
    await page.setViewportSize({ width: 1200, height: 800 });
    const rows = page.locator("#projects .project.row");
    await expect(rows).toHaveCount(HOME_PROJECT_COUNT);
    const secondImg = rows.nth(1).locator(".projects-img");
    await expect(secondImg).toHaveClass(/order-md-2/);
  });

  test("HM-04 Show Details navigates same tab", async ({ page }) => {
    await gotoReady(page, "/");
    const btn = page.locator(".detailsbtn").first();
    const id = await btn.getAttribute("id");
    const projectId = id?.replace("showbtn", "") ?? "";
    await Promise.all([
      page.waitForURL(`**/project_view/${projectId}`),
      btn.click(),
    ]);
    expect(page.url()).toMatch(new RegExp(`/project_view/${projectId}/?$`));
  });

  test("HM-05 Carousel indicator count", async ({ page }) => {
    await gotoReady(page, "/");
    const indicators = page.locator("#nav-slider li");
    await expect(indicators).toHaveCount(HOME_CAROUSEL_INDICATORS);
  });

  test("HM-06 Carousel auto-advance", async ({ page }) => {
    await gotoReady(page, "/");
    const first = page.locator("#nav-slider1");
    const second = page.locator("#nav-slider2");
    await expect(first).toHaveClass(/active/);
    await expect(second).not.toHaveClass(/active/);

    await expect
      .poll(
        async () => {
          const cls = await second.getAttribute("class");
          return cls ?? "";
        },
        { timeout: CAROUSEL_MS + 500 },
      )
      .toMatch(/active/);
  });

  test("HM-07 Carousel pause when hidden", async ({ page }) => {
    await gotoReady(page, "/");
    // Wait for first advance to slide 2 so we know the interval is live
    await expect
      .poll(
        async () => (await page.locator("#nav-slider2").getAttribute("class")) ?? "",
        { timeout: CAROUSEL_MS + 500 },
      )
      .toMatch(/active/);

    await page.evaluate(() => {
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        get: () => "hidden",
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });

    const activeBefore = await page.locator("#nav-slider li.active").getAttribute("id");
    await page.waitForTimeout(CAROUSEL_MS + 1000);
    const activeAfter = await page.locator("#nav-slider li.active").getAttribute("id");
    expect(activeAfter).toBe(activeBefore);
  });

  test("HM-08 Scroll reveal", async ({ page }) => {
    await gotoReady(page, "/");
    const title = page.locator(selectors.projectsTitle);

    // Reset reveal state and park title below the 5% threshold.
    // Removing `.animated` starts a ~700ms opacity transition — wait for settle.
    await page.evaluate(() => {
      const el = document.querySelector("#projects-title") as HTMLElement | null;
      el?.classList.remove("animated");
      window.scrollTo(0, 0);
      window.dispatchEvent(new Event("scroll"));
    });
    await expect
      .poll(
        async () =>
          title.evaluate((el) => parseFloat(getComputedStyle(el).opacity)),
        { timeout: 1500 },
      )
      .toBeLessThan(0.15);
    await expect(title).not.toHaveClass(/animated/);

    await page.evaluate(() => {
      document.querySelector("#projects-title")?.scrollIntoView({
        block: "center",
        behavior: "instant",
      });
      window.dispatchEvent(new Event("scroll"));
    });
    await expect(title).toHaveClass(/animated/, { timeout: 2000 });
    await expect
      .poll(
        async () =>
          title.evaluate((el) => parseFloat(getComputedStyle(el).opacity)),
        { timeout: 1500 },
      )
      .toBeGreaterThan(0.9);
  });

  test("HM-09 Expand Join Us open", async ({ page }) => {
    await gotoReady(page, "/");
    const btn = page.locator(selectors.joinExpandCta);
    const form = page.locator(selectors.expandForm);
    await btn.scrollIntoViewIfNeeded();
    await btn.click();
    await expect
      .poll(
        async () =>
          form.evaluate((el) => Math.round((el as HTMLElement).offsetHeight)),
        { timeout: 400 },
      )
      .toBeGreaterThanOrEqual(EXPAND_HEIGHT_PX - 5);
    await expect(btn).toHaveText("Cancel");
  });

  test("HM-10 Expand Join Us close", async ({ page }) => {
    await gotoReady(page, "/");
    const btn = page.locator(selectors.joinExpandCta);
    const form = page.locator(selectors.expandForm);
    await btn.scrollIntoViewIfNeeded();
    await btn.click();
    await expect(btn).toHaveText("Cancel");
    await btn.click();
    await expect
      .poll(
        async () =>
          form.evaluate((el) => Math.round((el as HTMLElement).offsetHeight)),
        { timeout: 500 },
      )
      .toBe(0);
    await expect(btn).toHaveText("Join Us");
  });

  test("HM-11 Scroll auto-closes expand", async ({ page }) => {
    await gotoReady(page, "/");
    const btn = page.locator(selectors.joinExpandCta);
    await btn.scrollIntoViewIfNeeded();
    await btn.click();
    await expect(btn).toHaveText("Cancel");

    // Scroll expand-form well out of the 10% viewport threshold (up toward hero)
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(btn).toHaveText("Join Us", { timeout: 2000 });
  });
});
