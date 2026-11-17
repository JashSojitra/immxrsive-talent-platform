import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/auth/server";
import { getRuntimeDatabase } from "@/db/runtime";
import { accessList, adminActivity, adminDetail, adminIdentity, adminList } from "@/admin/service";
import { canManage } from "@/admin/policy";
import { projectPresentation } from "@/admin/public";
import { AdminShell } from "@/admin/AdminShell";
import { AdminEditor } from "@/admin/Editor";
import { AdminAccess } from "@/admin/Access";
import { AdminProjectList } from "@/admin/ProjectList";
import { ProjectDetailView } from "@/components/project-detail/ProjectDetailView";
import { ProjectError } from "@/projects/service";
import styles from "@/components/project-editor/project-editor.module.css";
import admin from "@/admin/admin.module.css";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Administration", robots: { index: false, follow: false } };
export default async function AdminPage({ params, searchParams }: { params: Promise<{ section?: string[] }>; searchParams: Promise<{ status?: string }> }) {
  const { section = [] } = await params;
  const path = `/admin${section.length ? `/${section.join("/")}` : ""}`;
  const user = await getAuthenticatedUser();
  if (!user) redirect(`/admin/sign-in?callbackURL=${encodeURIComponent(path)}`);
  const db = getRuntimeDatabase();
  let identity;
  try { identity = await adminIdentity(db, user.id); }
  catch (e) { if (!(e instanceof ProjectError) || e.status !== 403) throw e; return <AdminShell title="Administrator access required" role="no staff role"><p>Your signed-in account has no administrator access. Ask a platform super administrator to grant an appropriate role using your internal account ID.</p><p>Internal account ID: <code>{user.id}</code></p><Link href="/student/dashboard">Return to your account</Link></AdminShell>; }
  const shell = (title: string, children: React.ReactNode) => <AdminShell title={title} role={identity.role}>{children}</AdminShell>;
  if (!section.length) {
    const [data, events] = await Promise.all([adminList(db, user.id), adminActivity(db, user.id)]);
    return shell("Prepare work. Publish experiences.", <><p>Receive a repository, prepare an independent demonstration and publish its story. Administrator-managed projects have no student-dependent gates.</p><div className={styles.actions}>{canManage(identity.role) && <><Link href="/admin/projects/new">Create project</Link><Link href="/admin/projects/new#intake-repository">Import repository</Link></>}<Link href="/admin/reviews">Review technical readiness</Link></div><div className={admin.metrics}>{["draft", "published", "unpublished", "archived"].map(state => <Link key={state} href={`/admin/projects?status=${state}`}><strong>{data.projects.filter(p => p.lifecycle === state).length}</strong>{state}</Link>)}</div><h2>Recently updated</h2><AdminProjectList rows={data.projects.slice(0, 6)} /><h2>Recent activity</h2><EventList events={events.slice(0, 5)} /></>);
  }
  if (section[0] === "projects") {
    if (section.length === 1) { const data = await adminList(db, user.id); const filter = (await searchParams).status; return shell("Project library", <><p>Admin-managed projects only. Existing student ownership remains independent.</p>{canManage(identity.role) && <Link href="/admin/projects/new">Create / import project</Link>}<AdminProjectList rows={data.projects} initialStatus={["draft", "published", "unpublished", "archived"].includes(filter ?? "") ? filter : "all"} /></>); }
    if (section[1] === "new" && section.length === 2) return shell("Create a project", canManage(identity.role) ? <AdminEditor role={identity.role} /> : <p>Your curator role can review existing projects. Creation requires XR admin or platform super admin access.</p>);
    if (section.length > 3 || section[2] && !["edit", "preview", "demo"].includes(section[2])) notFound();
    let detail;
    try { detail = await adminDetail(db, user.id, section[1]); } catch (e) { if (e instanceof ProjectError && e.status === 404) notFound(); throw e; }
    if (section[2] === "preview") return <ProjectDetailView project={projectPresentation(detail.project.id, detail.detail.content)} preview />;
    return shell(detail.project.title, <><AdminEditor initial={detail.detail.content} record={{ id: detail.project.id, version: detail.project.version, lifecycle: detail.detail.lifecycle }} role={detail.role} focusDemo={section[2] === "demo"} /><h2>Project activity</h2><EventList events={detail.events} /></>);
  }
  if (section.join("/") === "activity") return shell("Activity ledger", <><p>Latest 100 administrator events. Each content change records its saved revision atomically.</p><EventList events={await adminActivity(db, user.id)} /></>);
  if (section.join("/") === "reviews") {
    const data = await adminList(db, user.id);
    return shell("Technical reviews", <><p>Review draft presentations and test hosted experiences before publication. These checks are advisory; administrator publishing has no student approval queue.</p><AdminProjectList rows={data.projects.filter(p => p.lifecycle === "draft" || p.lifecycle === "unpublished")} /></>);
  }
  if (section.join("/") === "settings/access") {
    if (identity.role !== "platform_super_admin") return shell("Staff access", <p>Platform super administrator access is required.</p>);
    return shell("Staff access", <AdminAccess initial={await accessList(db, user.id)} />);
  }
  if (section.join("/") === "settings") return shell("Administration settings", <><p>Signed in as {user.name}. Internal account ID: <code>{user.id}</code></p><p>Role: {identity.role}. Role changes take effect on each protected operation.</p><h2>Publishing policy</h2><p>Administrator-managed projects can be published directly. Student-managed projects and their XR Studio approvals remain owner-controlled. Demo hosting and adaptations happen outside this application.</p><h2>Operational setup</h2><p>First-super-admin bootstrap and environment changes require a separately authorized operator. The release includes administrator operations, intake and release guides under docs/admin-onboarding-*.md.</p>{identity.role === "platform_super_admin" && <Link href="/admin/settings/access">Manage staff access</Link>}</>);
  notFound();
}
function EventList({ events }: { events: Awaited<ReturnType<typeof adminActivity>> }) {
  return <>{events.map(e => <article className={styles.card} key={e.id}><h3>{e.action.replaceAll("_", " ")}</h3><p>{e.note || "No additional note"}</p><small>{new Date(e.createdAt).toISOString()} / Staff {e.actorUserId}</small>{e.projectId && <p><Link href={`/admin/projects/${e.projectId}`}>Open project</Link></p>}<details><summary>Saved event snapshot</summary><pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{JSON.stringify(e.snapshot, null, 2)}</pre></details></article>)}{!events.length && <p>No administrator activity yet.</p>}</>;
}
