import { test, expect } from "@playwright/test";
import { gotoReady } from "../fixtures/parity";
import { selectors } from "../fixtures/selectors";
import { MAIL_MESSAGES, VALIDATION_MESSAGES } from "../../lib/validation";
import {
  expectOverlayFieldsCleared,
  expectSubmitResultTiming,
  fillOverlayForm,
  mockContactApis,
  openOverlayForm,
  uniquePayload,
} from "../fixtures/join-us";

test.describe("join-us-overlay", () => {
  test("JU-01 Open overlay form", async ({ page }) => {
    await gotoReady(page, "/");
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.locator(selectors.joinBtn).click();

    const form = page.locator(selectors.contactForm);
    await expect
      .poll(
        async () => {
          const box = await form.boundingBox();
          return box && box.width > 0 && box.height > 0;
        },
        { timeout: 300 },
      )
      .toBe(true);

    await expect(page.locator(selectors.contactBody)).toBeVisible({
      timeout: 500,
    });
  });

  test("JU-01b Toggle Join Us closes overlay", async ({ page }) => {
    await gotoReady(page, "/");
    await page.setViewportSize({ width: 1200, height: 800 });
    const joinBtn = page.locator(selectors.joinBtn);
    const form = page.locator(selectors.contactForm);

    await joinBtn.click();
    await expect(page.locator(selectors.contactBody)).toBeVisible();

    // Clicking Join Us again must close (Django #join-btn toggle)
    await joinBtn.click();
    await expect
      .poll(async () => {
        const box = await form.boundingBox();
        return !box || box.width < 10 || box.height < 10;
      })
      .toBe(true);
  });

  test("JU-02 Close outside click", async ({ page }) => {
    await gotoReady(page, "/");
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.locator(selectors.joinBtn).click();
    await expect(page.locator(selectors.contactBody)).toBeVisible();
    await page.locator("body").click({ position: { x: 20, y: 500 } });
    await expect
      .poll(async () => {
        const box = await page.locator(selectors.contactForm).boundingBox();
        return !box || box.width < 10 || box.height < 10;
      })
      .toBe(true);
  });

  test("JU-02b Escape closes overlay with field errors", async ({ page }) => {
    await gotoReady(page, "/");
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.locator(selectors.joinBtn).click();
    await expect(page.locator(selectors.contactBody)).toBeVisible();

    await page.locator("#contact-form .email").fill("not-an-email");
    const emailErr = page.locator(".email-error");
    await expect(emailErr).toHaveText(VALIDATION_MESSAGES.email);
    await expect(emailErr).toBeVisible();

    await page.keyboard.press("Escape");
    await expect
      .poll(async () => {
        const box = await page.locator(selectors.contactForm).boundingBox();
        return !box || box.width < 10 || box.height < 10;
      })
      .toBe(true);
  });

  test("JU-03 Empty submit required errors", async ({ page }) => {
    await gotoReady(page, "/");
    await page.setViewportSize({ width: 1200, height: 800 });
    await openOverlayForm(page);
    const form = page.locator(selectors.contactForm);
    await expect(form.locator(selectors.joinSubmit)).toBeVisible();
    await form.locator(selectors.joinSubmit).click();

    for (const err of [
      ".name-error",
      ".email-error",
      ".phone-error",
      ".desc-error",
    ]) {
      await expect(form.locator(err)).toHaveText(VALIDATION_MESSAGES.required, {
        timeout: 3000,
      });
    }
  });

  test("JU-04 Name with digit error", async ({ page }) => {
    await gotoReady(page, "/");
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.locator(selectors.joinBtn).click();
    await page.locator("#contact-form .name").fill("John1");
    await expect(page.locator(".name-error")).toHaveText(
      VALIDATION_MESSAGES.nameNumbers,
    );
  });

  test("JU-05 Bad email / phone errors", async ({ page }) => {
    await gotoReady(page, "/");
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.locator(selectors.joinBtn).click();

    await page.locator("#contact-form .email").fill("not-an-email");
    const emailErr = page.locator(".email-error");
    await expect(emailErr).toHaveText(VALIDATION_MESSAGES.email);
    await expect(emailErr).toBeVisible();

    await page.locator("#contact-form .phone").fill("abc");
    const phoneErr = page.locator(".phone-error");
    await expect(phoneErr).toHaveText(VALIDATION_MESSAGES.phoneNumeric);
    await expect(phoneErr).toBeVisible();

    await page.locator("#contact-form .phone").fill("12345");
    await expect(phoneErr).toHaveText(VALIDATION_MESSAGES.phoneLength);
    await expect(phoneErr).toBeVisible();

    // Valid phone clears error text and visibility
    await page.locator("#contact-form .phone").fill("01234567890");
    await expect(phoneErr).toBeHidden();
  });

  test("JU-06 Desc over 200 chars", async ({ page }) => {
    await gotoReady(page, "/");
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.locator(selectors.joinBtn).click();
    await page.locator("#contact-form .desc").fill("x".repeat(201));
    await expect(page.locator(".desc-error")).toHaveText(
      VALIDATION_MESSAGES.descLength,
    );
  });

  test("JU-07 Valid submit success path", async ({ page }) => {
    await mockContactApis(page, "success");
    await gotoReady(page, "/");
    await openOverlayForm(page);

    const payload = uniquePayload("OverlayOk");
    await fillOverlayForm(page, payload);

    const startedAt = Date.now();
    await page.locator(selectors.joinSubmit).click();

    await expectOverlayFieldsCleared(page);
    await expectSubmitResultTiming(page, {
      loading: "#loading",
      checkmark: "#checkmark1",
      crossmark: "#crossmark1",
      expectSuccess: true,
      startedAt,
    });

    await expect(page.locator(".mail-sent")).toHaveText(MAIL_MESSAGES.mailSent);
    await expect(page.locator("#success_msg")).toContainText(
      MAIL_MESSAGES.success,
    );
  });

  test("JU-08 Same email can submit again successfully", async ({ page }) => {
    await mockContactApis(page, "success");
    await gotoReady(page, "/");
    await openOverlayForm(page);

    const payload = uniquePayload("OverlayDup");
    await fillOverlayForm(page, payload);

    const startedAt = Date.now();
    await page.locator(selectors.joinSubmit).click();

    await expectSubmitResultTiming(page, {
      loading: "#loading",
      checkmark: "#checkmark1",
      crossmark: "#crossmark1",
      expectSuccess: true,
      startedAt,
    });

    await expect(page.locator(".mail-sent")).toHaveText(MAIL_MESSAGES.mailSent);
    await expect(page.locator("#success_msg")).toContainText(
      MAIL_MESSAGES.success,
    );
    await expect(page.locator("#success_msg")).toHaveClass(/alert-success/);

    // Second submit with the same email must also succeed.
    await fillOverlayForm(page, payload);
    const startedAt2 = Date.now();
    await page.locator(selectors.joinSubmit).click();

    await expectSubmitResultTiming(page, {
      loading: "#loading",
      checkmark: "#checkmark1",
      crossmark: "#crossmark1",
      expectSuccess: true,
      startedAt: startedAt2,
    });

    await expect(page.locator("#success_msg")).toContainText(
      MAIL_MESSAGES.success,
    );
  });

  test("JU-10 Network hits fetchCustomer and send", async ({ page }) => {
    const hits = await mockContactApis(page, "success", { delayMs: 20 });
    await gotoReady(page, "/");
    await openOverlayForm(page);

    const payload = uniquePayload("OverlayNet");
    await fillOverlayForm(page, payload);

    const [fetchHit, sendHit] = await Promise.all([
      page.waitForRequest(
        (req) =>
          req.url().includes("/fetchCustomer") && req.method() === "GET",
      ),
      page.waitForRequest(
        (req) => req.url().includes("/send/") && req.method() === "POST",
      ),
      page.locator(selectors.joinSubmit).click(),
    ]);

    expect(fetchHit.url()).toContain("/fetchCustomer");
    expect(sendHit.url()).toMatch(/\/send\/?/);
    expect(hits.fetchHits).toBeGreaterThanOrEqual(1);
    expect(hits.sendHits).toBeGreaterThanOrEqual(1);

    await expect(page.locator("#checkmark1")).toBeVisible({ timeout: 4000 });
  });
});
