import { test, expect, type Page, type Locator } from "@playwright/test";
import { gotoReady } from "../fixtures/parity";

/**
 * Visual parity (VIS-*) — Parity Gate Agent.
 *
 * Next-clone snapshots gate layout/chrome. Image URLs, home shuffle order, and
 * font/antialias drift are masked or tolerated (maxDiffPixelRatio ≤ 0.05 on
 * home shots; 0.02 elsewhere). Django cross-check: RUN_DJANGO_VIS=1.
 *
 * Known soft diffs (document, do not block Deploy):
 * - Home Our Work row order shuffles each load → `#projects` masked
 * - Carousel/hero media masked; replaced Malvern assets may still shift chrome
 */

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };

async function maskMedia(page: Page, extra?: string): Promise<Locator[]> {
  const sel = [
    "img",
    ".swiper-slide",
    "#googleMap",
    ".projects-cover",
    ".project-cover",
    ".about-img",
    ".contact-img",
    "#slider",
    "#nav-slider",
    ".project.row",
    "#projects",
    extra,
  ]
    .filter(Boolean)
    .join(", ");
  const imgs = page.locator(sel);
  const count = await imgs.count();
  const locators: Locator[] = [];
  for (let i = 0; i < count; i++) {
    locators.push(imgs.nth(i));
  }
  return locators;
}

async function shot(
  page: Page,
  name: string,
  opts?: {
    scrollY?: number;
    fullPage?: boolean;
    maxDiffPixelRatio?: number;
    extraMask?: string;
  },
) {
  if (opts?.scrollY != null) {
    await page.evaluate((y) => window.scrollTo(0, y), opts.scrollY);
    await page.waitForTimeout(400);
  }
  const mask = await maskMedia(page, opts?.extraMask);
  await expect(page).toHaveScreenshot(`${name}.png`, {
    fullPage: opts?.fullPage ?? false,
    animations: "disabled",
    caret: "hide",
    mask,
    maxDiffPixelRatio: opts?.maxDiffPixelRatio ?? 0.02,
  });
}

test.describe("visual-parity", () => {
  test.beforeEach(async ({}, testInfo) => {
    if (testInfo.project.name === "django-ref" && !process.env.RUN_DJANGO_VIS) {
      test.skip(true, "Set RUN_DJANGO_VIS=1 to capture django-ref visual baselines");
    }
  });

  test("VIS-home-hero", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await gotoReady(page, "/");
    await page.evaluate(() => window.scrollTo(0, 0));
    // Shuffle + carousel: allow slightly more drift after media replace
    await shot(page, "VIS-home-hero", { maxDiffPixelRatio: 0.05 });
  });

  test("VIS-home-work", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await gotoReady(page, "/");
    await page.locator("#projects-title").scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await shot(page, "VIS-home-work", {
      maxDiffPixelRatio: 0.05,
      extraMask: "#join-section, #footer-sec",
    });
  });

  test("VIS-projects", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await gotoReady(page, "/projects/");
    await shot(page, "VIS-projects");
  });

  test("VIS-project-1", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await gotoReady(page, "/project_view/1");
    await shot(page, "VIS-project-1", { maxDiffPixelRatio: 0.05 });
  });

  test("VIS-about", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await gotoReady(page, "/about/");
    await shot(page, "VIS-about");
  });

  test("VIS-contact", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await gotoReady(page, "/contact/");
    await shot(page, "VIS-contact");
  });

  test("VIS-404", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto("/nope", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);
    await shot(page, "VIS-404");
  });

  test("VIS-home-mobile", async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await gotoReady(page, "/");
    await shot(page, "VIS-home-mobile", { maxDiffPixelRatio: 0.05 });
  });

  test("VIS-projects-mobile", async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await gotoReady(page, "/projects/");
    await shot(page, "VIS-projects-mobile");
  });
});
