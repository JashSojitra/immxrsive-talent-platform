"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { PersonalContribution, ProjectTeamData } from "@/projects/team-types";
import styles from "./project-editor.module.css";

const empty: PersonalContribution = { roleId: "", statement: "", featured: true, publicVisible: true };
function personal(data: ProjectTeamData): PersonalContribution {
  const c = data.members.find(m => m.id === data.ownMembershipId)?.contribution;
  return c ? { roleId: c.roleId, statement: c.statement, featured: c.featured, publicVisible: c.publicVisible } : empty;
}

export function ProjectTeam({ initialData }: { initialData: ProjectTeamData }) {
  const [data, setData] = useState(initialData);
  const [draft, setDraft] = useState(() => personal(initialData));
  const [baseline, setBaseline] = useState(() => personal(initialData));
  const [query, setQuery] = useState("");
  const [students, setStudents] = useState<Array<{ id: string; name: string; headline: string }>>([]);
  const [profileId, setProfileId] = useState("");
  const [roleId, setRoleId] = useState(initialData.roles[0]?.id ?? "");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [conflict, setConflict] = useState(false);
  const working = useRef(false); const feedback = useRef<HTMLDivElement>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline);
  const own = data.members.find(m => m.id === data.ownMembershipId);
  const [joinRoles, setJoinRoles] = useState<Record<string, string>>({});
  const root = `/api/v1/student/projects/${data.project.id}`;
  useEffect(() => { if (error) feedback.current?.focus(); }, [error]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  async function refresh(reset: boolean) {
    const response = await fetch(`${root}/team`, { cache: "no-store" });
    const body = await response.json(); if (!response.ok) throw new Error(body.error?.message ?? "The project team could not be loaded.");
    setData(body);
    if (reset) { const next = personal(body); setDraft(next); setBaseline(next); }
  }
  async function run(path: string, body: unknown, message: string, reset = false, method = "POST") {
    if (working.current) return;
    working.current = true; setBusy(true); setError(""); setNotice(""); setConflict(false);
    try {
      const response = await fetch(`/api/v1/student/${path}`, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) { setConflict(response.status === 409); throw new Error(result.error?.message ?? "The change could not be saved."); }
      await refresh(reset); setNotice(message);
    } catch (e) { setError(e instanceof Error ? e.message : "The change could not be saved. Your input is still here."); }
    finally { working.current = false; setBusy(false); }
  }
  async function reload() {
    if (!window.confirm("Load the latest project team? Unsaved personal changes will be replaced.")) return;
    setBusy(true);
    try { await refresh(true); setConflict(false); setError(""); setNotice("Latest project team loaded."); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not reload."); }
    finally { setBusy(false); }
  }
  async function search(e: FormEvent) {
    e.preventDefault(); if (working.current) return;
    working.current = true; setBusy(true); setError(""); setStudents([]); setProfileId(""); setNotice("");
    try {
      const response = await fetch(`${root}/teammates?q=${encodeURIComponent(query)}`);
      const result = await response.json(); if (!response.ok) throw new Error(result.error?.message ?? "Search could not be completed.");
      setStudents(result.students); setProfileId(result.students[0]?.id ?? "");
      setNotice(result.students.length ? "Choose a student and propose a role." : "No eligible students found. Try their published name or exact shared profile ID.");
    } catch (e) { setError(e instanceof Error ? e.message : "Search failed."); }
    finally { working.current = false; setBusy(false); }
  }
  return <div>
    <div className={styles.identity}><span>{data.isMaintainer ? "You maintain this project" : "Your project relationship"}</span><code>{data.project.id}</code><p>{data.project.description}</p>
      <div className={styles.actions}>{data.isMaintainer ? <Link href={`/student/projects/${data.project.id}/edit`}>Edit shared project</Link> : null}
        {data.project.publicationStatus === "published" ? <Link href={`/projects/${data.project.id}`}>View public project</Link> : <span>Private draft</span>}
        <Link href="/student/project-invitations">Invitations &amp; shared projects</Link></div>
    </div>
    {error ? <div className={styles.feedback} role="alert" aria-labelledby="team-error-title" tabIndex={-1} ref={feedback}><h2 id="team-error-title">Team change not saved</h2><p>{error}</p><p>Your entered information has been kept.</p>{conflict ? <button disabled={busy} onClick={reload}>Load latest project team</button> : null}</div> : null}
    <p role="status" className={styles.success}>{notice}</p>
    {own?.state === "pending" ? <section className={styles.section} aria-labelledby="invitation-title"><p className={styles.eyebrow}>A place on the team</p><h2 id="invitation-title">Your invitation.</h2>
      <p>Proposed role: <strong>{data.roles.find(r => r.id === own.proposedRoleId)?.name}</strong></p>
      <p>Accepting creates your contributor relationship. On published profiles, your role is publicly attributed and this project is featured by default. You can change both choices in your personal controls. Declining never publishes you as a contributor.</p>
      <div className={styles.actions}><button disabled={busy} className={styles.primary} onClick={() => run(`project-memberships/${own.id}/response`, { version: own.version, accept: true }, "Invitation accepted. Your personal contribution is now yours to shape.", true)}>Accept invitation</button>
        <button disabled={busy} onClick={() => run(`project-memberships/${own.id}/response`, { version: own.version, accept: false }, "Invitation declined.", true)}>Decline invitation</button></div></section> : null}
    {own?.state === "removed" ? <section className={styles.card}><h2>Your relationship was removed.</h2><p>Your contribution and original relationship are preserved. The maintainer can restore them.</p><p>Reason: {own.removalReason || "No reason supplied."}</p><p>Removed: {own.removedAt ? new Date(own.removedAt).toISOString().slice(0, 10) : "Recorded privately"}</p></section> : null}
    {own?.state === "declined" ? <section className={styles.card}><h2>You declined this invitation.</h2><p>No accepted contribution or portfolio association was created.</p></section> : null}
    {own?.state === "accepted" && own.contribution ? <form className={styles.section} onSubmit={e => { e.preventDefault(); void run(`project-memberships/${own.id}/contribution`, { version: own.contribution!.version, contribution: draft }, "Personal contribution saved.", true, "PATCH"); }}>
      <p className={styles.eyebrow}>Your work, in your words</p><h2>Your contribution.</h2><p>Only you can change this statement, role and visibility. Project technologies do not become your personal skills.</p>
      {own.restoredAt ? <p>Your preserved relationship has been restored.</p> : null}
      <label htmlFor="personal-role">Your standardized role</label><select id="personal-role" value={draft.roleId} onChange={e => setDraft({ ...draft, roleId: e.target.value })}>{data.roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
      <label htmlFor="personal-statement">Your contribution statement / role description (optional)</label><textarea id="personal-statement" maxLength={3000} value={draft.statement} onChange={e => setDraft({ ...draft, statement: e.target.value })} />
      <label className={styles.choice}><input type="checkbox" checked={draft.featured} onChange={e => setDraft({ ...draft, featured: e.target.checked })} />Feature this project in my portfolio</label>
      <small>Hiding portfolio evidence keeps your accepted relationship and the other contributors&apos; portfolios intact.</small>
      <label className={styles.choice}><input type="checkbox" checked={draft.publicVisible} onChange={e => setDraft({ ...draft, publicVisible: e.target.checked })} />Allow my public project attribution</label>
      <small>Turning attribution off also hides this evidence from your portfolio. An unpublished profile is always private.</small>
      <div className={styles.actions}><button className={styles.primary} disabled={busy || !dirty} type="submit">Save my contribution</button>{dirty ? <span>You have unsaved personal changes.</span> : null}</div>
    </form> : null}
    {data.isMaintainer ? <>
      <section className={styles.section}><p className={styles.eyebrow}>Open the door with consent</p><h2>Requests to join.</h2><p>Approval proposes a role through a private invitation. The requester becomes accepted only after responding to that invitation.</p>
        {(data.joinRequests ?? []).length ? data.joinRequests.map(r => <article key={r.id} className={styles.card}><h3>{r.name}</h3><p>Join request: {r.state}</p>{r.state === "pending" ? <><label htmlFor={`join-role-${r.id}`}>Proposed role for {r.name}</label><select id={`join-role-${r.id}`} value={joinRoles[r.id] ?? data.roles[0]?.id} onChange={e => setJoinRoles({ ...joinRoles, [r.id]: e.target.value })}>{data.roles.map(role => <option key={role.id} value={role.id}>{role.name}</option>)}</select><div className={styles.actions}><button disabled={busy || dirty} onClick={() => run(`project-join-requests/${r.id}/response`, { version: r.version, projectVersion: data.project.version, approve: true, roleId: joinRoles[r.id] ?? data.roles[0]?.id }, "Join request approved. A private invitation awaits their acceptance.")}>Approve request from {r.name}</button><button disabled={busy || dirty} onClick={() => run(`project-join-requests/${r.id}/response`, { version: r.version, projectVersion: data.project.version, approve: false }, "Join request declined.")}>Decline request from {r.name}</button></div></> : null}</article>) : <p>No requests to join.</p>}
      </section>
      <section className={styles.section}><p className={styles.eyebrow}>Build together</p><h2>Add Teammate.</h2><p>Search published verified students, or enter an exact profile ID privately shared with you. No email search or GitHub contribution is treated as consent.</p>
        <form onSubmit={search}><label htmlFor="student-search">Student name or shared profile ID</label><input id="student-search" minLength={2} maxLength={160} required value={query} onChange={e => setQuery(e.target.value)} /><div className={styles.actions}><button disabled={busy || dirty}>Find students</button></div></form>
        {students.length ? <form onSubmit={e => { e.preventDefault(); void run(`projects/${data.project.id}/invitations`, { version: data.project.version, profileId, roleId }, "Invitation sent. They decide whether to accept."); }}>
          <label htmlFor="invite-student">Student to invite</label><select id="invite-student" value={profileId} onChange={e => setProfileId(e.target.value)}>{students.map(s => <option key={s.id} value={s.id}>{s.name} — {s.headline}</option>)}</select>
          <label htmlFor="proposed-role">Proposed standardized role</label><select id="proposed-role" value={roleId} onChange={e => setRoleId(e.target.value)}>{data.roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
          <div className={styles.actions}><button disabled={busy || dirty || !profileId}>Send invitation</button></div></form> : null}
      </section>
      <section className={styles.section}><p className={styles.eyebrow}>Relationships that last</p><h2>Project team.</h2><p>Removing a contributor is reversible. Their statement, role, original acceptance and preferences are retained; you cannot rewrite their words.</p>
        <label htmlFor="removal-reason">Removal reason (optional, visible to that contributor)</label><input id="removal-reason" maxLength={500} value={reason} onChange={e => setReason(e.target.value)} />
        {data.members.map(m => <article key={m.id} className={styles.card}><h3>{m.name}</h3><p>{m.state} · {data.roles.find(r => r.id === (m.contribution?.roleId ?? m.proposedRoleId))?.name}</p><code>{m.profileId}</code>
          {m.contribution?.statement ? <p className={styles.statement}>{m.contribution.statement}</p> : null}
          {m.removalReason ? <p>Last removal reason: {m.removalReason}</p> : null}
          <div className={styles.actions}>{m.id !== own?.id && m.state === "accepted" ? <>
            <button disabled={busy || dirty} onClick={() => { if (window.confirm(`Reversibly remove ${m.name}? Their contribution will be preserved.`)) void run(`project-memberships/${m.id}/removal`, { version: m.version, reason }, "Contributor removed reversibly."); }}>Remove {m.name}</button>
            <button disabled={busy || dirty} onClick={() => { if (window.confirm(`Offer maintenance to ${m.name}? You keep control until they accept. Acceptance ends your shared editing privileges.`)) void run(`projects/${data.project.id}/maintainer-transfer`, { version: data.project.version, targetMembershipId: m.id }, "Maintenance offered. The contributor must consent."); }}>Offer maintenance to {m.name}</button>
          </> : null}{m.state === "removed" ? <button disabled={busy || dirty} onClick={() => { if (window.confirm(`Restore ${m.name}'s preserved relationship? Their own visibility preferences will be retained.`)) void run(`project-memberships/${m.id}/restore`, { version: m.version }, "Contributor restored with their original evidence."); }}>Restore {m.name}</button> : null}</div>
        </article>)}
      </section>
    </> : null}
    <section className={styles.section}><p className={styles.eyebrow}>Consent before responsibility</p><h2>Maintenance offers.</h2>
      {!data.transfers.length ? <p>No maintenance offers.</p> : data.transfers.map(t => <article key={t.id} className={styles.card}><p>Maintenance offer: {t.state}</p>
        {t.state === "pending" && t.projectVersion !== data.project.version ? <p>This offer is stale. Ask the maintainer for a fresh offer before accepting.</p> : null}
        {t.state === "pending" && t.toMembershipId === own?.id ? <><p>Accepting makes you the only shared-field editor. The project ID and URL stay unchanged.</p><div className={styles.actions}>
          <button disabled={busy || dirty || own.state !== "accepted" || t.projectVersion !== data.project.version} onClick={() => { if (window.confirm("Accept project maintenance? You will become responsible for shared editing.")) void run(`project-transfers/${t.id}/response`, { accept: true }, "Maintenance accepted. The canonical project is unchanged."); }}>Accept maintenance</button>
          <button disabled={busy || dirty} onClick={() => run(`project-transfers/${t.id}/response`, { accept: false }, "Maintenance offer declined.")}>Decline maintenance</button></div></> : null}</article>)}
    </section>
  </div>;
}
