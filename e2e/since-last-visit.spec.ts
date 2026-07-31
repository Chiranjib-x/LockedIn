// LIVELY L11 / QUEUE A40 — "since you were last here" must be true in both
// directions: it appears when something really happened while you were away, and
// it stays silent when nothing did.
//
// The silent case is the one worth guarding. touch_last_seen() (0089) returns the
// PREVIOUS visit and then advances; if that order were reversed the comparison
// would always be against "now" and this line would render empty forever while
// looking fine in code review.
import { test, expect } from "@playwright/test";
import { login } from "./helpers";

const TITLE = `ZZ Since Probe ${Date.now()}`;
const LINE = /Since you were last here/i;

test("the since-last-visit line reflects what actually changed", async ({ page }) => {
  test.setTimeout(180_000);
  page.on("dialog", (d) => d.accept());
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);

  // Visit once to establish a baseline, then visit again immediately. Nothing
  // happened in between, so the line must NOT appear.
  await page.goto("/home");
  await page.goto("/home");
  await expect(page.getByText(LINE)).toHaveCount(0);

  // Now create something, then come back.
  await page.goto("/marketplace/new");
  const form = page.locator("main form").first();
  await form.locator('input[name="title"]').fill(TITLE);
  await form.locator('input[name="price"]').fill("70");
  await form.locator('select[name="category"]').selectOption("Other");
  await form.locator('button[type="submit"]').click();
  await page.waitForURL((u) => /\/marketplace\/[0-9a-f-]{36}/.test(new URL(u).pathname), {
    timeout: 60_000,
  });

  await page.goto("/home");
  await expect(page.getByText(LINE)).toHaveCount(1);
  await expect(page.getByText(/new listing/i)).toBeVisible();

  // And it clears itself: the visit above advanced the window, so a second look
  // with nothing new in between must be silent again.
  await page.goto("/home");
  await expect(page.getByText(LINE)).toHaveCount(0);

  // Clean up.
  await page.goto("/marketplace/mine");
  const card = page
    .locator("div")
    .filter({ has: page.getByRole("heading", { name: TITLE }) })
    .filter({ has: page.getByRole("button", { name: "Delete", exact: true }) })
    .last();
  await card.getByRole("button", { name: "Delete", exact: true }).click();
  await expect
    .poll(async () => {
      await page.goto("/marketplace/mine");
      return page.getByText(TITLE).count();
    }, { timeout: 30_000, message: `"${TITLE}" survived cleanup` })
    .toBe(0);
});
