// Launch Gate #5 — mobile 390px AND 360px: no horizontal overflow on any main
// route (moderator header overflow shipped once at 360px).
import { test, expect } from "@playwright/test";
import { login, MAIN_ROUTES } from "./helpers";

for (const width of [390, 360]) {
  test(`no horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await login(page);
    for (const route of MAIN_ROUTES) {
      await page.goto(route);
      await page.waitForLoadState("networkidle");
      const overflows = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
      );
      expect(overflows, `${route} overflows horizontally at ${width}px`).toBe(false);
    }
  });
}
