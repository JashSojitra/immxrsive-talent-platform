import { getRuntimeDatabase } from "@/db/runtime";
import { publicArticles } from "@/updates/service";
import { siteUrl } from "@/updates/policy";
export const dynamic = "force-dynamic";
const xml = (value: string) => value.replace(/[<>&"']/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]!);
export async function GET() {
  const posts = await publicArticles(getRuntimeDatabase(), undefined, 50);
  const items = posts.map(a=>`<item><title>${xml(a.title)}</title><link>${siteUrl}/updates/${a.slug}</link><guid isPermaLink="true">${siteUrl}/updates/${a.slug}</guid><description>${xml(a.excerpt)}</description><category>${a.category}</category>${a.publishedAt ? `<pubDate>${a.publishedAt.toUTCString()}</pubDate>` : ""}</item>`).join("");
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>ImmXrsive Updates &amp; Stories</title><link>${siteUrl}/updates</link><description>Student stories, events and news.</description>${items}</channel></rss>`, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
