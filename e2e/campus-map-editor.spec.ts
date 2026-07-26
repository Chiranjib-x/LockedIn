import { test, expect, type Page } from "@playwright/test";
import { login } from "./helpers";

// Drag-to-position admin for the campus map (QUEUE U7 interface fix).
//
// Self-seeding: the spec creates its own buildings through the admin form and
// deletes them, so it does not depend on any college already having buildings —
// it stays green after the U10 launch-day data cleanup wipes the Demo College
// seed data.
//
// It seeds TWO buildings on purpose. Deleting the only building empties the list
// and unmounts the whole map section, which makes the deletion look like it
// worked no matter what. With a second building still present the section stays
// mounted, so this actually catches the bug it is here for: the editor holding
// stale state after router.refresh() and leaving a deleted building's pin on the
// map.
const STAMP = Date.now();
const KEEP = `ZZ E2E Keep ${STAMP}`;
const DROP = `ZZ E2E Drop ${STAMP}`;

async function addBuilding(page: Page, name: string, lat: string, lng: string) {
  const form = page.locator("main form").first();
  await form.getByLabel("Building name").fill(name);
  await form.getByLabel("Latitude").fill(lat);
  await form.getByLabel("Longitude").fill(lng);
  await form.locator('button[type="submit"]').click();
  // NOT waitForURL: saveBuilding redirects back to /admin/campus, so the pattern
  // already matches and the wait resolves instantly — the next add would then
  // race the in-flight navigation and lose its form fill. Wait for the real
  // post-condition instead.
  await expect(page.locator("div.bg-card").filter({ hasText: name })).toBeVisible({
    timeout: 30_000,
  });
}

async function deleteBuilding(page: Page, name: string) {
  // Scope to the card row, not any div containing the name — the marker pill on
  // the map is also a div carrying the building name.
  const row = page.locator("div.bg-card").filter({ hasText: name });
  await row.getByRole("button", { name: "Delete" }).click();
}

test("moderator can position campus pins, and deleting one removes its pin", async ({ page }) => {
  // The delete button goes through confirm(); the handler must be registered
  // before any click or Playwright auto-dismisses it (this has bitten here).
  page.on("dialog", (d) => d.accept());

  await login(page);
  await page.goto("/admin/campus");
  await expect(page.getByRole("heading", { name: "Campus map" })).toBeVisible();

  await addBuilding(page, KEEP, "12.9711", "79.1592");
  await addBuilding(page, DROP, "12.9695", "79.1570");

  // --- the editor mounts and renders both pins ---
  await expect(page.getByRole("heading", { name: "Position the pins" })).toBeVisible();
  // maplibre draws into a canvas; its presence at a real size proves the map
  // mounted rather than the container collapsing to zero height (a bug this map
  // has had before).
  const canvas = page.locator(".maplibregl-canvas");
  await expect(canvas).toBeVisible({ timeout: 30_000 });
  const box = await canvas.boundingBox();
  expect(box, "map canvas must have a real size").not.toBeNull();
  expect(box!.height).toBeGreaterThan(300);

  await expect(page.locator(".maplibregl-marker", { hasText: KEEP })).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(".maplibregl-marker", { hasText: DROP })).toBeVisible({ timeout: 30_000 });

  // Freshly seeded pins are unconfirmed estimates until a human places them.
  await expect(page.getByText(/still to check/)).toBeVisible();

  // --- deleting one drops its pin and leaves the other alone ---
  await deleteBuilding(page, DROP);
  await expect(page.locator(".maplibregl-marker", { hasText: DROP })).toHaveCount(0, {
    timeout: 30_000,
  });
  await expect(page.locator(".maplibregl-marker", { hasText: KEEP })).toBeVisible();

  // --- clean up ---
  await deleteBuilding(page, KEEP);
  await expect(page.locator("div.bg-card").filter({ hasText: KEEP })).toHaveCount(0, {
    timeout: 30_000,
  });
});
