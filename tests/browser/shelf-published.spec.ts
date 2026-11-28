import { createHash, randomUUID } from "node:crypto";
import sharp from "sharp";
import { expect, test } from "@playwright/test";
import { eq } from "drizzle-orm";
import { createDatabase } from "../../src/db/client";
import * as s from "../../src/db/schema";

test("a published student story fills the static shelf from the world API", async ({ page }, info) => {
  const c = createDatabase(process.env.TEST_DATABASE_URL!);
  const userId = randomUUID();
  try {
    await c.db.insert(s.authUsers).values({ id: userId, name: "Published fixture student", email: `${userId}@example.test` });
    const bytes = await sharp({ create: { width: 240, height: 240, channels: 3, background: "#e31c79" } }).png().toBuffer();
    const [photo] = await c.db.insert(s.mediaAssets).values({ ownerUserId: userId, kind: "avatar", mime: "image/png", width: 240, height: 240, byteSize: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex"), bytes }).returning();
    const [profile] = await c.db.insert(s.studentProfiles).values({ ownerUserId: userId, publicationStatus: "published", avatarMediaId: photo.id, headline: "XR design student", studentStatus: "current" }).returning();
    const slug = `published-shelf-${randomUUID()}`;
    await c.db.insert(s.articles).values({ slug, category: "student_success", status: "published", title: "A published shelf fixture", excerpt: "A test-only published student story.", bodyMarkdown: "Browser fixture only.", studentProfileId: profile.id, studentApprovedAt: new Date(), publishedAt: new Date(), authorDisplayName: "Fixture editor", createdBy: userId, updatedBy: userId });
    const volumes = await (await page.request.get("/api/world/stories")).json();
    expect(volumes).toContainEqual(expect.objectContaining({ name: "Published fixture student", photoUrl: `/media/${photo.id}`, href: `/updates/${slug}` }));
    // Exercise the actual unavailable-WebGL path, while preserving 2D image canvases.
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, ...args: Parameters<typeof original>) {
        if (String(args[0]).startsWith("webgl")) return null;
        return original.apply(this, args);
      } as typeof original;
    });
    if (info.project.name === "desktop") await page.setViewportSize({ width: 1280, height: 1000 });
    await page.goto("/world/stories-shelf.html");
    const book = page.locator("#static-fallback .fallback-book").filter({ hasText: "Published fixture student" });
    await expect(book).toBeVisible();
    await expect(book).toContainText("XR design student");
    await expect(book.getByRole("img", { name: "Published fixture student" })).toHaveAttribute("src", `/media/${photo.id}`);
    await expect.poll(() => book.locator("img").evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(240);
    const fullStory = book.getByRole("link", { name: "Read the full story" });
    await expect(fullStory).toHaveAttribute("href", `/updates/${slug}`);
    await fullStory.scrollIntoViewIfNeeded();
    await expect(fullStory).toBeVisible();
    await page.screenshot({ path: `test-results/shelf-published-${info.project.name}.png`, fullPage: true });
    await fullStory.click();
    await expect(page.getByRole("heading", { level: 1, name: "A published shelf fixture" })).toBeVisible();
  } finally {
    await c.db.update(s.studentProfiles).set({ publicationStatus: "unpublished" }).where(eq(s.studentProfiles.ownerUserId, userId));
    await c.client.end();
  }
});
