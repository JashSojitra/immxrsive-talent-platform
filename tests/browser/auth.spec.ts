import { expect, test } from "@playwright/test";

test("student sign-in is accessible and keyboard-operable", async ({ page }, testInfo) => {
  await page.goto("/student/sign-in");

  await expect(page.getByRole("heading", { name: /your work.*your identity/i })).toBeVisible();
  const signIn = page.getByRole("button", { name: "Continue with GitHub" });
  await expect(signIn).toBeEnabled();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "IMMXRSIVE" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Explore public talent" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(signIn).toBeFocused();
  await expect(page.locator("canvas")).toHaveCount(0);

  if (testInfo.project.name === "mobile-390") {
    const viewport = page.viewportSize();
    expect(viewport?.width).toBe(390);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  }
});

test("student dashboard redirects unauthenticated visitors", async ({ page }) => {
  await page.goto("/student/dashboard");
  await expect(page).toHaveURL(/\/student\/sign-in\?callbackURL=%2Fstudent%2Fdashboard$/);
  await expect(page.getByRole("button", { name: "Continue with GitHub" })).toBeVisible();
});

test("Release 1 public journeys remain unauthenticated", async ({ page }) => {
  for (const path of [
    "/talent",
    "/students/S01",
    "/projects/P01",
    "/inquiry/student/S01",
    "/inquiry/project/P01",
  ]) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBeLessThan(400);
    await expect(page).not.toHaveURL(/\/student\/sign-in/);
  }
});
