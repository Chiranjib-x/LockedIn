// Launch Gate #2 — refresh-after-mutation: a mutation updates the mounted view
// with no manual reload. We create a gate pickup as SETUP (a form redirect, not
// the behaviour under test), reload once so the row is deterministic, then
// Cancel it — Cancel uses useRefresh → router.refresh(), so the card must vanish
// with NO navigation (same URL). That in-place update is exactly Gate #2.
import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test("gate cancel removes the card in place, no reload", async ({ page }) => {
  await login(page);

  // --- setup: create a pickup, reload to a clean render ---
  await page.goto("/gate/new");
  await page.selectOption('select[name="platform"]', { index: 1 });
  const tag = "E2E-" + Date.now();
  await page.fill('input[name="item_desc"]', tag);
  await page.fill('input[name="drop_location"]', "E2E block");
  const dt = new Date(Date.now() + 3_600_000).toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
  await page.fill('input[name="expected_at"]', dt);
  await page.locator('main form button[type="submit"]').click();
  await page.waitForURL("**/gate", { timeout: 30_000 });
  await page.reload();

  const card = page.locator("div.animate-fade-up", { hasText: tag });
  await expect(card).toBeVisible();

  // --- under test: Cancel must update the mounted view in place ---
  const urlBefore = page.url();
  page.on("dialog", (d) => d.accept());
  await card.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByText(tag)).toHaveCount(0, { timeout: 10_000 });
  expect(page.url()).toBe(urlBefore); // refreshed in place, did not navigate
});
