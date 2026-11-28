import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { expect, test } from "@playwright/test";
import { eq } from "drizzle-orm";
import { createDatabase } from "../../src/db/client";
import * as schema from "../../src/db/schema";

test("main routes use the shared display font and fit the viewport", async ({ page }, info) => {
  test.setTimeout(120_000);
  const db = createDatabase(process.env.TEST_DATABASE_URL!);
  const suffix = randomUUID();
  const origin = "http://127.0.0.1:3100";
  const capture = process.env.IMMXRSIVE_STYLE_CAPTURE;
  await page.emulateMedia({ reducedMotion: "reduce" });
  if (capture) await mkdir(capture, { recursive: true });

  async function visit(path: string, name: string, status = 200) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(status);
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading, path).toBeVisible();
    await expect(heading, path).toHaveCSS("font-family", /Bricolage Grotesque Variable/);
    if (["updates", "article", "partners", "partner"].includes(name)) {
      await expect(page.locator("main .ui-eyebrow").first(), path).toHaveCSS("color", "rgb(255, 111, 174)");
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth), path)
      .toBeLessThanOrEqual(page.viewportSize()!.width);
    if (capture) {
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: join(capture, name + "-" + info.project.name + ".png") });
    }
  }

  let partnerId: string | undefined;
  let authorId: string | undefined;
  try {
    const [author] = await db.db.insert(schema.authUsers).values({
      id: suffix, name: "ImmXrsive editorial team", email: suffix + "@example.test",
    }).returning();
    authorId = author.id;
    const [article] = await db.db.insert(schema.articles).values({
      slug: "design-review-" + suffix, category: "news", status: "published",
      title: "Inside the XR studio", excerpt: "Explore the work behind an immersive experience.",
      bodyMarkdown: "Behind the scenes with the studio team.", publishedAt: new Date(),
      authorDisplayName: author.name, createdBy: author.id, updatedBy: author.id,
    }).returning();
    const [partner] = await db.db.insert(schema.partnerCompanies).values({
      status: "published",
      content: { name: "North Shore Design Lab", website: "", description: "A local design review fixture.", sector: "XR", location: "Ontario" },
    }).returning();
    partnerId = partner.id;

    const routes = [
      ["/talent", "talent"], ["/students/S01", "student"], ["/projects", "projects"],
      ["/projects/P01", "project"], ["/showcase", "showcase"], ["/partners", "partners"],
      ["/partners/" + partner.id, "partner"], ["/updates", "updates"], ["/updates/" + article.slug, "article"],
      ["/contact", "contact"], ["/inquiry/student/S01", "student-inquiry"],
      ["/inquiry/project/P01", "project-inquiry"], ["/inquiry/partner/" + partner.id, "partner-inquiry"],
      ["/student/sign-in", "sign-in"],
    ];
    for (const [path, name] of routes) await visit(path, name);
    await visit("/missing-design-review-page", "not-found", 404);
    await expect(page.getByRole("main").getByRole("link", { name: "Return home" })).toHaveAttribute("href", "/");

    const auth = betterAuth({
      baseURL: origin, secret: "browser-test-secret-with-at-least-thirty-two-characters",
      database: drizzleAdapter(db.db, { provider: "pg", schema: {
        user: schema.authUsers, session: schema.authSessions, account: schema.authAccounts,
        verification: schema.authVerifications,
      } }),
      emailAndPassword: { enabled: true }, advanced: { cookiePrefix: "immxrsive" },
    });
    const response = await auth.handler(new Request(origin + "/api/auth/sign-up/email", {
      method: "POST", headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Design Review Student", email: "student-" + suffix + "@example.test", password: "local-browser-design-review-password" }),
    }));
    expect(response.status).toBe(200);
    const { user } = await response.json() as { user: { id: string } };
    const cookie = response.headers.getSetCookie().find(value => value.includes("session_token="))!.split(";")[0];
    const split = cookie.indexOf("=");
    await page.context().addCookies([{ name: cookie.slice(0, split), value: cookie.slice(split + 1), url: origin, httpOnly: true, sameSite: "Lax" }]);
    await visit("/student/verify", "verify");
    await db.db.insert(schema.studentAffiliations).values({ userId: user.id, institutionalEmail: suffix + "@algomau.ca", verifiedAt: new Date() });
    await db.db.insert(schema.studioRoles).values({ userId: user.id, role: "platform_super_admin" });
    await visit("/student/dashboard", "dashboard");
    await visit("/student/profile/edit", "profile-editor");
    await visit("/admin", "admin");
  } finally {
    if (partnerId) await db.db.delete(schema.partnerCompanies).where(eq(schema.partnerCompanies.id, partnerId));
    if (authorId) await db.db.update(schema.articles).set({ status: "archived" }).where(eq(schema.articles.createdBy, authorId));
    await db.client.end();
  }
});
