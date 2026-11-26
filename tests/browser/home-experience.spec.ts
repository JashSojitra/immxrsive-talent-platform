import { expect, test, type Page } from "@playwright/test";

const disableWebGL = (page: Page) => page.addInitScript(() => {
  const original = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
    return type.startsWith("webgl") ? null : (original as (...args: unknown[]) => RenderingContext | null).call(this, type, ...rest);
  } as typeof HTMLCanvasElement.prototype.getContext;
});

test("homepage hero exposes one accessible headline, real published counts and every primary route", async ({ page }) => {
  await page.goto("/");
  const main = page.getByRole("main");
  await expect(main.getByRole("heading", { level: 1 })).toHaveAccessibleName(/The people\.\s*The ideas\.\s*The possibilities\./);
  for (const [name, href] of [["Discover talent", "/talent"], ["Explore the work", "/projects"], ["Step into the ImmXrsive World", "/world"], ["View all projects", "/projects"], ["Meet the talent", "/talent"], ["Meet industry partners", "/partners"], ["Start an inquiry", "/contact"], ["Open student workspace", "/student/dashboard"]] as const) {
    await expect(main.getByRole("link", { name, exact: true })).toHaveAttribute("href", href);
  }
  const telemetry = main.locator("dl");
  await expect(telemetry.getByText("Published projects")).toBeVisible();
  await expect(telemetry.locator("dd").first()).toHaveText(/^\d{2,}$/);
  await expect(main.locator("ol").getByRole("link", { name: /Campus Service Request Platform/ })).toHaveAttribute("href", "/projects/P02");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(test.info().project.name === "mobile-390" ? 390 : 1_280);
});

test("spatial stage keeps a complete poster when WebGL is unavailable", async ({ page }) => {
  await disableWebGL(page);
  await page.goto("/");
  const stage = page.locator("[data-status]");
  await expect(stage).toHaveAttribute("data-status", "unsupported");
  await expect(stage.locator("svg").first()).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: "Discover talent", exact: true })).toBeVisible();
});

test("reduced motion renders a still scene, static content and native scrolling", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce", baseURL: "http://127.0.0.1:3100", viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.locator("[data-status]")).toHaveAttribute("data-still", "true");
  await page.getByRole("heading", { name: "From possibility to proof." }).scrollIntoViewIfNeeded();
  const unsettled = await page.evaluate(() => [...document.querySelectorAll("[data-motion-static]")].filter(element => {
    const style = getComputedStyle(element);
    return style.opacity !== "1" || style.clipPath !== "none" || style.transform !== "none";
  }).length);
  expect(unsettled).toBe(0);
  expect(await page.evaluate(() => document.documentElement.classList.contains("lenis"))).toBe(false);
  await context.close();
});

test("smooth scrolling is limited to the homepage and the project index stays keyboard reachable", async ({ page }) => {
  test.skip(test.info().project.name === "mobile-390", "Lenis is disabled for coarse pointers.");
  await page.goto("/");
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains("lenis"))).toBe(true);
  const firstProject = page.getByRole("main").locator("ol").first().getByRole("link").first();
  await firstProject.focus();
  await expect(firstProject).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/projects\/P\d+$/);
  expect(await page.evaluate(() => document.documentElement.classList.contains("lenis"))).toBe(false);
});
