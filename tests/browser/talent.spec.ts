import { expect, test } from "@playwright/test";
import fixtureStudents from "../../data/fixtures/students.json" with { type: "json" };
import { parseTalentSearchExpression, TalentSearchSyntaxError } from "../../src/validation/talent-query";

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
    const q = url.searchParams.get("q") ?? "";
    const skills = url.searchParams.getAll("skill");
    const availability = url.searchParams.getAll("availability");
    const statuses = url.searchParams.getAll("status");
    try {
      const groups = parseTalentSearchExpression(q);
      const items = publishedStudents.filter((student) => {
        const searchable = [student.name, student.headline, ...student.skills].map((value) => value.toLowerCase());
        return groups.every((group) => group.some((term) => searchable.some((value) => value.includes(term.toLowerCase()))))
          && skills.every((skill) => student.skills.includes(skill))
          && (availability.length === 0 || availability.some((value) => student.availability.some((item) => item === value)))
          && (statuses.length === 0 || statuses.includes(student.status));
      });
      return route.fulfill({ json: { items, count: items.length } });
    } catch (error) {
      if (error instanceof TalentSearchSyntaxError) {
        return route.fulfill({
          status: 400,
          json: { error: { code: "INVALID_QUERY", message: "One or more directory filters are invalid.", details: [{ field: "q", code: error.code, message: error.message }] } },
        });
      }
      throw error;
    }
  });
});

test("homepage introduces the platform and links to discovery", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("main").getByRole("link", { name: "Discover talent", exact: true })).toBeVisible();
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

test("student access is discoverable and keyboard-operable in public navigation", async ({ page }) => {
  await page.goto("/talent");
  const menu = page.getByRole("button", { name: "Open navigation menu" });
  if (await menu.isVisible()) await menu.click();
  const studentAccess = page.getByRole("link", { name: "Student sign in" });
  await expect(studentAccess).toBeVisible();
  await expect(studentAccess).toHaveAttribute("href", "/student/sign-in");
  await studentAccess.focus();
  await expect(studentAccess).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/student\/sign-in$/);
  await expect(page.getByRole("button", { name: "Continue with GitHub" })).toBeVisible();
});

test("advanced expressions remain URL-addressable and browser history restores them", async ({ page }) => {
  await page.goto("/talent");
  const search = page.getByRole("searchbox", { name: /search talent/i });
  await search.fill("Unity | Blender, artist");
  await page.getByRole("button", { name: /submit talent search/i }).click();
  await expect(page.getByLabel("2 matches")).toBeVisible();
  await expect(page.getByRole("link", { name: /view maya patel/i })).toBeVisible();
  await expect(page).toHaveURL(/q=Unity\+%7C\+Blender%2C\+artist/);

  await search.fill("Avery");
  await page.getByRole("button", { name: /submit talent search/i }).click();
  await expect(page.getByLabel("1 match")).toBeVisible();
  await page.goBack();
  await expect(search).toHaveValue("Unity | Blender, artist");
  await expect(page.getByLabel("2 matches")).toBeVisible();
});

test("search tips are keyboard-accessible and malformed searches retain results", async ({ page }) => {
  await page.goto("/talent#directory");
  const help = page.getByRole("button", { name: "Search tips" });
  await help.focus();
  await page.keyboard.press("Enter");
  const panel = page.getByRole("region", { name: "Search tips" });
  await expect(panel).toBeVisible();
  await expect(panel).toContainText("Match React OR TypeScript, AND Figma.");
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await expect(help).toBeFocused();

  const search = page.getByRole("searchbox", { name: /search talent/i });
  await search.fill("React,");
  await page.getByRole("button", { name: /submit talent search/i }).click();
  await expect(page.locator("#talent-search-error")).toContainText("final separator");
  await expect(page.getByRole("link", { name: /view avery chen/i })).toBeVisible();
  await expect(search).toHaveValue("React,");
});

test("keyboard focus is visible and filters operate without a pointer", async ({ page }) => {
  await page.goto("/talent#directory");
  const search = page.getByRole("searchbox", { name: /search talent/i });
  await page.locator("body").focus();
  for (let index = 0; index < 30; index += 1) {
    if (await search.evaluate((element) => element === document.activeElement)) break;
    await page.keyboard.press("Tab");
  }
  await expect(search).toBeFocused();
  const outline = await search.evaluate((element) => ({ style: getComputedStyle(element).outlineStyle, width: getComputedStyle(element).outlineWidth }));
  expect(outline.style).not.toBe("none");
  expect(parseFloat(outline.width)).toBeGreaterThan(0);

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
  await page.getByRole("button", { name: "Search tips" }).click();
  const panelBox = await page.getByRole("region", { name: "Search tips" }).boundingBox();
  expect(panelBox).not.toBeNull();
  expect(panelBox!.x).toBeGreaterThanOrEqual(0);
  expect(panelBox!.x + panelBox!.width).toBeLessThanOrEqual(390);
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

test("motion-disabled directory preserves filtering", async ({ page }) => {
  await page.addInitScript(() => {
    window.__IMMXRSIVE_DISABLE_MOTION__ = true;
  });
  await page.goto("/talent");
  await expect(page.locator("main")).toHaveAttribute("data-motion", "fallback");
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

test("directory responds to reduced motion changes without navigation", async ({ page }) => {
  await page.goto("/talent");
  await expect(page.locator("main")).toHaveAttribute("data-motion", "ready");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("main")).toHaveAttribute("data-motion", "reduced");
  await expect(page.getByRole("searchbox", { name: /search talent/i })).toBeEnabled();
});

test("directory navigation does not start a background rendering loop", async ({ page }) => {
  await page.goto("/talent");
  await expect(page.getByLabel("17 matches")).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(0);
  await page.getByRole("link", { name: /view avery chen/i }).click();
  await expect(page).toHaveURL(/\/students\/S01$/);
  await expect(page.getByRole("heading", { level: 1, name: "Avery Chen" })).toBeVisible();
});
