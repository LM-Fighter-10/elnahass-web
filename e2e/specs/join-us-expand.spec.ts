import { test, expect } from "@playwright/test";
import { gotoReady } from "../fixtures/parity";
import { MAIL_MESSAGES, VALIDATION_MESSAGES } from "../../lib/validation";
import {
  clickExpandSubmit,
  expectExpandFieldsCleared,
  expectSubmitResultTiming,
  fillExpandForm,
  mockContactApis,
  openExpandForm,
  uniquePayload,
} from "../fixtures/join-us";

/** Expand Join Us (`#joinBTN3`) mirrors overlay validation + submit UX (JU-03…08). */
test.describe("join-us-expand", () => {
  test("JU-09a Empty submit required errors", async ({ page }) => {
    await gotoReady(page, "/");
    await openExpandForm(page);
    await clickExpandSubmit(page);

    for (const err of [
      ".name-error2",
      ".email-error2",
      ".phone-error2",
      ".desc-error2",
    ]) {
      await expect(page.locator(err)).toHaveText(VALIDATION_MESSAGES.required);
    }
  });

  test("JU-09b Name with digit error", async ({ page }) => {
    await gotoReady(page, "/");
    await openExpandForm(page);
    await page.locator(".name2").fill("Jane2");
    await expect(page.locator(".name-error2")).toHaveText(
      VALIDATION_MESSAGES.nameNumbers,
    );
  });

  test("JU-09c Bad email / phone errors", async ({ page }) => {
    await gotoReady(page, "/");
    await openExpandForm(page);

    await page.locator(".email2").fill("bad-email");
    await expect(page.locator(".email-error2")).toHaveText(
      VALIDATION_MESSAGES.email,
    );

    await page.locator(".phone2").fill("xyz");
    await expect(page.locator(".phone-error2")).toHaveText(
      VALIDATION_MESSAGES.phoneNumeric,
    );

    await page.locator(".phone2").fill("1234567");
    await expect(page.locator(".phone-error2")).toHaveText(
      VALIDATION_MESSAGES.phoneLength,
    );
  });

  test("JU-09d Desc over 200 chars", async ({ page }) => {
    await gotoReady(page, "/");
    await openExpandForm(page);
    await page.locator(".desc2").fill("y".repeat(201));
    await expect(page.locator(".desc-error2")).toHaveText(
      VALIDATION_MESSAGES.descLength,
    );
  });

  test("JU-09e Valid submit success path", async ({ page }) => {
    await mockContactApis(page, "success");
    await gotoReady(page, "/");
    await openExpandForm(page);

    const payload = uniquePayload("ExpandOk");
    await fillExpandForm(page, payload);

    const startedAt = Date.now();
    await clickExpandSubmit(page);

    await expectExpandFieldsCleared(page);
    await expectSubmitResultTiming(page, {
      loading: "#loading2",
      checkmark: "#checkmark2",
      crossmark: "#crossmark2",
      expectSuccess: true,
      startedAt,
    });

    await expect(page.locator(".mail-sent2")).toHaveText(MAIL_MESSAGES.mailSent);
    await expect(page.locator("#success_msg2")).toContainText(
      MAIL_MESSAGES.success,
    );
  });

  test("JU-09f Same email can submit again successfully", async ({ page }) => {
    await mockContactApis(page, "success");
    await gotoReady(page, "/");
    await openExpandForm(page);

    const payload = uniquePayload("ExpandDup");
    await fillExpandForm(page, payload);

    const startedAt = Date.now();
    await clickExpandSubmit(page);

    await expectSubmitResultTiming(page, {
      loading: "#loading2",
      checkmark: "#checkmark2",
      crossmark: "#crossmark2",
      expectSuccess: true,
      startedAt,
    });

    await expect(page.locator(".mail-sent2")).toHaveText(MAIL_MESSAGES.mailSent);
    await expect(page.locator("#success_msg2")).toContainText(
      MAIL_MESSAGES.success,
    );
    await expect(page.locator("#success_msg2")).toHaveClass(/alert-success/);

    // Second submit with the same email must also succeed.
    await fillExpandForm(page, payload);
    const startedAt2 = Date.now();
    await clickExpandSubmit(page);

    await expectSubmitResultTiming(page, {
      loading: "#loading2",
      checkmark: "#checkmark2",
      crossmark: "#crossmark2",
      expectSuccess: true,
      startedAt: startedAt2,
    });

    await expect(page.locator("#success_msg2")).toContainText(
      MAIL_MESSAGES.success,
    );
  });

  test("JU-09g Network hits fetchCustomer and send", async ({ page }) => {
    const hits = await mockContactApis(page, "success", { delayMs: 20 });
    await gotoReady(page, "/");
    await openExpandForm(page);

    const payload = uniquePayload("ExpandNet");
    await fillExpandForm(page, payload);

    const [fetchHit, sendHit] = await Promise.all([
      page.waitForRequest(
        (req) =>
          req.url().includes("/fetchCustomer") && req.method() === "GET",
      ),
      page.waitForRequest(
        (req) => req.url().includes("/send/") && req.method() === "POST",
      ),
      clickExpandSubmit(page),
    ]);

    expect(fetchHit.url()).toContain("/fetchCustomer");
    expect(sendHit.url()).toMatch(/\/send\/?/);
    expect(hits.fetchHits).toBeGreaterThanOrEqual(1);
    expect(hits.sendHits).toBeGreaterThanOrEqual(1);

    await expect(page.locator("#checkmark2")).toBeVisible({ timeout: 4000 });
  });
});
