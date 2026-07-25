// Launch Gate #8 — unknown routes 404 gracefully (no crash, no redirect loop).
import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test("unknown route returns a 404", async ({ page }) => {
  // Logged in, so middleware passes through to Next's not-found (an unauthed
  // bogus route would redirect to /login instead of 404ing).
  await login(page);
  const res = await page.goto("/this-route-does-not-exist-zzz");
  expect(res?.status()).toBe(404);
});
