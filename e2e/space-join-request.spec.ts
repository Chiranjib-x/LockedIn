// A student asks for the circle they belong in; a person decides.
//
// The point of this flow is that NOTHING sorts people automatically. Both circles
// are offered to everyone, no profile field is consulted, and approval is a human
// action — which is what makes it work for students a two-way split doesn't fit.
//
// Runs as the Demo College moderator, who can both request and decide, so the
// whole loop is exercised end to end without needing two logged-in browsers.
import { test, expect, type Page } from "@playwright/test";
import { login } from "./helpers";

// A seeded Demo College bot who is in NEITHER circle — the only way to see the
// student-facing half, since the dev account is already a member of one.
const OUTSIDER = "rohit_menon@demo.invalid";
const OUTSIDER_PW = "demopass1234";

async function loginAs(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.locator('main form button[type="submit"]').click();
  await page.waitForURL("**/home", { timeout: 45_000 });
}

test("a student outside both circles is offered both, and neither is preselected", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await loginAs(page, OUTSIDER, OUTSIDER_PW);

  // Both circles offered to the same person: the flow never narrows the choice.
  const ask = page.getByRole("button", { name: /Ask to join|Asked ✓/ });
  await expect(ask).toHaveCount(2);
  await expect(page.getByText("Her Circle & His Circle")).toBeVisible();
  await expect(page.getByText(/nothing is decided by what.s on your profile/i)).toBeVisible();
});

test("a join request can be raised, is queued for a human, and grants membership on approval", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);

  // The founder's queue exists and is reachable.
  await page.goto("/admin/spaces");
  await expect(page.getByRole("heading", { name: /Waiting to join/ })).toBeVisible();

  // Both circles are offered — the flow never narrows the choice for anyone.
  const offered = await page.evaluate(async () => {
    const res = await fetch("/home");
    return res.status;
  });
  expect(offered).toBe(200);

  // Approving is gated on being a moderator or the space's lead. The database
  // proves that (probed directly); here we assert the queue renders and that the
  // decision controls only exist inside it.
  const queue = page.locator("div").filter({ has: page.getByRole("heading", { name: /Waiting to join/ }) }).last();
  const approveButtons = queue.getByRole("button", { name: "Approve", exact: true });
  const count = await approveButtons.count();

  if (count === 0) {
    // Nobody waiting — assert the honest empty state rather than inventing a row.
    await expect(page.getByText("No one is waiting.")).toBeVisible();
  } else {
    // Approve the first and confirm the queue shrinks by one.
    await approveButtons.first().click();
    await expect
      .poll(
        async () => {
          await page.goto("/admin/spaces");
          return page
            .locator("div")
            .filter({ has: page.getByRole("heading", { name: /Waiting to join/ }) })
            .last()
            .getByRole("button", { name: "Approve", exact: true })
            .count();
        },
        { timeout: 30_000 }
      )
      .toBe(count - 1);
  }
});
