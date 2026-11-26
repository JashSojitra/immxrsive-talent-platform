import { expect, test } from "@playwright/test";

const routes = [
  "/talent",
  "/students/S01",
  "/projects/P01",
  "/inquiry/student/S01",
  "/student/sign-in",
];

test("shared ImmXrsive identity spans public, inquiry, and student access pages", async ({ page }) => {
  for (const route of routes) {
    await page.goto(route);
    const home = page.getByRole("banner").getByRole("link", { name: "ImmXrsive home", exact: true });
    await expect(home).toBeVisible();
    await expect(home).toHaveAttribute("href", "/");
    expect((await home.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    const logo = home.getByRole("img", { name: "ImmXrsive", exact: true });
    await expect(logo).toHaveAttribute("src", "/branding/immxrsive-logo-reverse.svg");
    const imageBox = await logo.boundingBox();
    const linkBox = await home.boundingBox();
    expect(imageBox!.width).toBeGreaterThanOrEqual(72);
    expect(imageBox!.width / imageBox!.height).toBeCloseTo(404.51 / 123.79, 1);
    expect(imageBox!.x - linkBox!.x).toBeGreaterThanOrEqual(imageBox!.width * .11);
    expect(imageBox!.y - linkBox!.y).toBeGreaterThanOrEqual(imageBox!.width * .11);
    await expect(page.getByRole("contentinfo").getByRole("img", { name: "ImmXrsive", exact: true })).toHaveAttribute("src", "/branding/immxrsive-logo-reverse.svg");
    await expect(page.getByRole("link", { name: "Skiper UI", exact: true })).toHaveCount(0);
    await expect(page.locator('link[rel="icon"]')).toHaveAttribute("href", "/branding/immxrsive-icon-tile.svg");
    await expect(page.getByLabel("Project status")).toContainText(
      "Not an official ImmXrsive or Algoma University service",
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth))
      .toBeLessThanOrEqual(test.info().project.name === "mobile-390" ? 390 : 1_280);
  }
  await expect(page).toHaveTitle(/ImmXrsive/);
});
