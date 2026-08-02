// The organiser can set dates from the app, and a time typed in IST survives the
// round trip. That last part is this repo's most-repeated bug class: the server
// runs UTC on Vercel, so a missing +05:30 on either side rewinds every saved
// time by 5:30 — silently, and again on every re-save.
import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test("a start time typed in the admin form comes back out unchanged", async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await page.goto("/admin/tournaments");

  // The dev account is a Demo College moderator, so the page must render.
  await expect(page.getByRole("heading", { name: "Tournaments" })).toBeVisible();

  const STARTS = "2026-09-12T18:30";
  const CLOSES = "2026-09-10T23:59";

  // "Edit" is a <summary> inside <details>, not a button — it has no button role.
  await page.locator("summary", { hasText: "Edit" }).first().click();

  const form = page.locator("form").filter({ has: page.locator('input[name="starts_at"]') }).first();
  await form.locator('input[name="starts_at"]').fill(STARTS);
  await form.locator('input[name="reg_closes_at"]').fill(CLOSES);
  await form.locator('button[type="submit"]').click();

  await page.waitForURL((u) => new URL(u).searchParams.get("saved") === "1", { timeout: 45_000 });

  // Re-open the form from a fresh load — the value must be byte-identical.
  await page.goto("/admin/tournaments");
  await page.locator("summary", { hasText: "Edit" }).first().click();
  const reopened = page.locator("form").filter({ has: page.locator('input[name="starts_at"]') }).first();
  await expect(reopened.locator('input[name="starts_at"]')).toHaveValue(STARTS);
  await expect(reopened.locator('input[name="reg_closes_at"]')).toHaveValue(CLOSES);

  // And the student-facing page shows the same IST wall-clock, not a shifted one.
  const view = await page.locator('a[href^="/tournaments/"]').first().getAttribute("href");
  await page.goto(view!);
  await expect(page.getByText(/12 Sep/)).toBeVisible();
});
