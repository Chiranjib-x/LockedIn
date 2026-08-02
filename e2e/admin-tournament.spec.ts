// The organiser can set dates from the app, and a time typed in IST survives the
// round trip. That is this repo's most-repeated bug class: the server runs UTC on
// Vercel, so a missing +05:30 on either side rewinds every saved time by 5:30 —
// silently, and again on every re-save.
//
// SELF-SEEDING. The first version edited whichever tournament happened to be
// listed first, so every suite run rewrote the REAL one's dates to the test's
// values — caught when the home banner showed 12 Sept for a tournament set to
// 3 Aug. It creates and deletes its own now. Delete is permitted only while
// nobody has entered, which is exactly true of a throwaway.
import { test, expect } from "@playwright/test";
import { login } from "./helpers";

const TITLE = `ZZ Date Probe ${Date.now()}`;
const STARTS = "2026-09-12T18:30";
const CLOSES = "2026-09-10T23:59";

test("a start time typed in the admin form comes back out unchanged", async ({ page }) => {
  test.setTimeout(180_000);
  page.on("dialog", (d) => d.accept());
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await page.goto("/admin/tournaments");
  await expect(page.getByRole("heading", { name: "Tournaments" })).toBeVisible();

  // Draft, so a throwaway can never reach the home banner.
  await page.locator("summary", { hasText: /New tournament|Create the first/ }).first().click();
  const create = page.locator("form").filter({ has: page.locator('input[name="title"]') }).last();
  await create.locator('input[name="game"]').fill("Chess");
  await create.locator('input[name="title"]').fill(TITLE);
  await create.locator('input[name="team_size"]').fill("1");
  await create.locator('input[name="starts_at"]').fill(STARTS);
  await create.locator('input[name="reg_closes_at"]').fill(CLOSES);
  await create.locator('select[name="status"]').selectOption("draft");
  await create.locator('button[type="submit"]').click();
  await page.waitForURL((u) => new URL(u).searchParams.get("saved") === "1", { timeout: 45_000 });

  // Re-open from a fresh load — the values must be byte-identical.
  await page.goto("/admin/tournaments");
  const card = page.locator("section").filter({ hasText: TITLE }).first();
  await card.locator("summary", { hasText: "Edit" }).click();
  const form = card.locator("form");
  await expect(form.locator('input[name="starts_at"]')).toHaveValue(STARTS);
  await expect(form.locator('input[name="reg_closes_at"]')).toHaveValue(CLOSES);

  // Clean up. Nobody has entered, so delete is permitted.
  await card.getByRole("button", { name: "Delete" }).click();
  await expect
    .poll(
      async () => {
        await page.goto("/admin/tournaments");
        return page.getByText(TITLE).count();
      },
      { timeout: 30_000, message: `"${TITLE}" survived cleanup` }
    )
    .toBe(0);
});
