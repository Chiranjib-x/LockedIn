// The Riot ID can be set AFTER joining, not only in the instant you join.
//
// join_tournament_team() (0090) takes an ign as an optional argument, so it could
// only ever be set at that one moment. Anyone who entered without it, typed it
// wrong, or changed their Riot tag was stuck — and the organiser cannot seed a
// bracket without it.
//
// The test joins WITHOUT an in-game name on purpose: that is the dead end this
// closes. It asserts persistence across a reload rather than the input echoing
// back, which is the difference between a write and a UI illusion.
import { test, expect } from "@playwright/test";
import { login } from "./helpers";
const D = "C:/Users/OMEN/AppData/Local/Temp/claude/c--Users-OMEN-Desktop-LockedIn/25ed6862-c5ea-4502-9bfc-1cef1c38fa67/scratchpad";
test("riot id can be set after joining, not only while joining", async ({ page }) => {
  test.setTimeout(180_000);
  page.on("dialog", (d) => d.accept());
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  const href = (await page.locator('a[href^="/tournaments/"]').first().getAttribute("href"))!;
  await page.goto(href);
  await page.waitForLoadState("networkidle").catch(() => {});

  // Reset to a not-entered state first. A previous run leaves the account in the
  // tournament, and the second run then found no Join button and hung — the test
  // has to establish its own starting conditions, not inherit them.
  const leaveFirst = page.getByRole("button", { name: /Leave/i }).first();
  if (await leaveFirst.count()) {
    await leaveFirst.click();
    await expect(page.getByRole("button", { name: "Join", exact: true }).first())
      .toBeVisible({ timeout: 20000 });
  }

  // Join WITHOUT giving an in-game name — the exact case that used to be a dead end.
  await page.getByRole("button", { name: "Join", exact: true }).first().click();
  const panel = page.locator("div").filter({ hasText: /^Your (Riot ID|in-game name)/ }).last();
  await expect(panel).toBeVisible({ timeout: 20000 });
  console.log("PANEL_APPEARS_AFTER_JOIN=yes");

  const field = panel.getByRole("textbox");
  await expect(field).toHaveValue("");
  const val = "Probe#" + Date.now().toString().slice(-4);
  await field.fill(val);
  await panel.getByRole("button", { name: /Save|Update/ }).click();

  // Survives a reload — the difference between a UI echo and a write.
  await expect.poll(async () => {
    await page.goto(href);
    return page.locator("div").filter({ hasText: /^Your (Riot ID|in-game name)/ }).last()
      .getByRole("textbox").inputValue();
  }, { timeout: 30000 }).toBe(val);
  console.log("PERSISTED=" + val);

  // And the organiser sees it in the roster.
  await expect(page.getByText(val, { exact: false }).first()).toBeVisible();
  console.log("SHOWS_IN_ROSTER=yes");
  await page.screenshot({ path: `${D}/ign.png` });

  // Leave, so the suite is repeatable.
  const leave = page.getByRole("button", { name: /Leave/i }).first();
  if (await leave.count()) await leave.click();
});
