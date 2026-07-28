import { test, expect, type Page } from "@playwright/test";
import { login } from "./helpers";

// QUEUE A35. A16 did this pass for gaterunner + vitcompass; the mother app and
// its two forks were never done. Measured 43 sub-44px controls before the fix —
// the two worst were in the header, so they appeared on EVERY route.
const ROUTES = ["/home", "/marketplace", "/board", "/communities", "/profile", "/search"];

async function subFortyFour(page: Page) {
  return page.evaluate(() => {
    const bad: string[] = [];
    document.querySelectorAll("button, a, select, [role=switch]").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return; // not rendered
      if (getComputedStyle(el as HTMLElement).display === "none") return;
      if (r.height < 44 || r.width < 44) {
        const t = (el.textContent || (el as HTMLElement).getAttribute("aria-label") || el.tagName)
          .replace(/\s+/g, " ").trim().slice(0, 30);
        bad.push(`${t}=${Math.round(r.width)}x${Math.round(r.height)}`);
      }
    });
    return bad;
  });
}

for (const width of [390, 360]) {
  test(`every tap target is at least 44px at ${width}px`, async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width, height: width === 390 ? 844 : 800 });
    await login(page);
    for (const route of ROUTES) {
      await page.goto(route);
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.waitForTimeout(1000);
      const bad = await subFortyFour(page);
      expect(bad, `${route} @ ${width}px has sub-44px targets`).toEqual([]);
    }
  });
}
