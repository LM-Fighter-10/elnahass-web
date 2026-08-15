import { defineConfig, devices } from "@playwright/test";

const DJANGO_BASE = process.env.DJANGO_BASE ?? "http://127.0.0.1:8000";
// Prefer localhost so Next.dev JS chunks are not blocked as cross-origin (127.0.0.1).
const NEXT_BASE = process.env.NEXT_BASE ?? "http://localhost:3000";

/**
 * Two projects share the same specs:
 * - django-ref → live Django reference (:8000)
 * - next-clone → Next.js clone (:3000)
 */
export default defineConfig({
  testDir: "./specs",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["list"]],
  timeout: 60_000,
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.02,
    },
  },
  use: {
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "django-ref",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: DJANGO_BASE,
      },
    },
    {
      name: "next-clone",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: NEXT_BASE,
      },
    },
  ],
});
