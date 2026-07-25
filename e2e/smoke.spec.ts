import { test, expect } from "@playwright/test";

// QUEUE A1 — mother-app smoke: login, the two main list routes, logout. These
// are the flows that regress most. Selectors are scoped to `main`: the header
// has a form whose submit button matches `button[type=submit]` first (this has
// bitten twice — see STATE.md ## Failed attempts).
const EMAIL = "lockedin.phase1.test@gmail.com";
const PASSWORD = "testpass1234";

test("mother app smoke: login → marketplace → board → logout", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASSWORD);
  await page.locator('main form button[type="submit"]').click();
  await page.waitForURL("**/home", { timeout: 45_000 });

  await page.goto("/marketplace");
  await expect(page.getByRole("heading", { name: "Marketplace" })).toBeVisible();

  await page.goto("/board");
  await expect(page.getByRole("heading", { name: "Campus board" })).toBeVisible();

  await page.goto("/profile");
  await page.getByRole("button", { name: "Log out" }).click();
  await page.waitForURL("**/login", { timeout: 20_000 });
});
