import { test, expect } from "@playwright/test";
import { gotoReady, waitForLoaderGone } from "../fixtures/parity";
import { selectors } from "../fixtures/selectors";

test.describe("shell", () => {
  test("SH-01 PageLoader: spinner then ready ~2s", async ({ page }) => {
    const started = Date.now();
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const spinner = page.locator(selectors.spinner);
    await expect(spinner).toBeVisible({ timeout: 1500 });

    const webPage = page.locator(selectors.webPage);
    // Not interactive / not shown until ready
    await expect(webPage).toBeHidden();

    await expect(webPage).toBeVisible({ timeout: 5000 });
    await waitForLoaderGone(page);

    const elapsed = Date.now() - started;
    expect(elapsed).toBeGreaterThanOrEqual(1900);
    expect(elapsed).toBeLessThanOrEqual(8000);
  });

  test("SH-02 PageLoader: spinner hidden; overflow not hidden", async ({
    page,
  }) => {
    await gotoReady(page, "/");
    await expect(page.locator(selectors.spinner)).toBeHidden();
    const overflow = await page.evaluate(() => getComputedStyle(document.body).overflow);
    expect(overflow).not.toBe("hidden");
  });

  test("SH-03 Navbar links", async ({ page }) => {
    await gotoReady(page, "/");
    await expect(page.locator(`${selectors.navbar} a[href="/projects/"]`)).toBeVisible();
    await expect(page.locator(`${selectors.navbar} a[href="/about/"]`)).toBeVisible();
    await expect(page.locator(`${selectors.navbar} a[href="/contact/"]`)).toBeVisible();
  });

  test("SH-04 Burger span animation classes", async ({ page }) => {
    await gotoReady(page, "/");
    await page.setViewportSize({ width: 390, height: 844 });
    const spans = page.locator(selectors.menuIconSpans);
    await expect(spans).toHaveCount(3);
    await page.locator(selectors.burgerBtn).click();
    await expect(spans.nth(0)).toHaveClass(/firstSpan-animation/);
    await expect(spans.nth(1)).toHaveClass(/secondSpan-animation/);
    await expect(spans.nth(2)).toHaveClass(/thirdSpan-animation/);
  });

  test("SH-05 Burger outside click closes", async ({ page }) => {
    await gotoReady(page, "/");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator(selectors.burgerBtn).click();
    await expect(page.locator("#navbarNav")).toHaveClass(/\bin\b/);
    await page.locator("body").click({ position: { x: 5, y: 400 } });
    await expect(page.locator("#navbarNav")).not.toHaveClass(/\bin\b/);
  });

  test("SH-06 Join CTA visibility by viewport", async ({ page }) => {
    await gotoReady(page, "/");
    const joinLi = page.locator(selectors.joinButtonLi);

    await page.setViewportSize({ width: 1200, height: 800 });
    await expect(joinLi).toBeVisible();

    await page.setViewportSize({ width: 992, height: 800 });
    await expect(joinLi).toBeHidden();

    await page.setViewportSize({ width: 993, height: 800 });
    await expect(joinLi).toBeVisible();
  });

  test("SH-07 Footer contact copy", async ({ page }) => {
    await gotoReady(page, "/");
    const footer = page.locator(selectors.footer);
    await expect(footer).toContainText("18 Omaraat Emdaad wy Tamween");
    await expect(footer).toContainText("+201000026223");
    await expect(footer).toContainText("info@elnahass-sonsgroup.com");
  });

  test("SH-08 Footer copyright year", async ({ page }, testInfo) => {
    await gotoReady(page, "/");
    const year = new Date().getFullYear();
    const copy = page.locator("#copyRights");
    await expect(copy).toContainText(String(year));
    // Deployed/Next copy uses Omar Alaa Elnahass; local Django may still say the company name
    if (testInfo.project.name === "next-clone") {
      await expect(copy).toContainText("Omar Alaa Elnahass");
    } else {
      await expect(copy).toContainText(
        /Omar Alaa Elnahass|Elnahass For Construction and Technology/,
      );
    }
  });

  test("SH-09 Footer icon hover color", async ({ page }) => {
    await gotoReady(page, "/");
    const icon = page.locator("#fa-ico");
    await icon.scrollIntoViewIfNeeded();
    await icon.hover();
    // Footer icon hover uses a ~320ms background transition
    await expect
      .poll(
        async () =>
          icon.evaluate((el) => getComputedStyle(el).backgroundColor),
        { timeout: 1500 },
      )
      .toBe("rgb(235, 126, 57)");
  });
});
