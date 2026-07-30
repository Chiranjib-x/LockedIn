// The growth loop: a student with no listings is asked for one, and the moment
// they post it they are handed a link that opens WITHOUT an account.
//
// Both halves matter. 124 of 143 students had never posted and there were 8 live
// listings, so the app read as empty to every new arrival; and the public preview
// pages existed but nothing in the app ever pointed anyone at them.
//
// Self-seeding: creates its own listing and deletes it, so it can run repeatedly.
import { test, expect } from "@playwright/test";
import { login } from "./helpers";

const TITLE = `ZZ Loop Probe ${Date.now()}`;

test("first-post prompt leads to a listing, which offers a public share link", async ({ page }) => {
  test.setTimeout(180_000);
  page.on("dialog", (d) => d.accept());
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);

  // The prompt only shows to someone with zero listings. The shared dev account
  // may already have some, so drive the flow directly rather than asserting it is
  // visible — the assertion that always holds is the inverse one, below.
  await page.goto("/marketplace/new");
  const form = page.locator("main form").first();
  await form.locator('input[name="title"]').fill(TITLE);
  await form.locator('input[name="price"]').fill("120");
  // category is required by the server action too — omitting it bounced the
  // submit back to /marketplace/new?error=… and the redirect never happened.
  await form.locator('select[name="category"]').selectOption("Other");
  await form.locator('button[type="submit"]').click();

  // Lands on the new listing, not on /marketplace/mine, and says so.
  await page.waitForURL((u) => /\/marketplace\/[0-9a-f-]{36}/.test(new URL(u).pathname), {
    timeout: 60_000,
  });
  expect(new URL(page.url()).searchParams.get("new")).toBe("1");
  await expect(page.getByText("Posted. Now get it seen.")).toBeVisible();

  // The offered link is the PUBLIC preview, which is what a non-user can open.
  const listingId = new URL(page.url()).pathname.split("/").pop()!;
  const res = await page.request.get(`/p/listing/${listingId}`);
  expect(res.status()).toBe(200);
  expect(await res.text()).toContain(TITLE);

  // Having posted, the home prompt must be gone — otherwise it becomes wallpaper.
  await page.goto("/home");
  await expect(page.getByText("Sell one thing you’re not using")).toHaveCount(0);

  // Clean up so the suite is repeatable and the marketplace is not polluted.
  // The delete control lives on /marketplace/mine, not on the listing page.
  await page.goto("/marketplace/mine");
  // The card is the innermost element holding BOTH this listing's heading and a
  // Delete button. Filtering on hasText alone matched every nested wrapper, and
  // .last() then landed on a node with no button inside it.
  const card = page
    .locator("div")
    .filter({ has: page.getByRole("heading", { name: TITLE }) })
    .filter({ has: page.getByRole("button", { name: "Delete", exact: true }) })
    .last();
  await card.getByRole("button", { name: "Delete", exact: true }).click();
  await expect
    .poll(
      async () => {
        await page.goto("/marketplace/mine");
        return page.getByText(TITLE).count();
      },
      { timeout: 30_000, message: `"${TITLE}" survived cleanup` }
    )
    .toBe(0);
});
