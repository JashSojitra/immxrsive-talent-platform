import sharp from "sharp";
import { createHash } from "node:crypto";
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export async function processImage(bytes: Buffer, kind: "avatar" | "article_cover" | "article_inline", position: "centre" | "north" | "south" | "east" | "west" = "centre") {
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) throw new Error("Use an image up to 8 MB.");
  const image = sharp(bytes, { limitInputPixels: 40_000_000, animated: false });
  const metadata = await image.metadata();
  if (!["jpeg", "png", "webp"].includes(metadata.format || "") || (metadata.pages ?? 1) > 1) throw new Error("Use a static JPG, PNG or WebP image.");
  const result = await image.rotate().resize(kind === "avatar" ? { width: 512, height: 512, fit: "cover", position } : { width: kind === "article_cover" ? 1600 : 1400, withoutEnlargement: true }).webp({ quality: 84 }).toBuffer({ resolveWithObject: true });
  // Sharp strips metadata by default; never use keepMetadata/withMetadata here.
  return { bytes: result.data, mime: "image/webp", width: result.info.width, height: result.info.height, byteSize: result.data.length, sha256: createHash("sha256").update(result.data).digest("hex") };
}
