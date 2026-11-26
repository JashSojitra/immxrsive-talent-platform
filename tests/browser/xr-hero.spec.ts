import { expect, test } from "@playwright/test";

declare global { interface Window { xrDrawCalls: number } }

test("homepage uses the official XR mark in a stable reduced-motion scene", async ({ page }, info) => {
  const width = info.project.name === "mobile-390" ? 390 : 1440;
  await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(() => {
    const state = window;
    state.xrDrawCalls = 0;
    const draw = WebGL2RenderingContext.prototype.drawArrays;
    WebGL2RenderingContext.prototype.drawArrays = function(mode, first, count) {
      state.xrDrawCalls++;
      return draw.call(this, mode, first, count);
    };
  });
  await page.goto("/");
  const stage = page.locator('[data-mark="xr"]');
  await expect(stage).toHaveAttribute("data-status", "ready", { timeout: 60_000 });
  await expect(stage).toHaveAttribute("data-still", "true");
  await expect(stage.locator("svg image")).toHaveAttribute("href", "/branding/immxrsive-icon-reverse.svg");
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const before = await page.evaluate(() => window.xrDrawCalls);
  expect(before).toBeGreaterThan(0);
  await page.mouse.move(width * .9, 200);
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => window.xrDrawCalls)).toBe(before);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `test-results/xr-hero/home-${width}.png` });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
  expect(errors).toEqual([]);
});

test("Save-Data keeps the official XR poster without loading a 3D canvas", async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, "connection", { configurable: true, value: { saveData: true } }));
  await page.goto("/");
  const stage = page.locator('[data-mark="xr"]');
  await expect(stage).toHaveAttribute("data-status", "poster");
  await expect(stage.locator("svg image")).toHaveAttribute("href", "/branding/immxrsive-icon-reverse.svg");
  await expect(stage.locator("canvas")).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1 })).toHaveAccessibleName(/The people/);
});
