import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

const origin = process.env.DESIGN_PREVIEW_URL ?? "http://127.0.0.1:3200";
const widths = [390, 768, 1280, 1440];
const routes = [["home","/"],["talent","/talent"],["projects","/projects"],["showcase","/showcase"],["partners","/partners"],["contact","/contact"],["profile","/students/S01"],["project","/projects/P01"],["inquiry","/inquiry/student/S01"],["sign-in","/student/sign-in"],["admin","/admin/sign-in"]];
const directory = "docs/design/screenshots/after";
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ reducedMotion: "reduce" });
const results = [];
const errors = [];
page.on("pageerror", error => errors.push(error.message));
try {
  for (const width of widths) {
    await page.setViewportSize({ width, height: 960 });
    for (const [name, path] of routes) {
      const response = await page.goto(new URL(path, origin).href, { waitUntil: "networkidle" });
      if (response?.status() !== 200) throw new Error(`${path}: HTTP ${response?.status()}`);
      await page.getByRole("heading", { level: 1 }).waitFor();
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      if (scrollWidth > width) throw new Error(`${path}: horizontal overflow at ${width}px (${scrollWidth})`);
      await page.screenshot({ path: `${directory}/${name}-${width}.png`, fullPage: true });
      results.push({ width, path, status: response.status(), overflow: false });
      console.log(`${width}px ${path}: 200, no overflow`);
    }
  }
  if (errors.length) throw new Error(errors.join("\n"));
  await writeFile("docs/design/public-responsive-checks.json", JSON.stringify(results, null, 2) + "\n");
} finally { await browser.close(); }
