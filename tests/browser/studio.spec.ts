import { expect, test } from "@playwright/test";

test("anonymous Studio access requires sign-in and API access is denied", async ({ page, request }) => {
  for (const path of ["/studio", "/studio/private-project", "/student/projects/private-project/showcase"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/student\/sign-in\?callbackURL=/);
  }
  for (const path of ["/api/studio", "/api/studio/private-project"]) {
    const response = await request.get(path);
    expect(response.status()).toBe(401);
    expect(response.headers()["cache-control"]).toContain("no-store");
  }
});

test("public showcase supports reduced motion, keyboard navigation and narrow screens", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/showcase");
  await expect(page.getByRole("heading", { level: 1, name: "Made to be experienced." })).toBeVisible();
  await expect(page.getByText("No approved showcases published yet.")).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to project workspace" })).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
