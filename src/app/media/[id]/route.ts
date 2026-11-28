import { eq } from "drizzle-orm";
import { z } from "zod";
import { getRuntimeDatabase } from "@/db/runtime";
import { mediaAssets } from "@/db/schema";
export const runtime = "nodejs";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return new Response(null, { status: 404 });
  const [m] = await getRuntimeDatabase().select().from(mediaAssets).where(eq(mediaAssets.id, id));
  if (!m) return new Response(null, { status: 404 });
  const etag = `"${m.sha256}"`;
  const headers = { "Content-Type": m.mime, ETag: etag, "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" };
  if (request.headers.get("if-none-match")?.split(",").map(v => v.trim().replace(/^W\//, "")).includes(etag)) return new Response(null, { status: 304, headers });
  return new Response(new Uint8Array(m.bytes), { headers: { ...headers, "Content-Length": String(m.byteSize) } });
}
