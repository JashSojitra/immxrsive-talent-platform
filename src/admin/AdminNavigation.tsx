"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import admin from "./admin.module.css";

export function AdminNavigation({ role }: { role: string }) {
  const pathname = usePathname();
  const links = [
    { href: "/admin", label: "Overview" },
    { href: "/admin/partners", label: "Partnerships & requests" },
    { href: "/admin/projects", label: "Project library" },
    ...(["xr_admin", "platform_super_admin"].includes(role) ? [{ href: "/admin/projects/new", label: "Create project" }] : []),
    { href: "/admin/reviews", label: "Technical reviews" },
    { href: "/admin/activity", label: "Activity & audit" },
    { href: "/admin/settings", label: "Settings" },
    ...(role === "platform_super_admin" ? [{ href: "/admin/settings/access", label: "Staff access" }] : []),
  ];
  return <nav className={admin.sidebar} aria-label="Administration"><p>Manage platform</p>{links.map(link => {
    const active = pathname === link.href || link.href !== "/admin" && !["/admin/settings", "/admin/projects"].includes(link.href) && pathname.startsWith(`${link.href}/`) || link.href === "/admin/projects" && pathname.startsWith("/admin/projects/") && !pathname.startsWith("/admin/projects/new");
    return <Link href={link.href} key={link.href} aria-current={active ? "page" : undefined}>{link.label}</Link>;
  })}</nav>;
}
