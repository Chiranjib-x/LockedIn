// The Toolbox is a curated list, so the two things worth locking in are that it
// renders grouped (a flat wall of 30+ links is a list nobody reads) and that the
// count on /home matches what /toolbox actually contains — a badge that drifts
// from reality is worse than no badge.
import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test("toolbox renders grouped, and home's count matches its real size", async ({ page }) => {
  await login(page);

  // Read the number the home card advertises.
  const card = page.locator('a[href="/toolbox"]').first();
  await expect(card).toBeVisible();
  const badge = await card.locator("span").filter({ hasText: /^\d+$/ }).first().innerText();
  const advertised = Number(badge.trim());
  expect(advertised).toBeGreaterThan(0);

  await page.goto("/toolbox");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Toolbox");

  // Every tool is an external link opening in a new tab.
  const tools = page.locator('main a[target="_blank"]');
  await expect(tools).toHaveCount(advertised);

  // Grouped under section headings, not one flat list.
  const sections = page.locator("main section");
  expect(await sections.count()).toBeGreaterThan(1);

  // Curated order: papers and courses come before assets and privacy.
  const headings = await page.locator("main section h2").allInnerTexts();
  expect(headings[0]).toContain("Academic papers");
  expect(headings.some((h) => h.includes("Courses"))).toBe(true);

  // Spot-check that real resources actually made it in.
  for (const name of ["Unpaywall", "MIT OpenCourseWare", "Bitwarden"]) {
    await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  }
});
