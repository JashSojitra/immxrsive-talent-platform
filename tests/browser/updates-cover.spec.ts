import { createHash, randomUUID } from "node:crypto";
import sharp from "sharp";
import { expect, test } from "@playwright/test";
import { eq } from "drizzle-orm";
import { createDatabase } from "../../src/db/client";
import * as s from "../../src/db/schema";

test("uploaded and branded covers keep the same card and article shape", async ({ page }, info) => {
  const c = createDatabase(process.env.TEST_DATABASE_URL!);
  const id = randomUUID();
  try {
    await c.db.insert(s.authUsers).values({ id, name: "Cover fixture editor", email: `${id}@example.test` });
    const bytes = await sharp({ create: { width: 800, height: 450, channels: 3, background: "#582c83" } }).png().toBuffer();
    const [media] = await c.db.insert(s.mediaAssets).values({ ownerUserId: id, kind: "article_cover", mime: "image/png", width: 800, height: 450, byteSize: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex"), bytes }).returning();
    const articles = await c.db.insert(s.articles).values([
      { slug: `coverless-${id}`, title: "Inside the XR studio", coverMediaId: null, coverAlt: "" },
      { slug: `covered-${id}`, title: "Building the next immersive experience", coverMediaId: media.id, coverAlt: "Test fixture: plain purple graphic" },
    ].map(a => ({ ...a, category: "news" as const, status: "published" as const, excerpt: "Browser test fixture only.", bodyMarkdown: "Test-only cover layout verification.", publishedAt: new Date(), authorDisplayName: "Fixture editor", createdBy: id, updatedBy: id }))).returning();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/updates?category=news");
    const cards = articles.map(a => page.getByRole("article").filter({ has: page.getByRole("heading", { name: a.title, exact: true }) }));
    const boxes = [];
    for (const card of cards) {
      await expect(card).toBeVisible();
      boxes.push((await card.locator('[class*="coverFrame"]').boundingBox())!);
      const title = card.getByRole("heading").getByRole("link");
      expect(await title.evaluate(e => getComputedStyle(e).textDecorationLine)).toBe("none");
      await title.focus();
      await expect(title).toHaveCSS("text-decoration-line", "underline");
      expect(await title.evaluate(e => getComputedStyle(e).outlineStyle)).not.toBe("none");
    }
    expect(boxes[0].height).toBeCloseTo(boxes[1].height, 0);
    expect(boxes[0].width / boxes[0].height).toBeCloseTo(1.6, 1);
    await cards[1].getByRole("heading").getByRole("link").blur();
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    await page.screenshot({ path: `test-results/updates-covers-${info.project.name}.png`, fullPage: true });
    for (const article of articles) {
      await page.goto(`/updates/${article.slug}`);
      const hero = page.locator('[class*="heroCover"]');
      await expect(hero).toBeVisible();
      const box = (await hero.boundingBox())!;
      expect(box.width / box.height).toBeCloseTo(1.6, 1);
      if (!article.coverMediaId) await expect(hero.getByRole("img", { name: "ImmXrsive News cover" })).toBeVisible();
    }
  } finally {
    await c.db.update(s.articles).set({ status: "archived" }).where(eq(s.articles.createdBy, id));
    await c.client.end();
  }
});
