// Once a pickup is claimed, the two people on it can message each other about
// the item. Before that they cannot: an unclaimed pickup has no counterparty, so
// its id must not become a way to reach whoever posted it.
//
// Both halves are driven through the real UI with two separate sessions, because
// the interesting property is who is allowed to talk to whom, and that is only
// true when a second person actually claims.
import { test, expect } from "@playwright/test";
import { login } from "./helpers";

const ITEM = `ZZ Chat Probe ${Date.now()}`;
const RUNNER = { email: "rohit_menon@demo.invalid", password: "demopass1234" };

test("the two people on a claimed pickup can message about it", async ({ browser }) => {
  test.setTimeout(240_000);

  // Requester posts a pickup.
  const reqCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const req = await reqCtx.newPage();
  req.on("dialog", (d) => d.accept());
  await login(req);
  await req.goto("/gate/new");
  const form = req.locator("main form").first();
  // platform is a <select>, not an input.
  await form.locator('select[name="platform"]').selectOption({ index: 1 });
  await form.locator('input[name="item_desc"]').fill(ITEM);
  await form.locator('input[name="drop_location"]').fill("K Block");
  await form.locator('input[name="expected_at"]').fill("2026-12-01T18:00");
  await form.locator('button[type="submit"]').click();
  await req.waitForURL((u) => new URL(u).pathname === "/gate", { timeout: 45_000 });

  // No counterparty yet, so no message button on an unclaimed pickup.
  const unclaimedCard = req.locator("div").filter({ hasText: ITEM }).last();
  await expect(unclaimedCard.getByRole("button", { name: /Message/ })).toHaveCount(0);

  // A second student claims it.
  const runCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const run = await runCtx.newPage();
  run.on("dialog", (d) => d.accept());
  await run.goto("/login");
  await run.fill('input[name="email"]', RUNNER.email);
  await run.fill('input[name="password"]', RUNNER.password);
  await run.locator('main form button[type="submit"]').click();
  await run.waitForURL("**/home", { timeout: 45_000 });
  await run.goto("/gate");
  const open = run.locator("div").filter({ hasText: ITEM }).last();
  // Labels use a curly apostrophe ("I'll", "I'm"), so match on the plain words.
  // Claiming is two steps: the button opens a UPI panel, then confirms.
  await open.getByRole("button", { name: /grab it/i }).first().click();
  await run.getByRole("button", { name: /going to the gate/i }).first().click();

  // The runner can now message the requester about the item.
  await expect
    .poll(async () => {
      await run.goto("/gate");
      return run.getByRole("button", { name: /Message/ }).count();
    }, { timeout: 30_000, message: "runner got no Message button after claiming" })
    .toBeGreaterThan(0);

  await run.getByRole("button", { name: /Message/ }).first().click();
  await run.waitForURL((u) => new URL(u).pathname.startsWith("/chats/"), { timeout: 45_000 });
  // The composer is an unnamed input; it sends on Enter.
  await run.getByPlaceholder("Message…").fill("Which counter is it at?");
  await run.getByPlaceholder("Message…").press("Enter");
  await expect(run.getByText("Which counter is it at?")).toBeVisible({ timeout: 30_000 });

  // And the requester sees it — the thread reaches the right person.
  await expect
    .poll(async () => {
      await req.goto("/chats");
      return req.getByText("Which counter is it at?").count();
    }, { timeout: 30_000, message: "the message never reached the requester" })
    .toBeGreaterThan(0);

  // Clean up. A claimed pickup has NO Cancel control — RequesterActions only
  // renders it while status is "open" — so the first version silently cleaned
  // nothing and left a row per run, which then made .last() ambiguous and broke
  // the next run. The runner hands it back first, then the requester cancels.
  await run.goto("/gate");
  const claimedCard = run.locator("div").filter({ hasText: ITEM }).last();
  await claimedCard.getByRole("button", { name: /Can.t make it/i }).first().click();

  await expect
    .poll(async () => {
      await req.goto("/gate");
      const card = req.locator("div").filter({ hasText: ITEM }).last();
      return card.getByRole("button", { name: /^Cancel$/ }).count();
    }, { timeout: 30_000, message: "pickup never returned to open, so it cannot be cancelled" })
    .toBeGreaterThan(0);

  await req.locator("div").filter({ hasText: ITEM }).last()
    .getByRole("button", { name: /^Cancel$/ }).first().click();

  await expect
    .poll(async () => {
      await req.goto("/gate");
      return req.getByText(ITEM).count();
    }, { timeout: 30_000, message: `"${ITEM}" survived cleanup` })
    .toBe(0);

  await reqCtx.close();
  await runCtx.close();
});
