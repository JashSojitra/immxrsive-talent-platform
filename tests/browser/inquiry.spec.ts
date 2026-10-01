import { expect, test } from "@playwright/test";

test("student inquiry renders trusted source context and a locked form", async ({ page }) => {
  await page.goto("/inquiry/student/S01");
  await expect(page.getByRole("heading", { level: 1, name: "Avery Chen" })).toBeVisible();
  await expect(page.getByText("XR Developer focused on training simulations")).toBeVisible();
  await expect(page.getByRole("form", { name: /employer inquiry about avery chen/i })).toBeVisible();
  await expect(page.getByLabel(/company name/i)).toBeVisible();
  await expect(page.getByLabel(/contact name/i)).toBeVisible();
  await expect(page.getByLabel(/contact email/i)).toBeVisible();
  await expect(page.getByLabel(/inquiry description/i)).toBeVisible();
  await expect(page.getByRole("combobox")).toHaveCount(0);
});

test("project inquiry retains the project and never selects a contributor", async ({ page }) => {
  await page.goto("/inquiry/project/P01");
  await expect(page.getByRole("heading", { level: 1, name: "Industrial Safety VR Trainer" })).toBeVisible();
  await expect(page.getByText("Inquiry about")).toBeVisible();
  await expect(page.getByText("Avery Chen")).toHaveCount(0);
  await expect(page.getByRole("form", { name: /employer inquiry about industrial safety/i })).toBeVisible();
});

test("accessible validation feedback retains entered employer values", async ({ page }) => {
  await page.route("**/api/v1/inquiries", (route) => route.fulfill({
    status: 422,
    contentType: "application/json",
    body: JSON.stringify({
      error: {
        code: "VALIDATION_ERROR",
        message: "Review the highlighted inquiry fields.",
        details: [{ field: "contactEmail", code: "INVALID_FORMAT", message: "Enter a valid contact email." }],
      },
    }),
  }));
  await page.goto("/inquiry/student/S01");
  await fillForm(page, "invalid");
  await page.getByRole("button", { name: /submit inquiry/i }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Review the highlighted fields" })).toBeVisible();
  await expect(page.getByLabel(/contact email/i)).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByLabel(/contact email/i)).toBeFocused();
  await expect(page.getByLabel(/company name/i)).toHaveValue("Example Inc.");
});

test("duplicate submission is blocked while pending and success is announced", async ({ page }) => {
  let requestCount = 0;
  await page.route("**/api/v1/inquiries", async (route) => {
    requestCount += 1;
    await new Promise((resolve) => setTimeout(resolve, 250));
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ id: "46aa3f31-cc0a-4f84-b20a-8c6a3ca3ef31", message: "Inquiry submitted successfully." }),
    });
  });
  await page.goto("/inquiry/project/P01");
  await fillForm(page, "alex@example.com");
  const submit = page.getByRole("button", { name: /submit inquiry/i });
  await submit.click();
  await expect(page.getByRole("button", { name: /submitting/i })).toBeDisabled();
  await expect(page.getByText("Inquiry received")).toBeVisible();
  expect(requestCount).toBe(1);
  await expect(page.getByRole("status")).toBeFocused();
});

test("backend failure is recoverable without losing data", async ({ page }) => {
  await page.route("**/api/v1/inquiries", (route) => route.fulfill({
    status: 500,
    contentType: "application/json",
    body: JSON.stringify({ error: { code: "INTERNAL_ERROR", message: "The inquiry could not be submitted right now.", details: [] } }),
  }));
  await page.goto("/inquiry/student/S01");
  await fillForm(page, "alex@example.com");
  await page.getByRole("button", { name: /submit inquiry/i }).click();
  await expect(page.getByText("Submission interrupted")).toBeVisible();
  await expect(page.getByLabel(/company name/i)).toHaveValue("Example Inc.");
  await expect(page.getByRole("button", { name: /submit inquiry/i })).toBeEnabled();
});

test("invalid and unpublished student inquiry routes are indistinguishable", async ({ page }) => {
  await page.goto("/inquiry/student/INVALID");
  await expect(page.getByRole("heading", { name: /inquiry source.*not available/i })).toBeVisible();
  const unknownText = await page.locator("main").innerText();
  await page.goto("/inquiry/student/S16");
  await expect(page.getByRole("heading", { name: /inquiry source.*not available/i })).toBeVisible();
  expect(await page.locator("main").innerText()).toBe(unknownText);
});

test("invalid project inquiry route has a useful unavailable state", async ({ page }) => {
  await page.goto("/inquiry/project/INVALID");
  await expect(page.getByRole("heading", { name: /inquiry source.*not available/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /return to talent index/i })).toBeVisible();
});

test("keyboard workflow and visible focus cover every form control", async ({ page }) => {
  await page.goto("/inquiry/student/S01");
  for (const control of [
    page.getByLabel(/company name/i),
    page.getByLabel(/contact name/i),
    page.getByLabel(/contact email/i),
    page.getByLabel(/inquiry description/i),
    page.getByRole("button", { name: /submit inquiry/i }),
  ]) {
    await control.focus();
    await expect(control).toBeFocused();
    expect(await control.evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe("none");
  }
});

test("reduced motion leaves context and form immediately complete", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/inquiry/student/S01");
  await expect(page.locator("main[data-motion]")).toHaveAttribute("data-motion", "stable");
  await expect(page.getByRole("heading", { level: 1, name: "Avery Chen" })).toBeVisible();
  await expect(page.getByRole("button", { name: /submit inquiry/i })).toBeVisible();
});

test("390px inquiry form and success state have no horizontal overflow", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-390", "mobile-only assertion");
  await page.route("**/api/v1/inquiries", (route) => route.fulfill({
    status: 201,
    contentType: "application/json",
    body: JSON.stringify({ id: "46aa3f31-cc0a-4f84-b20a-8c6a3ca3ef31", message: "Inquiry submitted successfully." }),
  }));
  await page.goto("/inquiry/project/P01");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await expect(page.getByLabel(/inquiry description/i)).toBeVisible();
  await fillForm(page, "alex@example.com");
  await page.getByRole("button", { name: /submit inquiry/i }).click();
  await expect(page.getByText("Inquiry received")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

async function fillForm(page: import("@playwright/test").Page, email: string) {
  await page.getByLabel(/company name/i).fill("Example Inc.");
  await page.getByLabel(/contact name/i).fill("Alex Employer");
  await page.getByLabel(/contact email/i).fill(email);
  await page.getByLabel(/inquiry description/i).fill("We would like to discuss an internship opportunity.");
}
