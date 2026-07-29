// A space card must carry ITS OWN description.
//
// Regression for the defect that shipped with migration 0084: the card chose its
// copy with `name.toLowerCase().includes("closet")`, so once Girls' Closet became
// Her Circle, both branches fell through to the men's line and a women-only space
// was labelled "boys only" on every member's home screen.
//
// Asserted against the rendered card rather than the string in the source, so it
// fails for a wrong description no matter where the wrong description comes from.
import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test("a members-only space card shows its own description, not another space's", async ({ page }) => {
  await login(page);

  const card = page.locator('a[href^="/spaces/"]').first();
  await expect(card).toBeVisible();

  const name = (await card.getByRole("heading").innerText()).trim();
  const body = (await card.locator("p").first().innerText()).trim();
  expect(body.length, `space card for "${name}" rendered no description`).toBeGreaterThan(0);

  // Whichever space this account is in, the card must not describe the other one.
  const saysWomen = /women-only/i.test(body);
  const saysMen = /\bmen-only/i.test(body) && !saysWomen;
  expect(saysWomen || saysMen, `card for "${name}" has no audience: ${body}`).toBe(true);

  if (/^her\b/i.test(name)) {
    expect(saysWomen, `"${name}" is described as men-only: ${body}`).toBe(true);
  }
  if (/^his\b/i.test(name)) {
    expect(saysMen, `"${name}" is described as women-only: ${body}`).toBe(true);
  }

  // The retired stereotype copy must not come back.
  await expect(page.getByText(/boys only|girls only|consoles, kits, gear/i)).toHaveCount(0);
});
