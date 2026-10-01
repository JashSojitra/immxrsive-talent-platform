import { expect, test, type Page } from "@playwright/test";

test("Scenario A: search and filters lead through project evidence to project inquiry", async ({ page }) => {
  await mockInquirySuccess(page);
  await page.goto("/talent#directory");
  await page.getByRole("searchbox", { name: /search talent/i }).fill("Unity");
  await page.getByRole("button", { name: /submit talent search/i }).click();
  await toggleFilter(page, "Unity");
  await toggleFilter(page, "Internship");
  await expect(page.getByRole("link", { name: /view avery chen/i })).toBeVisible();
  await page.getByRole("link", { name: /view avery chen/i }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Avery Chen" })).toBeVisible();
  await page.getByRole("link", { name: "View project Industrial Safety VR Trainer" }).click();
  await expect(page).toHaveURL(/\/projects\/P01$/);
  await expect(page.getByText("XR Developer", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: /project inquiry for industrial safety/i }).click();
  await fillInquiry(page);
  await page.getByRole("button", { name: /submit inquiry/i }).click();
  await expect(page.getByText("Inquiry received")).toBeVisible();
});

test("Scenario B: two-skill AND, individual removal, Clear All, and student inquiry", async ({ page }) => {
  await mockInquirySuccess(page);
  await page.goto("/talent#directory");
  await toggleFilter(page, "Unity");
  await expect(page.getByLabel("8 matches")).toBeVisible();
  await toggleFilter(page, "Blender");
  await expect(page).toHaveURL(/skill=Unity.*skill=Blender|skill=Blender.*skill=Unity/);
  await expect(page.getByLabel("4 matches")).toBeVisible();
  await page.getByRole("button", { name: /remove blender filter/i }).click();
  await expect(page.getByRole("checkbox", { name: "Unity" })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: "Blender" })).not.toBeChecked();
  await expect(page.getByLabel("8 matches")).toBeVisible();
  await page.getByRole("button", { name: /clear all/i }).click();
  await expect(page.getByLabel("17 matches")).toBeVisible();
  await page.getByRole("link", { name: /view maya patel/i }).click();
  await page.getByRole("link", { name: /employer inquiry for maya patel/i }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Maya Patel" })).toBeVisible();
  await fillInquiry(page);
  await page.getByRole("button", { name: /submit inquiry/i }).click();
  await expect(page.getByText("Inquiry received")).toBeVisible();
});

test("Scenario C: stable deep links survive reload and browser back", async ({ page }) => {
  await page.goto("/students/S01");
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "Avery Chen" })).toBeVisible();
  await page.getByRole("link", { name: "View project Industrial Safety VR Trainer" }).click();
  await expect(page).toHaveURL(/\/projects\/P01$/);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "Industrial Safety VR Trainer" })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("heading", { level: 1, name: "Avery Chen" })).toBeVisible();
});

test("Scenario D: unpublished and invalid routes fail safely", async ({ page }) => {
  for (const path of [
    "/students/S16", "/students/INVALID", "/projects/INVALID",
    "/inquiry/student/S16", "/inquiry/student/INVALID", "/inquiry/project/INVALID",
  ]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: /not available/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /talent/i }).first()).toBeVisible();
  }
});

test("Scenario E: P07 remains usable beside its broken optional URL", async ({ page }) => {
  await page.goto("/projects/P07");
  await expect(page.getByRole("heading", { level: 1, name: "WebXR Campus Tour" })).toBeVisible();
  const brokenAsset = page.getByRole("link", { name: /demo.*opens in a new tab/i });
  await expect(brokenAsset).toHaveAttribute("href", "https://example.invalid/demo");
  await brokenAsset.focus();
  await expect(brokenAsset).toBeFocused();
  await expect(page.getByRole("link", { name: /project inquiry/i })).toBeVisible();
});

