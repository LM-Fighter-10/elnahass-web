import { test, expect } from "@playwright/test";
import path from "path";
import { promises as fs } from "fs";

/**
 * Admin smoke — Admin Agent.
 * Run: npx playwright test --config=e2e/playwright.config.ts --project=next-clone e2e/specs/admin.spec.ts
 */

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "Fighter-10";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

async function loginViaApi(page: import("@playwright/test").Page) {
  // page.request shares cookies with the browser context
  const login = await page.request.post("/api/admin/login", {
    data: { username: ADMIN_USERNAME, password: ADMIN_PASSWORD },
  });
  expect(login.ok()).toBeTruthy();
}

test.describe("admin", () => {
  // Avoid parallel nextProjectId races across CRUD smoke tests
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({}, testInfo) => {
    test.skip(
      testInfo.project.name !== "next-clone",
      "Admin UI targets the Next clone",
    );
  });

  test("Admin login fail/success", async ({ page }) => {
    await page.goto("/admin/login");
    await expect(page.getByTestId("admin-login-form")).toBeVisible();

    await page.getByTestId("admin-email").fill(ADMIN_USERNAME);
    await page.getByTestId("admin-password").fill("wrong-password");
    await page.getByTestId("admin-login-submit").click();
    await expect(page.getByTestId("admin-login-error")).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/login/);

    await page.getByTestId("admin-password").fill(ADMIN_PASSWORD);
    await page.getByTestId("admin-login-submit").click();
    await expect(page).toHaveURL(/\/admin\/?$/);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  });

  test("Admin create project next projectId", async ({ page }) => {
    await loginViaApi(page);

    const listBefore = await (
      await page.request.get("/api/admin/projects")
    ).json();
    const maxId = (listBefore as Array<{ projectId: number }>).reduce(
      (m, p) => Math.max(m, p.projectId),
      0,
    );
    const expectedId = maxId + 1;

    await page.goto("/admin/projects");
    await expect(page.getByTestId("admin-create-project-form")).toBeVisible();
    // Wait for list load so hydration/fetch settle before filling
    await expect(page.getByTestId("admin-projects-table").locator("tbody tr").first()).toBeVisible();

    const name = `PW Admin Project ${Date.now()}`;
    await page.getByTestId("admin-project-name").fill(name);
    await page.getByTestId("admin-project-year").fill("2026");
    await page.getByTestId("admin-create-project").click();

    await expect(page.getByTestId("admin-create-message")).toContainText(
      String(expectedId),
    );

    const created = await (
      await page.request.get(`/api/admin/projects/${expectedId}`)
    ).json();
    expect(created.projectId).toBe(expectedId);
    expect(created.name).toBe(name);

    await page.request.delete(`/api/admin/projects/${expectedId}`);
  });

  test("Admin toggle isHome and upload", async ({ page }) => {
    await loginViaApi(page);

    const create = await page.request.post("/api/admin/projects", {
      data: {
        name: `PW Upload ${Date.now()}`,
        year: 2026,
        sector: "Construction",
        location: "Cairo",
        isHome: false,
      },
    });
    expect(create.ok()).toBeTruthy();
    const project = await create.json();
    const projectId = project.projectId as number;

    try {
      await page.goto(`/admin/projects/${projectId}`);
      await expect(page.getByText(`Edit project #${projectId}`)).toBeVisible();

      const homeBox = page.getByTestId("admin-edit-ishome");
      await homeBox.check();
      await expect(homeBox).toBeChecked();
      await page.getByRole("button", { name: "Save" }).click();
      await expect(page.getByText("Saved")).toBeVisible();

      const updated = await (
        await page.request.get(`/api/admin/projects/${projectId}`)
      ).json();
      expect(updated.isHome).toBe(true);

      const tmp = path.join(process.cwd(), "test-results", "admin-thumb.png");
      await fs.mkdir(path.dirname(tmp), { recursive: true });
      const png = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        "base64",
      );
      await fs.writeFile(tmp, png);

      await page.getByTestId("admin-image-file").setInputFiles(tmp);
      await page.getByTestId("admin-image-as-thumb").check();
      await page.getByTestId("admin-image-upload").click();
      await expect(page.getByText("Image uploaded")).toBeVisible();

      const withImg = await (
        await page.request.get(`/api/admin/projects/${projectId}`)
      ).json();
      expect(withImg.images.length).toBeGreaterThanOrEqual(1);
      expect(
        withImg.images.some((i: { thumbnail: boolean }) => i.thumbnail),
      ).toBe(true);
    } finally {
      await page.request.delete(`/api/admin/projects/${projectId}`);
    }
  });

  test("Admin customers list shows lead", async ({ page }) => {
    const stamp = Date.now();
    const lead = {
      name: `Admin Lead ${stamp}`,
      email: `admin.lead.${stamp}@example.com`,
      phone: "01000000099",
      desc: `Lead outline ${stamp}`,
    };

    const send = await page.request.post("/api/send", {
      data: {
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        desc: lead.desc,
      },
      headers: { "Content-Type": "application/json" },
    });
    expect(send.ok()).toBeTruthy();

    await loginViaApi(page);

    await page.goto("/admin/customers");
    await expect(page.getByTestId("admin-customers-table")).toBeVisible();
    await expect(page.getByText(lead.name)).toBeVisible();
    await expect(page.getByText(lead.email)).toBeVisible();
  });
});
