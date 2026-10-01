import { expect, test } from "@playwright/test";

test("published profile supports direct navigation and reload", async ({ page }) => {
  await page.goto("/students/S01");
  await expect(page).toHaveURL(/\/students\/S01$/);
  await expect(page.getByRole("heading", { level: 1, name: "Avery Chen" })).toBeVisible();
  await expect(page.getByText("XR Developer focused on training simulations")).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "Avery Chen" })).toBeVisible();
});

test("profile exposes the complete professional shell and project evidence", async ({ page }) => {
  await page.goto("/students/S01");

  await expect(page.getByRole("heading", { name: "Structured skills. Clear signal." })).toBeAttached();
  await expect(page.getByLabel("Avery Chen's standardized skills")).toContainText("Unity");
  await expect(page.getByLabel("Avery Chen's standardized skills")).toContainText("OpenXR");
  await expect(page.getByRole("heading", { name: "Industrial Safety VR Trainer" })).toBeAttached();
  await expect(page.getByRole("heading", { name: "XR Anatomy Lab" })).toBeAttached();
  await expect(page.getByText("Avery Chen's contributor role").first()).toBeAttached();
  await expect(page.getByRole("link", { name: "View project Industrial Safety VR Trainer" })).toHaveAttribute("href", "/projects/P01");
  await expect(page.getByRole("link", { name: /github.*opens in a new tab/i })).toHaveAttribute("target", "_blank");
  await expect(page.getByRole("link", { name: /employer inquiry for avery chen/i })).toHaveAttribute("href", "/inquiry/student/S01");
});

test("browser back preserves the directory URL state", async ({ page }) => {
  await page.route("**/api/v1/skills", (route) => route.fulfill({
    json: {
      skills: [],
      availability: ["internship", "full-time", "contract"].map((value) => ({ value, label: value })),
      status: ["current", "alumni"].map((value) => ({ value, label: value })),
    },
  }));
  await page.route("**/api/v1/talent**", (route) => route.fulfill({
    json: {
      items: [{
        id: "S01",
        name: "Avery Chen",
        headline: "XR Developer focused on training simulations",
        status: "current",
        skills: ["Unity", "C#", "OpenXR"],
        availability: ["internship"],
        projectEvidenceCount: 2,
      }],
      count: 1,
    },
  }));
  await page.goto("/talent?q=Avery#directory");
  const profileLink = page.getByRole("link", { name: /view avery chen/i });
  await expect(profileLink).toBeVisible();
  await profileLink.click();
  await expect(page).toHaveURL(/\/students\/S01$/);

  await page.goBack();
  await expect(page).toHaveURL(/\/talent\?q=Avery#directory$/);
  await expect(page.getByRole("searchbox", { name: /search talent/i })).toHaveValue("Avery");
});

test("profile links are keyboard reachable with visible focus", async ({ page }) => {
  await page.goto("/students/S01");
  const projectLink = page.getByRole("link", { name: "View project Industrial Safety VR Trainer" });
  await projectLink.focus();
  await expect(projectLink).toBeFocused();
  const outline = await projectLink.evaluate((element) => getComputedStyle(element).outlineStyle);
  expect(outline).not.toBe("none");

  const inquiry = page.getByRole("link", { name: /employer inquiry for avery chen/i });
  await inquiry.focus();
  await expect(inquiry).toBeFocused();
});

test("reduced motion leaves the complete profile immediately available", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/students/S01");

  await expect(page.locator("main[data-motion]")).toHaveAttribute("data-motion", "reduced");
  await expect(page.getByRole("heading", { name: "Industrial Safety VR Trainer" })).toBeAttached();
  await expect(page.getByRole("link", { name: /employer inquiry for avery chen/i })).toBeAttached();
});

test("390px profile has no horizontal overflow and retains every action", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-390", "mobile-only assertion");
  await page.goto("/students/S01");
  const width = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));

  expect(width.scroll).toBeLessThanOrEqual(width.client);
  await expect(page.getByRole("heading", { level: 1, name: "Avery Chen" })).toBeVisible();
  await expect(page.getByRole("link", { name: /employer inquiry for avery chen/i })).toBeAttached();
  await expect(page.getByRole("link", { name: /github.*opens in a new tab/i })).toBeAttached();
});

test("unknown and unpublished routes use the same useful not-found state", async ({ page }) => {
  await page.goto("/students/INVALID");
  await expect(page.getByRole("heading", { name: /student profile.*not available/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /return to talent index/i })).toBeVisible();
  const unknownText = await page.locator("main").innerText();

  await page.goto("/students/S16");
  await expect(page.getByRole("heading", { name: /student profile.*not available/i })).toBeVisible();
  expect(await page.locator("main").innerText()).toBe(unknownText);
});

test("WebGL failure cannot remove profile functionality", async ({ page }) => {
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = () => null;
  });
  await page.goto("/students/S01");

  await expect(page.getByRole("heading", { level: 1, name: "Avery Chen" })).toBeVisible();
  await expect(page.getByRole("link", { name: "View project Industrial Safety VR Trainer" })).toBeAttached();
  await expect(page.getByRole("link", { name: /employer inquiry for avery chen/i })).toBeAttached();
});

test("inquiry handoff preserves the selected student in the real form", async ({ page }) => {
  await page.goto("/students/S01");
  await page.getByRole("link", { name: /employer inquiry for avery chen/i }).click();

  await expect(page).toHaveURL(/\/inquiry\/student\/S01$/);
  await expect(page.getByRole("heading", { level: 1, name: "Avery Chen" })).toBeVisible();
  await expect(page.getByRole("form", { name: /employer inquiry about avery chen/i })).toBeVisible();
});
