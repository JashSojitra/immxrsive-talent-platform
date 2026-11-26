import Link from "next/link";
import { getAuthenticatedUser, getStudentVerificationStatus } from "@/auth/server";
import { getRuntimeDatabase } from "@/db/runtime";
import { staffRole } from "@/studio/service";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { SiteNavigation, type AccountLink } from "./SiteNavigation";
import styles from "./site.module.css";
export async function SiteHeader() {
  const user = await getAuthenticatedUser();
  const accountLinks: AccountLink[] = [];
  if (user) {
    const [affiliation, role] = await Promise.all([getStudentVerificationStatus(user.id), staffRole(getRuntimeDatabase(), user.id)]);
    accountLinks.push({ href: "/student/dashboard", label: affiliation.status === "verified" ? "Student Dashboard" : "Student workspace" });
    if (role) accountLinks.push({ href: "/admin", label: "Admin Dashboard" });
  } else accountLinks.push({ href: "/student/sign-in", label: "Student sign in" });
  return <header className={styles.header}>
    <a className={styles.skip} href="#site-content">Skip to content</a>
    <div className={styles.portalBar}>
      <span><i aria-hidden="true" />Talent &amp; Industry Platform</span>
      <Link href="/admin">Staff / Admin Portal <span aria-hidden="true">&#8599;</span></Link>
    </div>
    <div className={styles.headerBar}>
      <div className={styles.headerInner}>
        <BrandLogo />
        <SiteNavigation accountLinks={accountLinks} />
      </div>
    </div>
  </header>;
}
