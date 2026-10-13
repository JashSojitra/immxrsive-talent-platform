import { expect, test } from "@playwright/test";

const routes = [
  "/talent",
  "/students/S01",
  "/projects/P01",
  "/inquiry/student/S01",
  "/student/sign-in",
];

test("supplied NOT ImmXrsive identity spans public, inquiry, and student access pages", async ({ page }) => {
  for (const route of routes) {
    await page.goto(route);
    const logo = page.getByAltText("NOT ImmXrsive").first();
    await expect(logo).toBeVisible();
    await expect(logo).toHaveAttribute("src", /not-immxrsive-logo\.png/);
    expect(await logo.evaluate((image: HTMLImageElement) => ({
      width: image.naturalWidth,
      height: image.naturalHeight,
    }))).toEqual({ width: 2_000, height: 2_000 });
    await expect(page.getByLabel("Project status")).toContainText(
      "Not an official ImmXrsive or Algoma University service",
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth))
      .toBeLessThanOrEqual(test.info().project.name === "mobile-390" ? 390 : 1_280);
  }
  await expect(page).toHaveTitle(/NOT ImmXrsive/);
});
