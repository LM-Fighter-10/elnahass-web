import { test, expect } from "@playwright/test";
import { gotoReady } from "../fixtures/parity";
import { selectors } from "../fixtures/selectors";

/** Project detail specs (PV-01…11) — Detail Agent. */
test.describe("project-view", () => {
  test("PV-01 Title Malvern College Egypt", async ({ page }) => {
    await gotoReady(page, "/project_view/1");
    await expect(page.locator(".pView-title")).toHaveText(
      "Malvern College Egypt",
    );
  });

  test("PV-02 Meta year location client sector", async ({ page }) => {
    await gotoReady(page, "/project_view/1");
    const items = page.locator(".p-detail-item");
    await expect(items.nth(0).locator(".p-detail-description")).toHaveText(
      "2019",
    );
    await expect(items.nth(1).locator(".p-detail-description")).toHaveText(
      "Kattameya",
    );
    await expect(items.nth(2).locator(".p-detail-description")).toHaveText(
      "Azazy Group",
    );
    await expect(items.nth(3).locator(".p-detail-description")).toHaveText(
      "Construction",
    );
  });

  test("PV-03 Arabic header", async ({ page }) => {
    await gotoReady(page, "/project_view/1");
    await expect(page.locator(".p-title")).toContainText("تفاصيل المشروع");
  });

  test("PV-04 Split rule A single text-lines", async ({ page }) => {
    await gotoReady(page, "/project_view/1");
    const lines = page.locator(selectors.textLines);
    await expect(lines).toHaveCount(1);
    const text = await lines.first().innerText();
    expect(text.includes("١-")).toBe(false);
  });

  test("PV-05 Split rule B multiple text-lines", async ({ page }) => {
    await gotoReady(page, "/project_view/2");
    const lines = page.locator(selectors.textLines);
    const count = await lines.count();
    expect(count).toBeGreaterThan(1);
    for (let i = 0; i < count; i += 1) {
      const chunk = (await lines.nth(i).innerText()).trim();
      expect(chunk.endsWith(".")).toBe(true);
    }
  });

  test("PV-06 Gallery reorder order", async ({ page }) => {
    await gotoReady(page, "/project_view/1");

    // Loop mode rearranges DOM; use data-swiper-slide-index for source order
    const byIndex = await page.evaluate(() => {
      const map: Record<string, string> = {};
      document
        .querySelectorAll<HTMLElement>(
          ".swiper-slide:not(.swiper-slide-duplicate)",
        )
        .forEach((slide) => {
          const idx = slide.getAttribute("data-swiper-slide-index") ?? "";
          const src =
            slide.querySelector<HTMLImageElement>("img.slider-images")?.src ||
            "";
          map[idx] = src;
        });
      return map;
    });

    expect(byIndex["0"] || "").toMatch(/Malvern_2/);
    expect(byIndex["1"] || "").toMatch(/p1/);
  });

  test("PV-07 Cover thumbnail p1", async ({ page }) => {
    await gotoReady(page, "/project_view/1");
    const cover = page.locator(selectors.projectCover);
    await expect(cover).toBeVisible();
    const src = (await cover.getAttribute("src")) || "";
    expect(src).toMatch(/p1/);
  });

  test("PV-08 Swiper chrome buttons", async ({ page }) => {
    await gotoReady(page, "/project_view/1");
    await page.setViewportSize({ width: 1200, height: 800 });
    await expect(page.locator(selectors.swiperNext)).toHaveCount(1);
    await expect(page.locator(selectors.swiperPrev)).toHaveCount(1);

    await page.setViewportSize({ width: 390, height: 844 });
    // May be display:none ≤640px — still in DOM
    await expect(page.locator(selectors.swiperNext)).toHaveCount(1);
    await expect(page.locator(selectors.swiperPrev)).toHaveCount(1);
  });

  test("PV-09 Swiper motion after delay", async ({ page }) => {
    await gotoReady(page, "/project_view/1");

    const readIndex = () =>
      page.evaluate(() => {
        const active = document.querySelector(".swiper-slide-active");
        if (!active) return -1;
        const slides = Array.from(
          document.querySelectorAll(".swiper-slide:not(.swiper-slide-duplicate)"),
        );
        const real = active.classList.contains("swiper-slide-duplicate")
          ? document.querySelector(
              `.swiper-slide:not(.swiper-slide-duplicate)[data-swiper-slide-index="${active.getAttribute("data-swiper-slide-index")}"]`,
            )
          : active;
        return slides.indexOf(real as Element);
      });

    const before = await readIndex();
    await page.waitForTimeout(5500);
    const after = await readIndex();
    expect(after).not.toBe(before);
  });

  test("PV-10 Empty project loads", async ({ page }) => {
    await gotoReady(page, "/project_view/3");
    await expect(page.locator(".pView-title")).toHaveText(
      "Helio Beach Village",
    );
    // Empty gallery is OK — page must not throw
    await expect(page.locator(".main-img")).toBeVisible();
  });

  test("PV-11 Unknown id not-found", async ({ page }) => {
    const res = await page.goto("/project_view/99999", {
      waitUntil: "domcontentloaded",
    });
    expect(res?.status()).toBe(404);
    // Next default: "This page could not be found." — also accept literal 404
    await expect(page.locator("body")).toContainText(/404|could not be found|not found/i, {
      timeout: 10_000,
    });
  });
});
