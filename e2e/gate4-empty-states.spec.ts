// Launch Gate #4 — intentional empty states, no blank screens. A no-match
// search is the empty state any account can reach deterministically.
import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test("no-match search shows an intentional empty state", async ({ page }) => {
  await login(page);
  const gibberish = "zzqqxxplt" + Date.now();
  await page.goto(`/search?q=${gibberish}`);
  await expect(page.getByText(/nothing on campus for/i)).toBeVisible();
});
