// Light is the default, even for a student whose phone is in dark mode.
//
// The pre-paint script used to fall back to prefers-color-scheme, so a dark-mode
// device landed in dark without the user ever choosing it. Asserted with the
// browser emulating dark, because that is the case that regressed.
import { test, expect } from "@playwright/test";

test.use({ colorScheme: "dark" });

test("a dark-mode device with no saved choice still gets light", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  const stored = await page.evaluate(() => localStorage.getItem("li-theme"));
  expect(stored, "nothing should be stored until the user chooses").toBeNull();
});

test("an explicit dark choice is honoured, and system still follows the OS", async ({ page }) => {
  await page.goto("/login");

  await page.evaluate(() => localStorage.setItem("li-theme", "dark"));
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);

  // "system" is now a stored value, not the absence of one.
  await page.evaluate(() => localStorage.setItem("li-theme", "system"));
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/); // colorScheme is dark

  await page.evaluate(() => localStorage.setItem("li-theme", "light"));
  await page.reload();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
});
