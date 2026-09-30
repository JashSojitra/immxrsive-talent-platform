import { expect, test } from "@playwright/test";
import fixtureStudents from "../../data/fixtures/students.json" with { type: "json" };

const publishedStudents = fixtureStudents
  .filter((student) => student.profile_status === "published")
  .map((student) => ({
    id: student.id,
    name: student.name,
    headline: student.headline,
    status: student.status,
    skills: student.skills,
    availability: student.availability,
    projectEvidenceCount: student.project_ids.length,
  }));

const publishedSkills = Array.from(new Set(publishedStudents.flatMap((student) => student.skills))).sort();

test.beforeEach(async ({ page }) => {
  await page.route("**/api/v1/skills", (route) => route.fulfill({
    json: {
      skills: publishedSkills.map((skill) => ({ value: skill, label: skill })),
      availability: ["internship", "full-time", "contract"].map((value) => ({ value, label: value })),
      status: ["current", "alumni"].map((value) => ({ value, label: value })),
    },
  }));
  await page.route("**/api/v1/talent**", (route) => {
    const url = new URL(route.request().url());
    const q = url.searchParams.get("q")?.toLowerCase();
    const skills = url.searchParams.getAll("skill");
    const availability = url.searchParams.getAll("availability");
    const statuses = url.searchParams.getAll("status");
    const items = publishedStudents.filter((student) =>
      (!q || `${student.name} ${student.headline} ${student.skills.join(" ")}`.toLowerCase().includes(q))
      && skills.every((skill) => student.skills.includes(skill))
      && (availability.length === 0 || availability.some((value) => student.availability.some((item) => item === value)))
      && (statuses.length === 0 || statuses.includes(student.status)),
    );
    return route.fulfill({ json: { items, count: items.length } });
  });
});

test("root redirects to the talent experience", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/talent$/);
  await expect(page.getByRole("heading", { name: /discover the people/i })).toBeVisible();
});

test("directory workflow remains functional and URL-addressable", async ({ page }) => {
  await page.goto("/talent");
  await expect(page.getByRole("heading", { name: /discover the people/i })).toBeVisible();
  await expect(page.getByLabel("17 matches")).toBeVisible();

  await page.getByRole("searchbox", { name: /search talent/i }).fill("Maya Patel");
  await page.getByRole("button", { name: /submit talent search/i }).click();
  await expect(page.getByLabel("1 match")).toBeVisible();
  await expect(page.getByRole("link", { name: /view maya patel/i })).toBeVisible();
  await expect(page).toHaveURL(/q=Maya\+Patel/);

  await page.reload();
  await expect(page.getByRole("searchbox", { name: /search talent/i })).toHaveValue("Maya Patel");
  await expect(page.getByRole("link", { name: /view maya patel/i })).toBeVisible();
});

test("keyboard focus is visible and filters operate without a pointer", async ({ page }) => {
  await page.goto("/talent#directory");
  const search = page.getByRole("searchbox", { name: /search talent/i });
  await page.locator("body").focus();
  for (let index = 0; index < 8; index += 1) {
    if (await search.evaluate((element) => element === document.activeElement)) break;
    await page.keyboard.press("Tab");
  }
  await expect(search).toBeFocused();
  const outline = await search.evaluate((element) => getComputedStyle(element).boxShadow);
  expect(outline).not.toBe("none");

  const unity = page.getByRole("checkbox", { name: "Unity" });
  await unity.focus();
  await page.keyboard.press("Space");
  await expect(unity).toBeChecked();
  await expect(page).toHaveURL(/skill=Unity/);
});

test("390px layout has no horizontal document overflow", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-390", "mobile-only assertion");
  await page.goto("/talent#directory");
  await expect(page.getByLabel("17 matches")).toBeVisible();
  const width = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(width.scroll).toBeLessThanOrEqual(width.client);
  await expect(page.getByRole("searchbox", { name: /search talent/i })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "Unity" })).toBeVisible();
  await expect(page.getByRole("link", { name: /view avery chen/i })).toBeVisible();
});

test("reduced motion keeps the complete directory usable", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/talent#directory");
  await expect(page.getByLabel("17 matches")).toBeVisible();
  const alumni = page.getByRole("checkbox", { name: "Alumni" });
  await alumni.focus();
  await page.keyboard.press("Space");
  await expect(page.getByLabel("3 matches")).toBeVisible();
  await expect(page.getByRole("link", { name: /view daniel kim/i })).toBeVisible();
});

test("a WebGL context failure leaves the directory intact", async ({ page }) => {
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = () => null;
  });
  await page.goto("/talent#directory");
  await expect(page.getByLabel("17 matches")).toBeVisible();
  await expect(page.getByRole("searchbox", { name: /search talent/i })).toBeEnabled();
  await expect(page.getByRole("link", { name: /view avery chen/i })).toBeVisible();
});

test("GSAP fallback exposes every chapter and preserves filtering", async ({ page }) => {
  await page.addInitScript(() => {
    window.__IMMXRSIVE_DISABLE_MOTION__ = true;
  });
  await page.goto("/talent");
  await expect(page.locator("main")).toHaveAttribute("data-motion", "fallback");
  await expect(page.getByRole("heading", { name: /one field.*many dimensions/i })).toBeAttached();
  await expect(page.getByRole("heading", { name: /talent is more than.*a list of skills/i })).toBeAttached();
  await expect(page.getByRole("heading", { name: /find the person.*behind the possibility/i })).toBeAttached();
  await page.getByRole("checkbox", { name: "Alumni" }).focus();
  await page.keyboard.press("Space");
  await expect(page.getByLabel("3 matches")).toBeVisible();
});

test("focused removed card hands focus to the result summary", async ({ page }) => {
  await page.goto("/talent#directory");
  const avery = page.getByRole("link", { name: /view avery chen/i });
  await avery.focus();
  await page.evaluate(() => {
    window.history.pushState(null, "", "/talent?q=Maya");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  await expect(page.getByLabel("1 match")).toBeFocused();
  await expect(avery).toHaveCount(0);
});

test("native scroll advances the authored field sequence", async ({ page }) => {
  await page.goto("/talent");
  await expect(page.locator("main")).toHaveAttribute("data-motion", "ready");

  const fieldWord = page.locator("[data-field-word='near']").first();
  const before = await fieldWord.evaluate((element) => getComputedStyle(element).transform);
  await page.locator("[data-chapter='field']").scrollIntoViewIfNeeded();
  await page.waitForTimeout(250);
  const after = await fieldWord.evaluate((element) => getComputedStyle(element).transform);

  expect(after).not.toBe(before);
});

test("motion cleanup runs when the talent page unmounts", async ({ page }) => {
  await page.goto("/talent");
  await expect.poll(() => page.evaluate(() => window.__IMMXRSIVE_MOTION_ACTIVE__)).toBe(true);
  await page.getByRole("link", { name: /view avery chen/i }).click();
  await expect(page).toHaveURL(/\/students\/S01$/);
  await expect.poll(() => page.evaluate(() => window.__IMMXRSIVE_MOTION_ACTIVE__ === true)).toBe(false);
});
