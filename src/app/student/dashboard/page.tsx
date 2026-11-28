import { studentStoriesForApproval } from "@/updates/service";
import { StudentApprovals } from "@/updates/StudentApprovals";
﻿import type { Metadata } from "next";
import Link from "next/link";

import { getInternalUserId, getStudentVerificationStatus, requireAuthenticatedUser } from "@/auth/server";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { getRuntimeDatabase } from "@/db/runtime";
import { getPrivateStudentProfile } from "@/profile/service";
import { listProjectRelationships } from "@/projects/service";
import { queryCuratedCredits } from "@/admin/public";
import styles from "./dashboard.module.css";

export const metadata: Metadata = {
  title: "Student dashboard",
  description: "Your private profile, projects and collaborations.",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function StudentDashboardPage() {
  const user = await requireAuthenticatedUser("/student/dashboard");
  const verification = await getStudentVerificationStatus(user.id);
  const verified = verification.status === "verified";
  const db = getRuntimeDatabase();
  const profile = verified ? await getPrivateStudentProfile(db, user.id) : null;
  const relationships = profile ? await listProjectRelationships({ db, actorUserId: user.id }) : [];
  // Read-only: staff credits grant no membership, editing or ownership.
  const credits = profile ? await queryCuratedCredits(db, profile.id) : [];
  const pendingStories = await studentStoriesForApproval(db, user.id);
  const projects = relationships.filter(project => project.state === "accepted");
  const invitations = relationships.filter(project => project.state === "pending" || project.pendingMaintenance);
  const checklist = [
    { label: "Account created", complete: true },
    { label: "University affiliation verified", complete: verified },
    { label: "Add your headline", complete: Boolean(profile?.headline.trim()) },
    { label: "Introduce yourself", complete: Boolean(profile?.biography.trim()) },
    { label: "Choose your skills", complete: Boolean(profile?.skillIds.length) },
  ];
  const completed = checklist.filter(item => item.complete).length;

  return <main className={styles.dashboard}>
    <header className={styles.heading}>
      <div><p className={`ui-eyebrow ${styles.eyebrow}`}>Student workspace</p><h1 className="ui-display">Your next chapter<br />starts <em className="ui-display-accent">here.</em></h1><p>Welcome back, {user.name}. Shape your portfolio and keep your work moving.</p></div>
      {verified && profile ? <Link className="ui-button ui-button-primary" href="/student/projects/new">Create project <span aria-hidden="true">↗</span></Link> : <Link className="ui-button ui-button-primary" href={verified ? "/student/profile/edit" : "/student/verify"}>{verified ? "Create your profile" : "Verify affiliation"} <span aria-hidden="true">↗</span></Link>}
    </header>

    <section className={styles.metrics} aria-label="Workspace overview">
      <div><span>Portfolio visibility</span><strong>{profile?.publicationStatus === "published" ? "Public" : "Private"}</strong><p>{profile?.publicationStatus === "published" ? "Your saved public profile is discoverable." : "You decide when your profile goes public."}</p></div>
      <div><span>My projects</span><strong>{projects.length.toString().padStart(2, "0")}</strong><p>{projects.filter(project => project.publicationStatus === "published").length} published · {projects.filter(project => project.publicationStatus !== "published").length} private</p></div>
      <div><span>Needs your attention</span><strong>{invitations.length.toString().padStart(2, "0")}</strong><p>Project invitations and maintenance offers</p></div>
    </section>

    {!verified && <section className={styles.notice} aria-labelledby="verification-heading"><h2 id="verification-heading">Confirm your Algoma connection</h2><p>Verify your university email to create a student profile and manage projects. Staff access is assigned separately.</p><Link href="/student/verify">Verify affiliation ↗</Link></section>}
    {invitations.length > 0 && <section className={styles.notice} aria-labelledby="attention-heading"><h2 id="attention-heading">You have {invitations.length} {invitations.length === 1 ? "invitation or offer" : "invitations or offers"} to review</h2><p>Accept only the contributions and responsibilities you want represented in your portfolio.</p><Link href="/student/project-invitations">Review invitations ↗</Link></section>}

    <StudentApprovals stories={pendingStories.map(({ article }) => ({ id: article.id, version: article.version, title: article.title, excerpt: article.excerpt, bodyMarkdown: article.bodyMarkdown, coverMediaId: article.coverMediaId, coverAlt: article.coverAlt }))} />
    <div className={styles.grid}>
      <section className={styles.panel} aria-labelledby="profile-heading">
        <div className={styles.sectionHeading}><h2 id="profile-heading">My profile</h2><span className={styles.badge}>{verified ? "Affiliation verified" : "Verification needed"}</span></div>
        <p>{profile?.headline || "Tell people what you make, what interests you and what you can contribute."}</p>
        <div className={styles.progressLabel}><span>Profile foundations</span><strong>{completed} of {checklist.length} complete</strong></div>
        <progress className={styles.progress} value={completed} max={checklist.length} aria-label="Profile foundations complete" />
        <ul className={styles.checklist}>{checklist.map(item => <li key={item.label}><span aria-hidden="true" data-complete={item.complete}>{item.complete ? "✓" : "·"}</span>{item.label}<span className={styles.srOnly}>{item.complete ? ": complete" : ": not complete"}</span></li>)}</ul>
        {verified && <div className={styles.actions}><Link href="/student/profile/edit">{profile ? "Edit profile & privacy" : "Create private profile"} ↗</Link>{profile && <Link href="/student/profile/preview">Preview profile</Link>}{profile?.publicationStatus === "published" && <Link href={`/students/${profile.id}`}>View public portfolio</Link>}</div>}
      </section>
      <section className={styles.panel} aria-labelledby="projects-heading">
        <div className={styles.sectionHeading}><h2 id="projects-heading">My projects</h2>{verified && <Link href="/student/projects">View all ↗</Link>}</div>
        {projects.length ? <ul className={styles.projects}>{projects.slice(0, 4).map(project => <li key={project.id}><Link href={`/student/projects/${project.id}/${project.isMaintainer ? "edit" : "team"}`}>{project.title}<span aria-hidden="true">↗</span></Link><p>{project.isMaintainer ? "Maintainer" : "Contributor"} · {project.publicationStatus === "published" ? "Published" : "Private draft"}</p></li>)}</ul> : <div className={styles.empty}><h3>Your work belongs here.</h3><p>{verified ? "Start with a private project. Add your work, invite collaborators and publish when you are ready." : "After verifying your affiliation, you can create projects and accept collaboration invitations."}</p>{verified && <Link href={profile ? "/student/projects/new" : "/student/profile/edit"}>{profile ? "Add your first project" : "Create a profile to get started"} ↗</Link>}</div>}
        {verified && <div className={styles.actions}><Link href="/student/project-invitations">Invitations & collaboration</Link><Link href="/student/projects">Industry & verification requests</Link></div>}
      </section>
    </div>
    {credits.length > 0 && <section className={`${styles.panel} ${styles.credits}`} aria-labelledby="credits-heading">
      <div className={styles.sectionHeading}><h2 id="credits-heading">Credited in curated projects</h2><span className={styles.badge}>Read-only</span></div>
      <p>Platform staff credited your public profile on these showcases. Credits link to your portfolio but do not add you to the project team or give you editing access. Contact platform staff to correct or remove a credit.</p>
      <ul className={styles.projects}>{credits.map(credit => <li key={credit.projectId}><Link href={`/projects/${credit.projectId}`}>{credit.title}<span aria-hidden="true">↗</span></Link><p>{credit.roles.join(" / ") || "Contributor"} · Staff-curated credit</p></li>)}</ul>
    </section>}
    <details className={styles.account}><summary>Account & sign-in details</summary><p>{user.name} · {user.email}</p>{verified && <p>Verified email: {verification.institutionalEmail}</p>}<p>Account reference: <code>{getInternalUserId(user)}</code></p><SignOutButton /></details>
  </main>;
}
