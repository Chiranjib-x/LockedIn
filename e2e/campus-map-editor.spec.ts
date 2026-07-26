import { test, expect } from "@playwright/test";
import { login } from "./helpers";

// Drag-to-position admin for the campus map (QUEUE U7 interface fix).
//
// Self-seeding: the spec creates its own building through the admin form and
// deletes it at the end, so it does not depend on any college already having
// buildings — it stays green after the U10 launch-day data cleanup wipes the
// Demo College seed data.
const NAME = `ZZ E2E Pin ${Date.now()}`;

test("moderator can position a campus pin on the map", async ({ page }) => {
  await login(page);
  await page.goto("/admin/campus");
  await expect(page.getByRole("heading", { name: "Campus map" })).toBeVisible();

  // --- seed one building, with coordinates so it lands on the map ---
  const form = page.locator("main form").first();
  await form.getByLabel("Building name").fill(NAME);
  await form.getByLabel("Latitude").fill("12.9711");
  await form.getByLabel("Longitude").fill("79.1592");
  await form.locator('button[type="submit"]').click();
  await page.waitForURL("**/admin/campus", { timeout: 30_000 });

  // --- the editor appears and renders the pin ---
  await expect(page.getByRole("heading", { name: "Position the pins" })).toBeVisible();
  // maplibre draws into a canvas; its presence proves the map actually mounted
  // rather than the container collapsing to zero height (a bug this map has had).
  const canvas = page.locator(".maplibregl-canvas");
  await expect(canvas).toBeVisible({ timeout: 30_000 });
  const box = await canvas.boundingBox();
  expect(box, "map canvas must have a real size").not.toBeNull();
  expect(box!.height).toBeGreaterThan(300);

  // The marker is an imperative DOM pill carrying the building name.
  const marker = page.locator(".maplibregl-marker", { hasText: NAME });
  await expect(marker).toBeVisible({ timeout: 30_000 });

  // A freshly seeded pin is an unconfirmed estimate until a human places it.
  await expect(page.getByText(/still to check/)).toBeVisible();

  // --- clean up: delete via the row's Delete button ---
  // The dialog handler MUST be registered before the click — Playwright
  // auto-dismisses confirm() otherwise (this has bitten in this repo before).
  page.on("dialog", (d) => d.accept());
  // Scope to the card row, not any div containing the name — the marker pill on
  // the map is also a div carrying the building name.
  const row = page.locator("div.bg-card").filter({ hasText: NAME });
  await row.getByRole("button", { name: "Delete" }).click();
  await expect(page.locator(".maplibregl-marker", { hasText: NAME })).toHaveCount(0, {
    timeout: 30_000,
  });
});
