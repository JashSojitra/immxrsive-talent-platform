import { expect, test } from "@playwright/test";

test("project supports direct navigation, reload, and its complete evidence shell", async ({ page }) => {
  await page.goto("/projects/P01");
  await expect(page).toHaveURL(/\/projects\/P01$/);
  await expect(page.getByRole("heading", { level: 1, name: "Industrial Safety VR Trainer" })).toBeVisible();
  await expect(page.getByText("Immersive safety training prototype for industrial onboarding.")).toBeVisible();
  await expect(page.getByText("Training / Simulation")).toBeVisible();
  await expect(page.getByLabel("Industrial Safety VR Trainer project technologies")).toContainText("Unity");
  await expect(page.getByLabel("Industrial Safety VR Trainer contributors")).toContainText("XR Developer");
  await expect(page.getByRole("link", { name: /demo.*opens in a new tab/i })).toHaveAttribute("rel", "noopener noreferrer");

  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "Industrial Safety VR Trainer" })).toBeVisible();
});

test("canonical project shows ordered contributor roles and public profile links", async ({ page }) => {
  await page.goto("/projects/P01");
  const contributors = page.getByLabel("Industrial Safety VR Trainer contributors");
  await expect(contributors).toContainText(/XR Developer.*Avery Chen.*3D Artist.*Maya Patel.*UX Researcher.*Leila Ahmed/);
  await expect(page.getByRole("link", { name: /avery chen/i })).toHaveAttribute("href", "/students/S01");
  await expect(page.getByRole("link", { name: /maya patel/i })).toHaveAttribute("href", "/students/S02");
  await expect(page.getByText(/technologies used by the project.*not the skills/i)).toBeVisible();
});

test("unpublished contributor role remains while private details and link stay hidden", async ({ page }) => {
  await page.goto("/projects/P03");
  await expect(page.getByText("QA Tester")).toBeVisible();
  await expect(page.getByText("Public profile unavailable")).toBeVisible();
  await expect(page.getByText("Nora Evans")).toHaveCount(0);
  await expect(page.locator('a[href="/students/S16"]')).toHaveCount(0);
});

test("broken optional asset remains an ordinary safe link without breaking the page", async ({ page }) => {
  await page.goto("/projects/P07");
  await expect(page.getByRole("heading", { name: "WebXR Campus Tour" })).toBeVisible();
  const demo = page.getByRole("link", { name: /demo.*opens in a new tab/i });
  await expect(demo).toHaveAttribute("href", "https://example.invalid/demo");
  await expect(demo).toHaveAttribute("target", "_blank");
});

test("project inquiry handoff preserves project identity without choosing a contributor", async ({ page }) => {
  await page.goto("/projects/P01");
  await page.getByRole("link", { name: /project inquiry for industrial safety/i }).click();
  await expect(page).toHaveURL(/\/inquiry\/project\/P01$/);
  await expect(page.getByRole("heading", { level: 1, name: "Industrial Safety VR Trainer" })).toBeVisible();
  await expect(page.getByRole("form", { name: /employer inquiry about industrial safety/i })).toBeVisible();
  await expect(page.getByText("Avery Chen")).toHaveCount(0);
});

test("student evidence reaches the canonical page and browser back remains natural", async ({ page }) => {
  await page.goto("/students/S01");
  await page.getByRole("link", { name: "View project Industrial Safety VR Trainer" }).click();
  await expect(page).toHaveURL(/\/projects\/P01$/);
  await expect(page.getByRole("heading", { name: "Industrial Safety VR Trainer" })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/students\/S01$/);
  await expect(page.getByRole("heading", { level: 1, name: "Avery Chen" })).toBeVisible();
});

test("project links are keyboard reachable with visible focus", async ({ page }) => {
  await page.goto("/projects/P01");
  const contributor = page.getByRole("link", { name: /avery chen/i });
  await contributor.focus();
  await expect(contributor).toBeFocused();
  expect(await contributor.evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe("none");
  const asset = page.getByRole("link", { name: /demo.*opens in a new tab/i });
  await asset.focus();
  await expect(asset).toBeFocused();
  const inquiry = page.getByRole("link", { name: /project inquiry for industrial safety/i });
  await inquiry.focus();
  await expect(inquiry).toBeFocused();
});

test("reduced motion leaves every project section immediately available", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/projects/P01");
  await expect(page.locator('main[data-motion]')).toHaveAttribute("data-motion", "reduced");
  await expect(page.getByText("XR Developer", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /demo.*opens in a new tab/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /project inquiry/i })).toBeVisible();
});

test("390px project page retains content and has no horizontal overflow", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-390", "mobile-only assertion");
  await page.goto("/projects/P01");
  const width = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(width.scroll).toBeLessThanOrEqual(width.client);
  await expect(page.getByRole("heading", { level: 1, name: "Industrial Safety VR Trainer" })).toBeVisible();
  await expect(page.getByText("XR Developer", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /demo.*opens in a new tab/i })).toBeAttached();
  await expect(page.getByRole("link", { name: /project inquiry/i })).toBeAttached();
});

test("unknown project has a useful project-specific not-found experience", async ({ page }) => {
  await page.goto("/projects/INVALID");
  await expect(page.getByRole("heading", { name: /project.*not available/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /return to talent index/i })).toBeVisible();
});

test("WebGL failure cannot remove project content", async ({ page }) => {
  await page.addInitScript(() => { HTMLCanvasElement.prototype.getContext = () => null; });
  await page.goto("/projects/P01");
  await expect(page.getByRole("heading", { level: 1, name: "Industrial Safety VR Trainer" })).toBeVisible();
  await expect(page.getByText("XR Developer", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /project inquiry/i })).toBeAttached();
});
