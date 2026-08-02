// A tournament is the distribution mechanism, so the load-bearing property is
// that its link works on someone with NO account. Both halves are asserted here:
// the banner reaches the page, and the public preview opens logged out.
import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test("featured tournament banners on home, and its public link opens without an account", async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);

  const banner = page.locator('a[href^="/tournaments/"]').first();
  await expect(banner).toBeVisible({ timeout: 30_000 });
  const href = await banner.getAttribute("href");
  const id = href!.split("/").pop()!;

  await banner.click();
  await page.waitForURL((u) => new URL(u).pathname === `/tournaments/${id}`, { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: /Valorant Cup/i })).toBeVisible();

  // The share link must be the PUBLIC path, not the gated page.
  const publicRes = await page.request.get(`/p/tournament/${id}`);
  expect(publicRes.status()).toBe(200);
  const body = await publicRes.text();
  expect(body).toContain("Valorant Cup");
  expect(body).toContain("college email");
});

test("a stranger sees the tournament but not who entered", async ({ browser }) => {
  test.setTimeout(180_000);
  const IGN = `ZZProbe#${Date.now().toString().slice(-4)}`;
  const TEAM = `ZZ Probe Squad ${Date.now()}`;

  const logged = await browser.newContext();
  const lp = await logged.newPage();
  await lp.setViewportSize({ width: 390, height: 844 });
  await login(lp);
  const href = await lp.locator('a[href^="/tournaments/"]').first().getAttribute("href");
  const id = href!.split("/").pop()!;
  await lp.goto(href!);

  // Enter, so there is a roster to leak in the first place. An assertion that
  // nothing leaked from an empty tournament would pass for the wrong reason.
  const already = await lp.getByText("You’re in —").count();
  if (already === 0) {
    await lp.getByPlaceholder(/Block C Rejects|your handle/).fill(TEAM);
    await lp.getByPlaceholder(/Chiru#/).fill(IGN);
    await lp.getByRole("button", { name: /Create the team|^Enter$/ }).click();
    await expect(lp.getByText("You’re in —")).toBeVisible({ timeout: 30_000 });
  }

  // A brand-new context: no cookies, no session — a WhatsApp recipient.
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.setViewportSize({ width: 390, height: 844 });
  const res = await page.goto(`/p/tournament/${id}`);
  expect(res?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: /Valorant Cup/i })).toBeVisible();

  const body = await page.content();
  expect(body, "an entrant's in-game name reached a logged-out visitor").not.toContain(IGN);
  expect(body, "a team name reached a logged-out visitor").not.toContain(TEAM);
  await ctx.close();

  // Withdraw, so the suite is repeatable.
  if (already === 0) {
    await lp.goto(href!);
    await lp.getByRole("button", { name: /Withdraw the team|Leave the team/ }).click();
    await expect(lp.getByText("You’re in —")).toHaveCount(0, { timeout: 30_000 });
  }
  await logged.close();
});
