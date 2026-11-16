import { SignOutButton } from "@/components/auth/SignOutButton";
import Link from "next/link";
import type { ReactNode } from "react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import styles from "@/components/project-editor/project-editor.module.css";
import admin from "./admin.module.css";
export function AdminShell({ title, children, role }: { title: string; children: ReactNode; role: string }) {
  return <div className={`${styles.workspace} ${admin.portal}`}><a className={styles.skip} href="#admin-main">Skip to administration</a>
    <header className={styles.nav}><BrandLogo /><p>Administration / {role.replaceAll("_", " ")}</p><Link href="/showcase">Public showcase</Link>{role !== "secure staff access" && <SignOutButton callbackURL="/admin/sign-in" />}</header>
    <div className={admin.frame}><nav className={admin.sidebar} aria-label="Administration"><Link href="/admin">Overview</Link><Link href="/admin/projects">Projects</Link><Link href="/admin/projects/new">Create project</Link><Link href="/admin/reviews">Technical reviews</Link><Link href="/admin/activity">Activity</Link><Link href="/admin/settings">Settings</Link>{role === "platform_super_admin" && <Link href="/admin/settings/access">Staff access</Link>}</nav>
      <main id="admin-main" tabIndex={-1} className={admin.main}><p className={styles.eyebrow}>Platform studio / Admin-managed projects</p><h1>{title}</h1>{children}</main></div>
    <footer className={styles.footer}><span>NOT ImmXrsive / Administrator studio</span><Link href="/talent">Explore talent</Link></footer>
  </div>;
}
