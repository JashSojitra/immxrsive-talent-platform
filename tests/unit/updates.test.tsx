import { expect, test } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import sharp from "sharp";
import { articleInput, articleSlug, approvalInvalidated, emptyArticle, publishIssues, safeImageUrl, youtubeId } from "@/updates/policy";
import { processImage } from "@/updates/image";
import { Markdown } from "@/updates/Markdown";
test("slugs normalize accents and punctuation", () => { expect(articleSlug("  Café: Students & XR! ")).toBe("cafe-students-xr"); expect(articleSlug("---")).toBe(""); expect(articleSlug("a".repeat(140))).toHaveLength(120); });
test("an article cannot take the share-image route", () => { expect(articleInput.safeParse({ ...emptyArticle, title: "Test title", authorDisplayName: "Test author", slug: "og" }).success).toBe(false); });
test("student stories require approval and a published linked profile", () => {
  const story = { ...emptyArticle, title: "Test story", excerpt: "Test excerpt", bodyMarkdown: "Test body", category: "student_success" as const, studentProfileId: "00000000-0000-4000-8000-000000000001" };
  for (const [approved,published] of [[false,false],[true,false],[false,true]]) expect(publishIssues(story,approved,published)).not.toHaveLength(0);
  expect(publishIssues(story,true,true)).toHaveLength(0);
  expect(publishIssues({...story,category:"event"},false,false)).toHaveLength(0);
});
test("copy and identity edits clear approval; event metadata does not", () => {
  for (const key of ["title","excerpt","bodyMarkdown","coverAlt"] as const) expect(approvalInvalidated(emptyArticle,{...emptyArticle,[key]:"changed"})).toBe(true);
  expect(approvalInvalidated(emptyArticle,{...emptyArticle,studentProfileId:"00000000-0000-4000-8000-000000000001"})).toBe(true);
  expect(approvalInvalidated(emptyArticle,{...emptyArticle,eventLocation:"Brampton"})).toBe(false);
});
test("Markdown blocks raw HTML, unsafe images and scripts; links and GFM remain safe", () => {
  const html = renderToStaticMarkup(<Markdown body={'<script>alert(1)</script>\n\n![bad](javascript:alert)\n\n![bad](//evil.test/a.png)\n\n[link](https://example.test)\n\nhttps://youtu.be/abcdefghijk\n\n|a|b|\n|-|-|\n|1|2|'} />);
  expect(html).not.toContain("<script"); expect(html).not.toContain("javascript:"); expect(html).not.toContain('src="//'); expect(html).toContain('rel="noopener noreferrer"'); expect(html).toContain("youtube-nocookie.com/embed/abcdefghijk"); expect(html).toContain("<table");
  expect(safeImageUrl("/media/00000000-0000-4000-8000-000000000001")).toBe(true); expect(safeImageUrl("data:image/png;base64,a")).toBe(false); expect(youtubeId("https://youtube.com.evil.test/watch?v=abcdefghijk")).toBeNull();
});
test("image processing strips EXIF/GPS, converts WebP and bounds dimensions", async () => {
  const input = await sharp({ create: { width: 1800, height: 900, channels: 3, background: "red" } }).jpeg().withMetadata({ exif: { IFD0: { Artist: "Private artist" }, IFD3: { GPSLatitudeRef: "N", GPSLatitude: "43/1 1/1 1/1" } } }).toBuffer();
  expect((await sharp(input).metadata()).exif).toBeDefined();
  const avatar = await processImage(input,"avatar"); const meta = await sharp(avatar.bytes).metadata(); expect(meta.format).toBe("webp"); expect(meta.exif).toBeUndefined(); expect(meta.xmp).toBeUndefined(); expect(meta.icc).toBeUndefined(); expect([meta.width,meta.height]).toEqual([512,512]);
  expect((await processImage(input,"article_cover")).width).toBe(1600); expect((await processImage(input,"article_inline")).width).toBe(1400); await expect(processImage(Buffer.from("not an image"),"avatar")).rejects.toThrow(); await expect(processImage(Buffer.alloc(8*1024*1024+1),"avatar")).rejects.toThrow();
});
