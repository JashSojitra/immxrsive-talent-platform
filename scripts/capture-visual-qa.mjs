import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

const directory = process.env.IMMXRSIVE_CAPTURE_DIR ?? "docs/design/screenshots/visual-qa";
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const manifest = [];
try {
  for (const width of process.argv.length > 2 ? process.argv.slice(2).map(Number) : [390, 768, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 1000 }, hasTouch: width === 390, isMobile: width === 390 });
    const page = await context.newPage();
    for (const route of ["/", "/talent", "/projects", "/partners", "/showcase"]) {
      const name = route === "/" ? "home" : route.slice(1);
      await page.goto(`http://127.0.0.1:3100${route}`, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      const capture = async (suffix, fullPage = false) => {
        const file = `${name}-${width}-${suffix}.jpg`;
        await page.screenshot({ path: `${directory}/${file}`, type: "jpeg", quality: 85, fullPage, animations: "disabled" });
        manifest.push({ file, width, route, state: suffix });
      };
      await capture("hero");
      // Exercise real entry triggers before the full-page review, then let the hero settle.
      const height = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let position = 0; position < height; position += 700) {
        await page.evaluate(position => window.scrollTo(0, position), position);
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      }
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForFunction(() => {
        const copy = document.querySelector('[data-kinetic-field] [data-motion-static]');
        return !copy || Number(getComputedStyle(copy).opacity) > .99;
      });
      await capture("full", true);
      for (const id of ["28", "31"]) {
        const section = page.locator(`[data-skiper="${id}"]`).first();
        if (!await section.count()) continue;
        for (const [state, fraction] of [["start", 0], ["middle", .5], ["settled", 1]]) {
          await section.evaluate((element, fraction) => {
            const top = element.getBoundingClientRect().top + window.scrollY;
            window.scrollTo(0, top - window.innerHeight * .65 + fraction * element.clientHeight);
          }, fraction);
          await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
          await capture(`skiper${id}-${state}`);
        }
      }
      if (route === "/") {
        await page.locator('[data-skiper="47"]').scrollIntoViewIfNeeded();
        await capture("carousel");
        await page.evaluate(() => window.scrollTo(0, 0));
        const menu = page.getByRole("button", { name: "Open navigation menu" });
        if (await menu.isVisible()) {
          await menu.click();
          await page.getByRole("navigation", { name: "Mobile navigation", exact: true }).getByRole("link").last().evaluate(async element => {
            await Promise.all(element.getAnimations().map(animation => animation.finished));
          });
        }
        await capture("navigation");
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.goto("http://127.0.0.1:3100/", { waitUntil: "networkidle" });
        await capture("reduced-motion");
        await page.emulateMedia({ reducedMotion: "no-preference" });
      }
      console.log(`${width}px ${route}: captured rendered states`);
    }
    await context.close();
  }
} finally { await browser.close(); }
await writeFile(`${directory}/manifest.json`, JSON.stringify(manifest, null, 2));
await writeFile(`${directory}/index.html`, `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ImmXrsive visual QA gallery</title><style>
body{margin:0;background:#0a0c12;color:#f4f0e8;font:16px/1.6 system-ui,sans-serif}main{max-width:1440px;margin:auto;padding:32px}h1{font-size:clamp(28px,4vw,48px);line-height:1.1}a{color:#8ef0d4}label{display:inline-block;margin:12px 24px 24px 0}select{font:inherit;background:#12151d;color:inherit;padding:8px;border:1px solid #687284}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:24px}figure{margin:0;padding:16px;border:1px solid #2a303c;background:#101519}img{display:block;width:100%;height:400px;object-fit:contain;background:#05060a}figcaption{margin-top:12px}small{color:#a9b0bc}figure[hidden]{display:none}</style><main>
<p>PR #14 / Local production build / Visual review pending</p><h1>Rendered pages, at every scale.</h1><p>Actual Chromium captures of existing published test records. No fabricated project imagery. Select a width or route; open an image for its complete resolution. Full pages and start, middle, and settled scroll states are included.</p>
<label>Width <select id="width"><option value="all">All widths</option><option>390</option><option>768</option><option>1440</option></select></label><label>Route <select id="route"><option value="all">All routes</option>${["/", "/talent", "/projects", "/partners", "/showcase"].map(route => `<option>${route}</option>`).join("")}</select></label>
<div class="grid">${manifest.map(item => `<figure data-width="${item.width}" data-route="${item.route}"><a href="${item.file}" target="_blank" rel="noopener"><img loading="lazy" src="${item.file}" alt="${item.route} at ${item.width}px, ${item.state}"></a><figcaption>${item.route} · ${item.width}px<br><small>${item.state}</small></figcaption></figure>`).join("")}</div></main><script>const controls=[document.getElementById('width'),document.getElementById('route')];function filter(){for(const figure of document.querySelectorAll('figure'))figure.hidden=controls.some(control=>control.value!=='all'&&figure.dataset[control.id]!==control.value)}for(const control of controls)control.addEventListener('change',filter)</script></html>`);
console.log(`Captured ${manifest.length} rendered views in ${directory}`);
