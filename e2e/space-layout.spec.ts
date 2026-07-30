// A members-only space leads with what you came to do, not with the roster.
//
// The roster used to sit directly under the header, above the actions and the
// listings, so on a 30-person space you scrolled past thirty names to reach the
// items. It now lives below the listings in a fixed-height box that scrolls.
//
// Both properties are asserted against the rendered page: document order, and the
// height cap. The cap matters more than today's overflow — six members fit inside
// it, thirty must not be allowed to push the page.
import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test("space page puts actions and listings above the member roster", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);

  const href = await page.locator('a[href^="/spaces/"]').first().getAttribute("href");
  expect(href, "test account is in no space, so this cannot be checked").toBeTruthy();
  await page.goto(href!);

  const share = page.locator('a[href*="/marketplace/new?space="]');
  await expect(share).toBeVisible();

  const order = await page.evaluate(() => {
    const action = document.querySelector('a[href*="/marketplace/new?space="]');
    const roster = Array.from(document.querySelectorAll("h2")).find((h) =>
      /Who.s in here/.test(h.textContent || "")
    );
    if (!action || !roster) return null;
    // DOCUMENT_POSITION_FOLLOWING means the roster comes after the action.
    return Boolean(action.compareDocumentPosition(roster) & Node.DOCUMENT_POSITION_FOLLOWING);
  });
  expect(order, "roster must render after the space actions").toBe(true);

  const box = await page.evaluate(() => {
    const h2 = Array.from(document.querySelectorAll("h2")).find((h) =>
      /Who.s in here/.test(h.textContent || "")
    );
    const div = h2?.parentElement?.querySelector("div.overflow-y-auto") as HTMLElement | null;
    if (!div) return null;
    const cs = getComputedStyle(div);
    return { clientH: div.clientHeight, overflowY: cs.overflowY, maxH: parseFloat(cs.maxHeight) };
  });
  expect(box, "roster is not inside a scrollable box").not.toBeNull();
  expect(box!.overflowY).toBe("auto");
  expect(box!.maxH).toBeLessThanOrEqual(120);
  expect(box!.clientH).toBeLessThanOrEqual(120);
});
