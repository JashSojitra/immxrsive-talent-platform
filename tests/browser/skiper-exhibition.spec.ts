import { expect, test } from "@playwright/test";

test("registry carousel responds to buttons, pagination, keyboard and dragging, then opens real project evidence", async ({ page }) => {
  await page.goto("/");
  const carousel = page.locator('[data-skiper="47"]');
  await carousel.scrollIntoViewIfNeeded();
  const active = carousel.locator(".swiper-slide-active");
  const first = await active.getAttribute("aria-label");
  await carousel.getByRole("button", { name: "Next slide" }).click();
  await expect(active).not.toHaveAttribute("aria-label", first!);
  await carousel.getByRole("button", { name: "Go to slide 1", exact: true }).click();
  await expect(active).toHaveAttribute("aria-label", first!);
  await page.keyboard.press("ArrowRight");
  await expect(active).not.toHaveAttribute("aria-label", first!);
  await carousel.getByRole("button", { name: "Go to slide 1", exact: true }).click();
  await expect(active).toHaveAttribute("aria-label", first!);
  const box = await carousel.locator(".swiper").boundingBox();
  if (!box) throw new Error("Carousel is not rendered");
  await page.mouse.move(box.x + box.width * .7, box.y + 200);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * .15, box.y + 200, { steps: 15 });
  await page.mouse.up();
  await expect(active).not.toHaveAttribute("aria-label", first!);
  if (test.info().project.name === "mobile-390") {
    await carousel.getByRole("button", { name: "Go to slide 1", exact: true }).tap();
    await expect(active).toHaveAttribute("aria-label", first!);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: box.x + box.width * .8, y: box.y + 200 }] });
    for (let i = 1; i <= 12; i++) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: box.x + box.width * (.8 - i * .05), y: box.y + 200 }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect(active).not.toHaveAttribute("aria-label", first!);
    await cdp.detach();
  }
  const link = active.getByRole("link");
  const href = await link.getAttribute("href");
  await link.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(`${href}$`));
  await expect(page.getByRole("main").getByRole("heading", { level: 1 })).toBeVisible();
});

test("actual scroll components transform as the visitor moves through the story", async ({ page }) => {
  await page.goto("/");
  for (const id of ["28", "31"]) {
    const section = page.locator(`[data-skiper="${id}"]`).first();
    const animated = section.locator("[data-motion-static]").first();
    await section.evaluate(element => window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY - window.innerHeight * .8));
    const before = await animated.getAttribute("style");
    await section.evaluate(element => window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY + 200));
    await expect.poll(() => animated.getAttribute("style")).not.toBe(before);
  }
});

test("registry navigation rolls on hover and remains keyboard and touch navigable", async ({ page }) => {
  await page.goto("/talent");
  const menu = page.getByRole("button", { name: "Open navigation menu" });
  const mobile = await menu.isVisible();
  if (mobile) await menu.tap();
  const nav = page.getByRole("navigation", { name: mobile ? "Mobile navigation" : "Main navigation", exact: true });
  const link = nav.getByRole("link", { name: "Projects", exact: true });
  const roll = link.locator('[data-skiper="58"]');
  await expect(roll).toBeVisible();
  if (!mobile) {
    await link.hover();
    await expect.poll(() => roll.locator("[data-motion-static]").first().evaluate(element => getComputedStyle(element).transform)).not.toBe("none");
  }
  await link.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/projects$/);
  await expect(page.locator('[data-skiper="47"]')).toBeVisible();
});

test("reduced motion stays readable, disables spatial transforms and keeps the carousel functional", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  for (const id of ["28", "31"]) {
    const section = page.locator(`[data-skiper="${id}"]`).first();
    await section.scrollIntoViewIfNeeded();
    await expect(section).toBeVisible();
    expect(await section.locator("[data-motion-static]").first().evaluate(element => getComputedStyle(element).transform)).toBe("none");
  }
  expect(await page.evaluate(() => document.documentElement.classList.contains("lenis"))).toBe(false);
  const carousel = page.locator('[data-skiper="47"]');
  await carousel.scrollIntoViewIfNeeded();
  const before = await carousel.locator(".swiper-slide-active").innerText();
  await carousel.getByRole("button", { name: "Next slide" }).click();
  await expect(carousel.locator(".swiper-slide-active")).not.toHaveText(before);
});

test("public routes fit 390px and 1440px with real rendered component captures", async ({ page }, info) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  const width = info.project.name === "mobile-390" ? 390 : 1440;
  await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
  for (const route of ["/", "/talent", "/projects", "/showcase", "/partners"]) {
    await page.goto(route);
    await expect(page.getByRole("main")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    const name = route === "/" ? "home" : route.slice(1);
    await page.screenshot({ path: `output/skiper-regression/${name}-${width}.png`, fullPage: true });
    if (route === "/") {
      await page.locator('[data-skiper="47"]').scrollIntoViewIfNeeded();
      await page.screenshot({ path: `output/skiper-regression/carousel-${width}.png` });
      await page.locator('[data-skiper="28"]').evaluate(element => window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY + element.clientHeight * .55));
      await page.screenshot({ path: `output/skiper-regression/perspective-${width}.png` });
      await page.locator('[data-skiper="31"]').scrollIntoViewIfNeeded();
      await page.screenshot({ path: `output/skiper-regression/text-scroll-${width}.png` });
      await page.evaluate(() => window.scrollTo(0, 0));
      const menu = page.getByRole("button", { name: "Open navigation menu" });
      if (await menu.isVisible()) {
        await menu.click();
        const lastDestination = page.getByRole("navigation", { name: "Mobile navigation", exact: true }).getByRole("link", { name: "Inquiries", exact: true });
        await expect(lastDestination).toHaveCSS("opacity", "1");
        await expect(lastDestination).toHaveCSS("transform", "none");
      }
      else await page.getByRole("navigation", { name: "Main navigation", exact: true }).getByRole("link", { name: "Projects", exact: true }).hover();
      await page.screenshot({ path: `output/skiper-regression/navigation-${width}.png` });
    }
  }
  expect(errors).toEqual([]);
});

test("native scrolling and the server rendered project index remain available without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL: "http://127.0.0.1:3100" });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.getByRole("main").getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator('[data-skiper="47"]').getByRole("link").first()).toBeVisible();
  await expect(page.locator('[data-skiper="47"]').getByRole("link").first()).toHaveAttribute("href", /^\/projects\//);
  await page.getByRole("main").getByRole("link", { name: "View all projects", exact: true }).click();
  await expect(page).toHaveURL(/\/projects$/);
  await expect(page.getByRole("main").getByRole("heading", { level: 1 })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.classList.contains("lenis"))).toBe(false);
  await context.close();
});
