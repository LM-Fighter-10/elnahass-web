import { test, expect } from "@playwright/test";
import { gotoReady } from "../fixtures/parity";
import { selectors } from "../fixtures/selectors";

/** Contact page specs (CT-01…03) — Static Pages Agent. */
test.describe("contact", () => {
  test("CT-01 Titles and contact details", async ({ page }) => {
    await gotoReady(page, "/contact/");
    await expect(page.locator(".contact-us-title")).toContainText("Contact Us");
    await expect(page.locator(selectors.contactTitle)).toContainText(
      "Get in Touch",
    );
    await expect(page.locator(".contact-body")).toContainText(
      "18 Omaraat Emdaad wy Tamween, Makram-Ebid Ext, Nasr City, Cairo, Egypt",
    );
    await expect(page.locator(".contact-body")).toContainText("+201000026223");
    await expect(page.locator(".contact-body")).toContainText("0223052416");
    await expect(page.locator(".contact-body")).toContainText(
      "info@elnahass-sonsgroup.com",
    );
  });

  test("CT-02 Google Map iframe", async ({ page }) => {
    await gotoReady(page, "/contact/");
    const map = page.locator(selectors.googleMap);
    await expect(map).toBeVisible();
    const src = await map.getAttribute("src");
    expect(src ?? "").toContain("google.com/maps");
  });

  test("CT-03 Contact title reveal", async ({ page }) => {
    await gotoReady(page, "/contact/");
    const title = page.locator(selectors.contactTitle);
    await title.evaluate((el) => el.classList.remove("animated"));
    await page.evaluate(() => {
      window.scrollTo(0, 0);
      window.dispatchEvent(new Event("scroll"));
    });
    await page.waitForTimeout(100);
    await page.evaluate(() => {
      document.querySelector(".contact-title")?.scrollIntoView({
        block: "center",
        behavior: "instant",
      });
      window.dispatchEvent(new Event("scroll"));
    });
    await expect(title).toHaveClass(/animated/, { timeout: 2000 });
  });
});
