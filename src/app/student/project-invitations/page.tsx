import Link from "next/link";
import { requireVerifiedStudent } from "@/auth/server";
import { ProjectWorkspace } from "@/components/project-editor/ProjectWorkspace";
import styles from "@/components/project-editor/project-editor.module.css";
import { getRuntimeDatabase } from "@/db/runtime";
import { getPrivateStudentProfile } from "@/profile/service";
import { listProjectRelationships, listOwnJoinRequests } from "@/projects/service";
export const dynamic = "force-dynamic";
export const metadata = { title: "Project invitations", robots: { index: false, follow: false } };
export default async function InvitationsPage() {
  const { user } = await requireVerifiedStudent("/student/project-invitations"); const db = getRuntimeDatabase();
  const profile = await getPrivateStudentProfile(db, user.id);
  const relationships = profile ? await listProjectRelationships({ db, actorUserId: user.id }) : [];
  const requests = profile ? await listOwnJoinRequests({ db, actorUserId: user.id }) : [];
  return <ProjectWorkspace title="Make room for collaboration." intro="Review private invitations, shape your contribution and respond to maintenance offers. Nothing represents you as an accepted contributor before your consent.">
    <h2>My join requests</h2>{requests.length ? requests.map(r => <article className={styles.card} key={r.id}><h3>{r.title}</h3><p>Join request: {r.state}</p><p>Approval sends a proposed-role invitation. You still decide whether to accept.</p>{r.state === "approved" ? <Link href={`/student/projects/${r.projectId}/team`}>Review proposed-role invitation</Link> : null}</article>) : <p>No join requests yet.</p>}
    <h2>Invitations &amp; shared projects</h2>
    {relationships.length ? relationships.map(p => <article key={p.membershipId} className={styles.card}><p className={styles.eyebrow}>{p.state === "pending" ? "Invitation awaiting your response" : p.state}</p><h2><Link href={`/student/projects/${p.id}/team`}>{p.title}</Link></h2><p>{p.description}</p><p>Proposed role: {p.proposedRole}</p>{p.pendingMaintenance ? <p>Maintenance offer awaiting your response.</p> : null}<code>{p.id}</code><div className={styles.actions}><Link href={`/student/projects/${p.id}/team`}>{p.state === "pending" ? "Review invitation" : "Open contribution & team"}</Link></div></article>) : <p>No invitations or shared relationships yet. {profile ? "A maintainer can invite your platform profile." : <Link href="/student/profile/edit">Create a private student profile first.</Link>}</p>}
  </ProjectWorkspace>;
}
