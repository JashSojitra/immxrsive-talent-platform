import { expect, test } from "@playwright/test";

// 3D boots in software rendering on CI runners (no GPU), which is far slower than a real device.
const SLOW_3D_MS = 60_000;

test("/world opens the 3D intro (or the list fallback when WebGL is unavailable)", async ({ page }) => {
  test.setTimeout(SLOW_3D_MS * 2);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/world");
  const enter = page.getByRole("button", { name: "Enter the world" });
  const listHeading = page.getByRole("heading", { level: 1, name: "ImmXrsive World" });
  await expect(enter.or(listHeading)).toBeVisible({ timeout: SLOW_3D_MS });
  // The world sits inside the main site's chrome.
  await expect(page.locator("body > header")).toBeVisible();
  await expect(page.locator("body > footer")).toBeAttached();
  if (await enter.isVisible()) {
    await expect(page.getByRole("link", { name: "Back to main site" })).toHaveAttribute("href", "/");
    await expect(page.getByRole("button", { name: "View as a list" })).toHaveCount(0);
    await enter.click();
    await page.getByRole("button", { name: "Places" }).click({ timeout: SLOW_3D_MS });
    await expect(page.getByRole("navigation", { name: "Places" }).getByRole("button")).toHaveCount(6);
    await expect(page.getByRole("navigation", { name: "World controls" }).getByRole("button", { name: "List" })).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});

test("/world?kiosk is full screen without the site chrome but keeps the project notice", async ({ page }) => {
  test.setTimeout(SLOW_3D_MS * 2);
  await page.goto("/world?kiosk");
  const enter = page.getByRole("button", { name: "Enter the world" });
  const listHeading = page.getByRole("heading", { level: 1, name: "ImmXrsive World" });
  await expect(enter.or(listHeading)).toBeVisible({ timeout: SLOW_3D_MS });
  if (await listHeading.isVisible()) {
    // Without WebGL the list view keeps the site chrome, which carries the notice.
    await expect(page.locator("body > header")).toBeVisible();
    await expect(page.locator("body > footer")).toBeAttached();
    return;
  }
  await expect(page.locator("body > header")).toBeHidden();
  await expect(page.locator("body > footer")).toBeHidden();
  // The site's own notice is hidden with the chrome; the world shows its own copy.
  await expect(page.locator("#site-content").getByText("Independent student-built course project.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to main site" })).toHaveCount(0);
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

test("the Stories House shelf renders the student volumes (3D, or the static shelf without WebGL)", async ({ page }) => {
  test.setTimeout(SLOW_3D_MS * 2);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/world/stories-shelf.html");
  const tabs = page.getByRole("tablist", { name: "Choose a volume" }).getByRole("tab");
  const fallback = page.locator("#static-fallback:not([hidden])");
  await expect(tabs.first().or(fallback)).toBeVisible({ timeout: SLOW_3D_MS });
  if (await fallback.count()) {
    // CI runners often have no WebGL: the shelf must still list every volume.
    await expect(fallback.locator(".fallback-book")).toHaveCount(7);
    await expect(fallback).toContainText("Jash Sojitra");
  } else {
    await expect(tabs).toHaveCount(7);
    await expect(page.locator("#selection-title")).toHaveText("Jash Sojitra");
  }
  expect(errors).toEqual([]);
});
