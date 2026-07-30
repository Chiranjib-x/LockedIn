// Gender on the profile: optional, self-describable, and clearable.
//
// The clearing case is the one worth locking in — a picker that cannot be
// un-answered traps someone in whatever they tapped first.
import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test("gender can be set from a preset, self-described, and cleared again", async ({ page }) => {
  await login(page);
  await page.goto("/profile");

  const hidden = page.locator('input[name="gender"]');
  await expect(hidden).toHaveCount(1);

  // Preset
  await page.getByRole("button", { name: "Non-binary", exact: true }).click();
  await expect(hidden).toHaveValue("Non-binary");

  // Tapping the active chip clears it — nobody is stuck with a first tap.
  await page.getByRole("button", { name: "Non-binary", exact: true }).click();
  await expect(hidden).toHaveValue("");

  // Self-describe writes free text through
  await page.getByRole("button", { name: "Self-describe", exact: true }).click();
  const box = page.getByLabel("Describe your gender");
  await expect(box).toBeVisible();
  await box.fill("Genderfluid");
  await expect(hidden).toHaveValue("Genderfluid");

  // Persists across a save + reload. `?saved=1` is the signal the write landed —
  // waitForURL(/\/profile/) matches the page we are already on, so it returns
  // instantly and the test can run ahead of the server action.
  await page.locator('main form button[type="submit"]').first().click();
  await page.waitForURL((u) => new URL(u).searchParams.get("saved") === "1", { timeout: 30_000 });
  await expect(page.getByRole("button", { name: "Self-describe", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("Describe your gender")).toHaveValue("Genderfluid");

  // Leave the account as it was found, and PROVE it — an unverified cleanup left
  // "Genderfluid" on the test profile, which is how this was noticed.
  await page.getByRole("button", { name: "Self-describe", exact: true }).click();
  await expect(hidden).toHaveValue("");
  await page.locator('main form button[type="submit"]').first().click();

  // Re-fetch until the cleared value is what the server actually returns.
  // Waiting on ?saved=1 does NOT work for the second save: the URL is already
  // ?saved=1 from the first one, so the wait matches instantly and the reload
  // races the write. Poll the rendered value, which only one of the two states
  // can satisfy.
  await expect
    .poll(
      async () => {
        await page.goto("/profile");
        return page.locator('input[name="gender"]').inputValue();
      },
      { timeout: 30_000, message: "gender did not clear" }
    )
    .toBe("");
});
