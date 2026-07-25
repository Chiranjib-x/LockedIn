import { type Page } from "@playwright/test";

export const EMAIL = "lockedin.phase1.test@gmail.com";
export const PASSWORD = "testpass1234";

// Log in as the Demo College test account. Selector scoped to `main` — the
// header carries a form whose submit matches `button[type=submit]` first.
export async function login(page: Page) {
  await page.goto("/login");
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASSWORD);
  await page.locator('main form button[type="submit"]').click();
  await page.waitForURL("**/home", { timeout: 45_000 });
}

// The authed list routes that must stay overflow-free and load without crashing.
export const MAIN_ROUTES = ["/home", "/marketplace", "/board", "/communities", "/events"];
