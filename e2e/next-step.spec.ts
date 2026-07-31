// LIVELY L7 / QUEUE A38 — after posting, exactly ONE suggestion, and only for
// something the student genuinely has not done.
//
// The single-suggestion rule is the whole point: a list of things you could try
// is a tour, and a tour is what people close. This asserts the count, not the
// wording, so the copy can change without the guarantee changing.
//
// Self-seeding: creates its own listing and deletes it.
import { test, expect } from "@playwright/test";
import { login } from "./helpers";

const TITLE = `ZZ NextStep Probe ${Date.now()}`;

const SUGGESTIONS = [
  "Ask to join your circle",
  "Add your timetable",
  "Find your club",
];

test("a fresh listing offers at most one next step, never a menu", async ({ page }) => {
  test.setTimeout(180_000);
  page.on("dialog", (d) => d.accept());
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);

  await page.goto("/marketplace/new");
  const form = page.locator("main form").first();
  await form.locator('input[name="title"]').fill(TITLE);
  await form.locator('input[name="price"]').fill("90");
  await form.locator('select[name="category"]').selectOption("Other");
  await form.locator('button[type="submit"]').click();

  await page.waitForURL((u) => /\/marketplace\/[0-9a-f-]{36}/.test(new URL(u).pathname), {
    timeout: 60_000,
  });
  const listingId = new URL(page.url()).pathname.split("/").pop()!;

  // At most one suggestion is visible — zero is valid (nothing left to suggest).
  let shown = 0;
  for (const s of SUGGESTIONS) {
    shown += await page.getByText(s, { exact: true }).count();
  }
  expect(shown, `expected 0 or 1 suggestion, saw ${shown}`).toBeLessThanOrEqual(1);

  // Whichever is shown must be genuinely undone: the dev account IS in a circle,
  // so "Ask to join your circle" must never be the one offered to it.
  await expect(page.getByText("Ask to join your circle", { exact: true })).toHaveCount(0);

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
  void listingId;
});
