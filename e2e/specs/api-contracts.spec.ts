import { test, expect, type APIRequestContext } from "@playwright/test";
import {
  HOME_PROJECT_COUNT,
  HOME_PROJECT_IDS,
  MAX_PROJECT_ID,
  PROJECT_COUNT,
  PROJECTS_WITHOUT_IMAGES,
} from "../fixtures/seedMeta";

/**
 * API contract specs (API-01…08) — Data Agent.
 * Run against Next only: `npm run test:api` (requires seeded Mongo + `npm run dev`).
 */

const LIST_KEYS = ["id", "name", "type", "img", "desc", "year"] as const;

test.describe("api-contracts", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(
      testInfo.project.name !== "next-clone",
      "API contracts target the Next clone",
    );
  });

  test("API-01 GET /api/projects items ordered by id", async ({
    request,
  }) => {
    const res = await request.get("/api/projects");
    expect(res.ok()).toBeTruthy();
    const projects = (await res.json()) as Record<string, unknown>[];
    expect(projects).toHaveLength(PROJECT_COUNT);

    for (const item of projects) {
      expect(Object.keys(item).sort()).toEqual([...LIST_KEYS].sort());
    }

    const ids = projects.map((p) => p.id as number);
    expect(ids).toEqual([...ids].sort((a, b) => a - b));
    expect(ids[0]).toBe(1);
    expect(ids[ids.length - 1]).toBe(MAX_PROJECT_ID);
  });

  test("API-02 Missing images NoImageSelected", async ({ request }) => {
    const projects = await (await request.get("/api/projects")).json();
    const missing = (
      projects as Array<{ id: number; img: string }>
    ).filter(
      (p) =>
        p.img === "NoImageSelected/" || p.img.endsWith("NoImageSelected/"),
    );

    expect(missing).toHaveLength(PROJECTS_WITHOUT_IMAGES);
  });

  test("API-03 GET /api/projects/home length and ids", async ({ request }) => {
    const res = await request.get("/api/projects/home");
    expect(res.ok()).toBeTruthy();
    const home = (await res.json()) as Array<{ id: number }>;
    expect(home.length).toBeLessThanOrEqual(4);
    expect(home.length).toBe(HOME_PROJECT_COUNT);
    const ids = home.map((p) => p.id).sort((a, b) => a - b);
    expect(ids).toEqual([...HOME_PROJECT_IDS].sort((a, b) => a - b));
  });

  test("API-04 Gallery reorder Malvern", async ({ request }) => {
    const res = await request.get("/api/projects/1");
    expect(res.ok()).toBeTruthy();
    const detail = (await res.json()) as { gallery: string[] };
    expect(detail.gallery.length).toBeGreaterThanOrEqual(2);

    const tokens = detail.gallery.map((url) => {
      const file = url.split("/").pop() || url;
      return file.replace(/\.[^.]+$/, "");
    });

    // After reorder: Malvern_2, p1, Malvern_3…
    expect(tokens[0]).toContain("Malvern_2");
    expect(tokens[1]).toMatch(/^p1$/);
    if (tokens[2]) expect(tokens[2]).toContain("Malvern_3");
  });

  test("API-05 Cover thumbnail p1", async ({ request }) => {
    const detail = await (await request.get("/api/projects/1")).json();
    expect(String(detail.cover)).toMatch(/p1/);
    // Cover stays thumbnail even though gallery[0] is Malvern_2 after reorder
    expect(String(detail.gallery[0])).toMatch(/Malvern_2/);
    expect(String(detail.cover)).not.toMatch(/Malvern_2/);
  });

  test("API-06 GET /fetchCustomer shape", async ({ request }) => {
    const qs = new URLSearchParams({
      name: "ApiContractUser",
      email: "api-contract@example.com",
      phone: "01111111111",
      desc: "api contract probe",
    });
    const res = await request.get(`/fetchCustomer?${qs.toString()}`);
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as {
      customers: Array<{ duplicated: boolean }>;
    };
    expect(body).toHaveProperty("customers");
    expect(Array.isArray(body.customers)).toBeTruthy();
    expect(body.customers).toHaveLength(1);
    expect(typeof body.customers[0].duplicated).toBe("boolean");
  });

  test("API-07 POST /send/ allows same email twice", async ({ request }) => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const payload = {
      name: `Dup Test ${suffix}`,
      email: `dup-${suffix}@example.com`,
      phone: "01234567890",
      outline_desc: `unique outline ${suffix}`,
    };

    const first = await postSend(request, payload);
    expect(first.ok()).toBeTruthy();
    const firstBody = await first.json();
    expect(firstBody.inserted).toBe(true);
    expect(firstBody.duplicated).toBe(false);

    const check = await request.get(
      `/fetchCustomer?${new URLSearchParams({
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        desc: payload.outline_desc,
      }).toString()}`,
    );
    expect((await check.json()).customers[0].duplicated).toBe(false);

    const second = await postSend(request, payload);
    expect(second.ok()).toBeTruthy();
    const secondBody = await second.json();
    expect(secondBody.inserted).toBe(true);
    expect(secondBody.duplicated).toBe(false);
  });

  test("API-08 Missing required field no insert", async ({ request }) => {
    const suffix = `${Date.now()}-missing`;
    const incomplete = {
      name: `Missing Field ${suffix}`,
      email: `missing-${suffix}@example.com`,
      phone: "01234567891",
      // outline_desc intentionally omitted
    };

    const res = await postSend(request, incomplete);
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.inserted).toBe(false);

    const check = await request.get(
      `/fetchCustomer?${new URLSearchParams({
        name: incomplete.name,
        email: incomplete.email,
        phone: incomplete.phone,
        desc: "",
      }).toString()}`,
    );
    expect((await check.json()).customers[0].duplicated).toBe(false);
  });
});

async function postSend(
  request: APIRequestContext,
  fields: Record<string, string>,
) {
  const form = new URLSearchParams(fields);
  return request.post("/send/", {
    headers: { "content-type": "application/x-www-form-urlencoded" },
    data: form.toString(),
  });
}
