import { test, expect } from "@playwright/test";
import { gotoReady } from "../fixtures/parity";
import { selectors } from "../fixtures/selectors";

/** About page specs (AB-01…03) — Static Pages Agent. */
test.describe("about", () => {
  test("AB-01 Titles and copy", async ({ page }) => {
    await gotoReady(page, "/about/");
    await expect(page.locator("#section1-title")).toContainText(
      "Professional Journey",
    );
    await expect(page.locator("#section2-title")).toContainText(
      "Introducing Elnahass",
    );
    await expect(page.locator("#section2-body")).toContainText(
      "Modern Concrete",
    );
    await expect(page.locator("#section2-body")).toContainText("2009");
  });

  test("AB-02 Counters 200+ / 400+", async ({ page }) => {
    const started = Date.now();
    await page.goto("/about/", { waitUntil: "domcontentloaded" });
    // Counters tick from mount (incl. during loader), matching Django timing.
    await expect
      .poll(
        async () => page.locator(selectors.clientsNum).innerText(),
        { timeout: 4500 },
      )
      .toBe("200+");
    expect(Date.now() - started).toBeLessThan(4500);

    await expect
      .poll(
        async () => page.locator(selectors.projectsNum).innerText(),
        { timeout: 6500 },
      )
      .toBe("400+");
    const elapsed = Date.now() - started;
    expect(elapsed).toBeGreaterThanOrEqual(3600);
    expect(elapsed).toBeLessThan(6500);
  });

  test("AB-03 Scroll reveal animated", async ({ page }) => {
    await gotoReady(page, "/about/");
    const title = page.locator(selectors.section1Title);
    await title.evaluate((el) => el.classList.remove("animated"));
    await page.evaluate(() => {
      window.scrollTo(0, 0);
      window.dispatchEvent(new Event("scroll"));
    });
    await page.waitForTimeout(100);
    // Center in viewport so 5% reveal threshold is crossed (edge visibility is not enough)
    await page.evaluate(() => {
      document.querySelector("#section1-title")?.scrollIntoView({
        block: "center",
        behavior: "instant",
      });
      window.dispatchEvent(new Event("scroll"));
    });
    await expect(title).toHaveClass(/animated/, { timeout: 2000 });
  });
});
