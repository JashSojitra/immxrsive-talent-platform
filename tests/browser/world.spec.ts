import { expect, test } from "@playwright/test";

test("/world opens the 3D intro (or the list fallback when WebGL is unavailable)", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/world");
  const enter = page.getByRole("button", { name: "Enter the world" });
  const listHeading = page.getByRole("heading", { level: 1, name: "ImmXrsive World" });
  await expect(enter.or(listHeading)).toBeVisible({ timeout: 20_000 });
  if (await enter.isVisible()) {
    await expect(page.getByRole("link", { name: /Main site/ })).toHaveAttribute("href", "/");
    await enter.click();
    await page.getByRole("button", { name: "Places" }).click();
    await expect(page.getByRole("navigation", { name: "Places" }).getByRole("button")).toHaveCount(6);
  }
  expect(errors).toEqual([]);
});

test("/world?list renders every place without WebGL", async ({ page }) => {
  await page.goto("/world?list");
  await expect(page.getByRole("heading", { level: 1, name: "ImmXrsive World" })).toBeVisible();
  await expect(page.getByRole("list", { name: "Student stories" })).toContainText("Jash Sojitra");
  await expect(page.getByRole("list", { name: "Showcase projects" })).toContainText("Project Nexus");
  await expect(page.getByRole("img", { name: /QR code/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(test.info().project.name === "mobile-390" ? 390 : 1_280);
});

test("the Stories House shelf renders the student volumes", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/world/stories-shelf.html");
  await expect(page.locator("#selection-title")).toHaveText("Jash Sojitra", { timeout: 20_000 });
  await expect(page.getByRole("tablist", { name: "Choose a volume" }).getByRole("tab")).toHaveCount(7);
  expect(errors).toEqual([]);
});
