import { test, expect, type Page } from "@playwright/test";
import { login } from "./helpers";

// QUEUE A34: an event can name a campus building, and the event page deep-links
// into VIT Compass at that pin. Self-seeding through the UI — creates its own
// building and event, then deletes the building, so it survives U10 cleanup.
const STAMP = Date.now();
const BUILDING = `ZZ Venue Hall ${STAMP}`;
const EVENT = `ZZ Gravitas Probe ${STAMP}`;

async function addBuilding(page: Page) {
  await page.goto("/admin/campus");
  const form = page.locator("main form").first();
  await form.getByLabel("Building name").fill(BUILDING);
  await form.getByLabel("Latitude").fill("12.9711");
  await form.getByLabel("Longitude").fill("79.1592");
  await form.locator('button[type="submit"]').click();
  await expect(page.locator("div.bg-card").filter({ hasText: BUILDING })).toBeVisible({ timeout: 30_000 });
}

test("an event can point at a campus building", async ({ page }) => {
  test.setTimeout(180_000);
  page.on("dialog", (d) => d.accept());
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await addBuilding(page);

  await page.goto("/events/new");
  const form = page.locator("main form").first();
  await form.getByLabel("Title").fill(EVENT);
  await form.locator('input[name="event_date"]').fill("2026-12-01T18:00");
  const select = form.locator('select[name="building_id"]');
  await expect(select).toBeVisible({ timeout: 15_000 });
  await select.selectOption({ label: BUILDING });
  await form.locator('button[type="submit"]').click();
  // Wait for the exact destination. A regex like /\/events/ also matches
  // /events/new, so it passed instantly and the follow-up reload cancelled the
  // in-flight submit — the event never got posted.
  await page.waitForURL((u) => new URL(u).pathname === "/events", { timeout: 30_000 });
  await page.waitForLoadState("networkidle").catch(() => {});


  const card = page.locator("main a").filter({ hasText: EVENT }).first();
  await expect(card).toBeVisible({ timeout: 30_000 });
  await card.click();

  const mapLink = page.locator('main a[href*="/?b="]');
  await expect(mapLink).toBeVisible({ timeout: 30_000 });
  const href = await mapLink.getAttribute("href");
  expect(href).toMatch(/\/\?b=[0-9a-f-]{36}$/);

  await page.goto("/admin/campus");
  await page.locator("div.bg-card").filter({ hasText: BUILDING }).getByRole("button", { name: "Delete" }).click();
  await expect(page.locator("div.bg-card").filter({ hasText: BUILDING })).toHaveCount(0, { timeout: 30_000 });
});
