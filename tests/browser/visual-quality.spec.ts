import { expect, test } from "@playwright/test";

for (const width of [390, 768, 1440]) {
  test(`reading geometry stays coherent through scroll at ${width}px`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    for (const route of ["/", "/talent", "/partners", "/showcase", "/projects"]) {
      await page.goto(route);
      await page.evaluate(() => document.fonts.ready);
      expect(await page.evaluate(() => document.documentElement.scrollWidth), route).toBeLessThanOrEqual(width);
      const initialHeader = await page.getByRole("banner").boundingBox();
      const navigationPaint = await page.getByRole("banner").locator(":scope > div").last().evaluate(element => getComputedStyle(element).backgroundColor);
      expect(navigationPaint, "Scrolled headings must not show through navigation").not.toMatch(/rgba|transparent/);
      const title = await page.getByRole("main").getByRole("heading", { level: 1 }).boundingBox();
      expect(title!.y, `${route} headline clears the sticky header`).toBeGreaterThanOrEqual(initialHeader!.y + initialHeader!.height);
      for (const section of await page.locator('[data-skiper="28"], [data-skiper="31"]').all()) {
        for (const progress of [0, .25, .5, .75, 1]) {
          await section.evaluate((element, progress) => window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY - window.innerHeight * .65 + element.clientHeight * progress), progress);
          await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
          const defects = await section.evaluate(element => {
            const bounds = element.getBoundingClientRect();
            const text = element.querySelector<HTMLElement>('[data-motion-static]')!;
            const textBounds = text.getBoundingClientRect();
            const issues: string[] = [];
            if (element.getAttribute("data-skiper") === "28") {
              if (textBounds.left < bounds.left - 2 || textBounds.right > bounds.right + 2 || textBounds.top < bounds.top - 2 || textBounds.bottom > bounds.bottom + 2) issues.push("Perspective copy escaped its section");
              if (bounds.height > textBounds.height + 180) issues.push("Empty perspective scroll track");
            } else {
              for (const word of element.querySelectorAll<HTMLSpanElement>('div > span')) {
                const letters = [...word.querySelectorAll<HTMLElement>('[data-motion-static]')];
                for (let i = 0; i < letters.length; i++) {
                  const rect = letters[i].getBoundingClientRect();
                  if (rect.left < bounds.left - 2 || rect.right > bounds.right + 2 || rect.top < bounds.top - 2 || rect.bottom > bounds.bottom + 2) issues.push("Character clipped by story bounds");
                  if (i && rect.left < letters[i - 1].getBoundingClientRect().right - 1) issues.push("Adjacent characters overlap");
                }
              }
              if (bounds.height > 430) issues.push("Unjustified text story height");
            }
            const next = element.nextElementSibling?.getBoundingClientRect();
            if (next && textBounds.bottom > next.top + 2) issues.push("Animated copy overlaps following content");
            return issues;
          });
          expect(defects, `${route}, progress ${progress}`).toEqual([]);
        }
      }
      const carousel = page.locator('[data-skiper="47"]').first();
      if (await carousel.count()) {
        await carousel.scrollIntoViewIfNeeded();
        const header = await page.getByRole("banner").boundingBox();
        const bounds = await carousel.boundingBox();
        expect(bounds!.y).toBeGreaterThanOrEqual(header!.y + header!.height);
        const active = carousel.locator(".swiper-slide-active");
        await expect(active.locator('[data-media-fallback="true"], img')).toBeVisible();
        await expect.poll(() => active.evaluate(element => Boolean(element.querySelector('[data-media-fallback="true"]')) || [...element.querySelectorAll("img")].some(image => image.complete && image.naturalWidth > 0))).toBe(true);
        expect(await active.evaluate(element => {
          const bounds = element.getBoundingClientRect();
          return [...element.querySelectorAll("strong")].every(title => {
            const rect = title.getBoundingClientRect();
            return rect.left >= bounds.left - 2 && rect.right <= bounds.right + 2 && title.scrollWidth <= title.clientWidth + 2;
          });
        })).toBe(true);
        await expect(carousel).not.toContainText(/R4.*[0-9a-f]{8}-[0-9a-f]{4}-/i);
      }
      if (route === "/partners") {
        const story = page.locator('[data-skiper="28"]');
        await expect(story).not.toContainText(/[0-9a-f]{8}-[0-9a-f]{4}-/i);
        // Directory records remain available with their truthful original titles.
        await expect(page.getByRole("heading", { name: "Industry partners", exact: true })).toBeVisible();
      }
    }
  });
}