test("Scenario F: the complete workflow has no overflow at 390px", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-390", "mobile-only acceptance scenario");
  await mockInquirySuccess(page);
  for (const path of ["/talent#directory", "/students/S01", "/projects/P01", "/inquiry/project/P01"]) {
    await page.goto(path);
    const width = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(width.scroll).toBeLessThanOrEqual(width.client);
  }
  await fillInquiry(page);
  await page.getByRole("button", { name: /submit inquiry/i }).click();
  await expect(page.getByText("Inquiry received")).toBeVisible();
});

test("Scenario G: keyboard-only controls expose focus throughout the core workflow", async ({ page }) => {
  await page.goto("/talent#directory");
  const search = page.getByRole("searchbox", { name: /search talent/i });
  await tabTo(page, search, 10);
  await page.keyboard.type("Avery");
  await page.keyboard.press("Enter");
  const student = page.getByRole("link", { name: /view avery chen/i });
  await tabTo(page, student, 45);
  await page.keyboard.press("Enter");
  const project = page.getByRole("link", { name: "View project Industrial Safety VR Trainer" });
  await tabTo(page, project, 20);
  await page.keyboard.press("Enter");
  const inquiry = page.getByRole("link", { name: /project inquiry for industrial safety/i });
  await tabTo(page, inquiry, 15);
  await page.keyboard.press("Enter");
  const company = page.getByLabel(/company name/i);
  await tabTo(page, company, 10);
  await expect(company).toBeFocused();
});

test("Scenario H: reduced motion preserves the complete core workflow", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/talent#directory");
  await expect(page.getByLabel("17 matches")).toBeVisible();
  await page.getByRole("link", { name: /view avery chen/i }).click();
  await expect(page.locator("main")).toHaveAttribute("data-motion", "reduced");
  await page.getByRole("link", { name: "View project Industrial Safety VR Trainer" }).click();
  await expect(page.locator("main[data-motion]")).toHaveAttribute("data-motion", "reduced");
  await page.getByRole("link", { name: /project inquiry/i }).click();
  await expect(page.getByRole("button", { name: /submit inquiry/i })).toBeVisible();
});

test("Scenario I: missing WebGL leaves the core workflow functional", async ({ page }) => {
  await page.addInitScript(() => { HTMLCanvasElement.prototype.getContext = () => null; });
  await page.goto("/talent#directory");
  await expect(page.getByLabel("17 matches")).toBeVisible();
  await page.getByRole("link", { name: /view lucas tremblay/i }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Lucas Tremblay" })).toBeVisible();
  await page.getByRole("link", { name: "View project WebXR Campus Tour" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "WebXR Campus Tour" })).toBeVisible();
});

async function mockInquirySuccess(page: Page) {
  await page.route("**/api/v1/inquiries", (route) => route.fulfill({
    status: 201,
    contentType: "application/json",
    body: JSON.stringify({ id: "46aa3f31-cc0a-4f84-b20a-8c6a3ca3ef31", message: "Inquiry submitted successfully." }),
  }));
}

async function fillInquiry(page: Page) {
  await page.getByLabel(/company name/i).fill("Release Acceptance Inc.");
  await page.getByLabel(/contact name/i).fill("Alex Employer");
  await page.getByLabel(/contact email/i).fill("alex@example.com");
  await page.getByLabel(/inquiry description/i).fill("We would like to discuss a Release 1 collaboration opportunity.");
}

async function toggleFilter(page: Page, name: string) {
  const checkbox = page.getByRole("checkbox", { name });
  await checkbox.focus();
  await page.keyboard.press("Space");
  await expect(checkbox).toBeChecked();
}

async function tabTo(page: Page, target: import("@playwright/test").Locator, attempts: number) {
  for (let index = 0; index < attempts; index += 1) {
    if (await target.evaluate((element) => element === document.activeElement)) return;
    await page.keyboard.press("Tab");
  }
  await expect(target).toBeFocused();
}
