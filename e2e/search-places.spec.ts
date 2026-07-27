import { test, expect, type Page } from "@playwright/test";
import { login } from "./helpers";

// POLISH J2-1: searching a building name used to answer "Nothing on campus",
// while the DB held 48 verified buildings. Global search now resolves places and
// hands off to VIT Compass.
//
// Self-seeding through the admin CMS, like campus-map-editor.spec.ts — it does
// not depend on any college already having buildings, so it stays green after
// the U10 launch-day data cleanup.
const STAMP = Date.now();
const NAME = `ZZ Search Hall ${STAMP}`;
const AKA = `ZZSH${STAMP}`;

async function addBuilding(page: Page) {
  await page.goto("/admin/campus");
  const form = page.locator("main form").first();
  await form.getByLabel("Building name").fill(NAME);
  await form.getByLabel("AKA / nickname (optional)").fill(AKA);
  await form.getByLabel("Latitude").fill("12.9711");
  await form.getByLabel("Longitude").fill("79.1592");
  await form.locator('button[type="submit"]').click();
  await expect(page.locator("div.bg-card").filter({ hasText: NAME })).toBeVisible({
    timeout: 30_000,
  });
}

test("global search finds a campus building by name and by nickname", async ({ page }) => {
  test.setTimeout(120_000);
  page.on("dialog", (d) => d.accept());
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await addBuilding(page);

  // by full name
  await page.goto(`/search?q=${encodeURIComponent(NAME)}`);
  await expect(page.getByRole("heading", { name: "Places on campus" })).toBeVisible({
    timeout: 30_000,
  });
  const mapLink = page.locator(`main a[href*="/?b="]`).first();
  await expect(mapLink).toBeVisible();

  // by nickname — students say "SJT", never "Silver Jubilee Tower"
  await page.goto(`/search?q=${encodeURIComponent(AKA)}`);
  await expect(page.getByRole("heading", { name: "Places on campus" })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.locator("main").getByText(NAME, { exact: false })).toBeVisible();

  // clean up
  await page.goto("/admin/campus");
  const row = page.locator("div.bg-card").filter({ hasText: NAME });
  await row.getByRole("button", { name: "Delete" }).click();
  await expect(page.locator("div.bg-card").filter({ hasText: NAME })).toHaveCount(0, {
    timeout: 30_000,
  });
});
