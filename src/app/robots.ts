import type { MetadataRoute } from "next";
import { siteUrl } from "@/updates/policy";
export default function robots(): MetadataRoute.Robots { return { rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/student$", "/student/", "/api"] }, sitemap: `${siteUrl}/sitemap.xml` }; }
