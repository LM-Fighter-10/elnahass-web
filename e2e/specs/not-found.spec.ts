import { test, expect } from "@playwright/test";
import { selectors } from "../fixtures/selectors";

/** 404 specs (NF-01…02) — Static Pages Agent. */
test.describe("not-found", () => {
  test("NF-01 Shows 404 and home link", async ({ page }) => {
    await page.goto("/this-page-does-not-exist", {
      waitUntil: "domcontentloaded",
    });
    await expect(page.locator("#notfound")).toBeVisible();
    await expect(page.locator(".notfound-404")).toContainText("404");
    const home = page.locator("#notfound a");
    await expect(home).toBeVisible();
    await expect(home).toContainText(/home page/i);
    const href = await home.getAttribute("href");
    expect(href === "/" || href?.endsWith("/") || href?.includes("home")).toBeTruthy();
  });

  test("NF-02 No navbar or spinner", async ({ page }) => {
    await page.goto("/this-page-does-not-exist", {
      waitUntil: "domcontentloaded",
    });
    await expect(page.locator("#notfound")).toBeVisible();
    await expect(page.locator(selectors.navbar)).toHaveCount(0);
    await expect(page.locator(selectors.spinner)).toHaveCount(0);
  });
});
