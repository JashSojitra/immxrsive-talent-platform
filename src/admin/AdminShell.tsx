import { SignOutButton } from "@/components/auth/SignOutButton";
import type { ReactNode } from "react";
import styles from "@/components/project-editor/project-editor.module.css";
import { AdminNavigation } from "./AdminNavigation";
import admin from "./admin.module.css";

export function AdminShell({ title, children, role }: { title: string; children: ReactNode; role: string }) {
  const staff = ["xr_curator", "xr_admin", "platform_super_admin"].includes(role);
  return <div className={`${styles.workspace} ${admin.portal}`}>
    <a className={styles.skip} href="#admin-main">Skip to administration</a>
    <div className={admin.toolbar}><p><span className={admin.portalMark} aria-hidden="true" />Staff / Admin Portal <span className={admin.role}>{role.replaceAll("_", " ")}</span></p>{staff && <SignOutButton callbackURL="/admin/sign-in" />}</div>
    <div className={staff ? admin.frame : admin.accessFrame}>
      {staff && <AdminNavigation role={role} />}
      <main id="admin-main" tabIndex={-1} className={admin.main}><p className={`ui-eyebrow ${styles.eyebrow}`}>{staff ? "Platform management" : "Secure staff access"}</p><h1 className="ui-display">{title}</h1>{children}</main>
    </div>
  </div>;
}
