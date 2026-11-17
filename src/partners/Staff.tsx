"use client";
import Link from "next/link";
import { useState } from "react";
import type { staffQueue } from "./service";
import type { CompanyContent, CollaborationContent } from "./policy";
import styles from "./partners.module.css";
type Queue = Awaited<ReturnType<typeof staffQueue>>;
const blank:CompanyContent = {name:"",website:"",description:"",sector:"",location:""};
const emptyCollaboration:CollaborationContent = {companyId:"",title:"",description:"",outcome:"",year:2026,date:null,status:"current",visibility:"public",projectIds:[],participantIds:[]};
export function PartnerStaff({data}:{data:Queue}) {
 const [company,setCompany] = useState(blank); const [record,setRecord] = useState<Queue["companies"][number] | null>(null);
 const [collaboration,setCollaboration] = useState(emptyCollaboration); const [collabRecord,setCollabRecord] = useState<Queue["collaborations"][number] | null>(null);
 const [importEventId,setImportEventId] = useState<string|undefined>();
 const [source,setSource] = useState(""); const [message,setMessage] = useState(""); const [busy,setBusy] = useState(false);
 const [duplicates,setDuplicates] = useState<Queue["companies"]>([]); const [ack,setAck] = useState(false);
 const [proposalEventId,setProposalEventId] = useState<string|undefined>();
 const [proposal,setProposal] = useState<CompanyContent|null>(null); const [provenance,setProvenance] = useState("");
 const editable = data.role === "xr_admin" || data.role === "platform_super_admin";
 async function send(action:string,body:unknown) {
  setBusy(true); setMessage("");
  try { const r = await fetch(`/api/admin/partners/${action}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}); const result = await r.json(); if(!r.ok) throw new Error([result.error?.message ?? "Operation failed",...(result.error?.details??[]).map((d:{field:string;message:string})=>`${d.field}: ${d.message}`)].join(" ")); return result; }
  catch(e) { setMessage(e instanceof Error ? e.message : "Operation failed. Your edits remain available."); return null; } finally {setBusy(false);}
 }
 async function save(status:"draft"|"published") {
  const r = await send("companies",{...(record ? {id:record.id,version:record.version}:{}),content:company,status,duplicateAcknowledged:ack,...(importEventId?{importEventId}:{})});
  if(!r) return; setDuplicates(r.duplicates ?? []);
  if(r.warning) setMessage(r.warning); else {setRecord(r.company);setImportEventId(undefined);setMessage("Company saved. Reload the queue to see updated counts and choices.");}
 }
 return <div>
  <div className={styles.metrics}><a href="#verification">{data.requests.filter(r=>r.request.kind==="verification"&&r.request.status==="pending").length} verification requests</a><a href="#companies">{data.companies.filter(c=>c.status==="draft").length + data.imports.length} company drafts / imports</a><a href="#association">{data.requests.filter(r=>r.request.kind==="association"&&r.request.status==="pending").length} association requests</a></div>
  <p><Link href="/partners">Public partners directory</Link> · <button type="button" onClick={()=>window.location.reload()}>Refresh queue</button></p>
  <p className={styles.status} role="status">{message}</p>
  {["verification","association"].map(kind=><section id={kind} key={kind}><h2>{kind === "verification" ? "Project verification" : "Company association"} review queue</h2>
   {!data.requests.some(r=>r.request.kind===kind&&r.request.status==="pending")&&<p>No pending requests.</p>}
   {data.requests.filter(r=>r.request.kind===kind&&r.request.status==="pending").map(({request:r,project:p,contributors})=><article className={styles.card} key={r.id}><h3>{p.title}</h3><p>{p.description}</p><p>Maintainer account: {p.maintainerUserId}</p><p>Contributors: {contributors.map(t=>`${t.name} (${t.state})`).join(", ")||"No account contributors recorded"}</p><p>{r.note}</p>{r.evidence&&<a href={r.evidence} target="_blank" rel="noopener noreferrer">Open evidence</a>}<p>Suggested company: {r.suggestedCompany || data.companies.find(c=>c.id===r.companyId)?.content.name || "None"}</p>
    {editable&&<form className={styles.form} onSubmit={async e=>{e.preventDefault();const f=new FormData(e.currentTarget);const result=await send("decisions",{id:r.id,status:f.get("decision"),note:f.get("note"),companyId:f.get("companyId")||null});if(result)window.location.reload();}}>
     {kind==="association"&&<label>Approved company<select name="companyId" defaultValue={r.companyId??""}><option value="">Select published company</option>{data.companies.filter(c=>c.status==="published").map(c=><option key={c.id} value={c.id}>{c.content.name}</option>)}</select></label>}
     <label>Decision note<textarea name="note" required maxLength={4000}/></label><label>Decision<select name="decision"><option value="approved">Approve</option><option value="rejected">Reject</option></select></label><button disabled={busy}>Record staff decision</button>
    </form>}
   </article>)}
  </section>)}
  <section id="companies"><h2>Company drafts and website imports</h2><p>Website text is untrusted. Review proposed fields before saving. Publishing is a separate staff action.</p>
   {editable&&<>
    {data.imports.map(i=><article className={styles.card} key={i.id}><h3>Pending import: {i.proposal.name}</h3><p>{i.sourceUrl} / {i.timestamp}</p><button type="button" onClick={()=>{setProposal(i.proposal);setProposalEventId(i.id);setProvenance(`${i.sourceUrl} / ${i.timestamp}`);}}>Review saved proposal</button></article>)}
    <form className={styles.form} onSubmit={async e=>{e.preventDefault();const r=await send("import",{sourceUrl:source});if(r){setProposal(r.proposal);setProposalEventId(r.importEventId);setDuplicates(r.duplicates);setProvenance(`${r.sourceUrl} / ${r.timestamp}`);setMessage(r.error||"Proposal ready. Review and apply to your editable form.");}}}><label>Public website URL<input type="url" value={source} onChange={e=>setSource(e.target.value)} required maxLength={2048}/></label><button disabled={busy}>Fetch metadata proposal</button></form>
    {provenance&&<p>Import provenance: {provenance}</p>}{proposal&&<div className={styles.card}><pre style={{whiteSpace:"pre-wrap"}}>{JSON.stringify(proposal,null,2)}</pre><button onClick={()=>{setCompany(proposal);setImportEventId(proposalEventId);setAck(false);}}>Apply proposal to editable form</button></div>}
    <form className={styles.form} onSubmit={e=>{e.preventDefault();void save("draft");}}><h3>{record?`Edit ${record.content.name}`:"Manual company draft"}</h3>
     {(Object.keys(blank) as (keyof CompanyContent)[]).map(key=><label key={key}>{key}{key==="description"?<textarea value={company[key]} maxLength={6000} onChange={e=>setCompany({...company,[key]:e.target.value})}/>:<input value={company[key]} required={key==="name"} maxLength={key==="website"?2048:key==="name"?160:key==="sector"?200:300} onChange={e=>{setCompany({...company,[key]:e.target.value});if(key==="website")setAck(false);}}/>}</label>)}
     {duplicates.length>0&&<aside role="alert"><p>Duplicate domain warning. Review existing companies; similar names never force a merge.</p>{duplicates.map(c=><p key={c.id}><a href={`#company-${c.id}`} onClick={()=>{setCompany(c.content);setRecord(c);setImportEventId(undefined);setAck(false);}}>{c.content.name} — open existing company</a></p>)}<label><input type="checkbox" checked={ack} onChange={e=>setAck(e.target.checked)}/>I reviewed the matches and intend a separate company record.</label></aside>}
     <button disabled={busy}>Save draft</button><button type="button" disabled={busy} onClick={()=>void save("published")}>Publish reviewed company</button>{record?.status==="published"&&<button type="button" disabled={busy} onClick={()=>void save("draft")}>Unpublish company</button>}<button type="button" onClick={()=>{setCompany(blank);setRecord(null);setImportEventId(undefined);setDuplicates([]);setAck(false);}}>Start another draft</button>
    </form>
   </>}
   {data.companies.map(c=><article className={styles.card} id={`company-${c.id}`} key={c.id}><h3>{c.content.name}</h3><p>{c.status} / {c.normalizedDomain||"No website yet"}</p>{c.sources.map((s,i)=><p key={i}>Source: {s.sourceUrl} / imported {s.timestamp}</p>)}{editable&&<button onClick={()=>{setRecord(c);setCompany(c.content);setImportEventId(undefined);setAck(false);setDuplicates([]);}}>Edit company</button>} {c.status==="published"&&<Link href={`/partners/${c.id}`}>Public detail</Link>}</article>)}
  </section>
  <section><h2>Collaboration history</h2><p>Public collaborations show their narrative and currently public projects/students. Limited entries show only an anonymized label, year and current/past status. Private entries are omitted.</p>
   {editable&&<form className={styles.form} onSubmit={async e=>{e.preventDefault();const r=await send("collaborations",{...(collabRecord?{id:collabRecord.id,version:collabRecord.version}:{}),content:collaboration});if(r){setCollabRecord(r);setMessage("Collaboration saved. Refresh queue to review.");}}}>
    <label>Company<select required value={collaboration.companyId} onChange={e=>setCollaboration({...collaboration,companyId:e.target.value})}><option value="">Select company</option>{data.companies.map(c=><option key={c.id} value={c.id}>{c.content.name}</option>)}</select></label>
    {(["title","description","outcome"] as const).map(key=><label key={key}>{key}<textarea required={key==="title"} maxLength={key==="title"?200:6000} value={collaboration[key]} onChange={e=>setCollaboration({...collaboration,[key]:e.target.value})}/></label>)}
    <label>Year<input type="number" min={1900} max={2200} required value={collaboration.year} onChange={e=>setCollaboration({...collaboration,year:Number(e.target.value)})}/></label><label>Date (optional)<input type="date" value={collaboration.date??""} onChange={e=>setCollaboration({...collaboration,date:e.target.value||null})}/></label>
    <label>Status<select value={collaboration.status} onChange={e=>setCollaboration({...collaboration,status:e.target.value as "current"|"past"})}><option>current</option><option>past</option></select></label>
    <label>Visibility<select value={collaboration.visibility} onChange={e=>setCollaboration({...collaboration,visibility:e.target.value as CollaborationContent["visibility"]})}><option>public</option><option>limited</option><option>private</option></select></label>
    <label>Related projects (multiple selection)<select multiple value={collaboration.projectIds} onChange={e=>setCollaboration({...collaboration,projectIds:Array.from(e.target.selectedOptions,o=>o.value)})}>{data.projects.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label>
    <label>Public participants (multiple selection)<select multiple value={collaboration.participantIds} onChange={e=>setCollaboration({...collaboration,participantIds:Array.from(e.target.selectedOptions,o=>o.value)})}>{data.profiles.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
    <button disabled={busy}>Save collaboration</button><button type="button" onClick={()=>{setCollabRecord(null);setCollaboration(emptyCollaboration);}}>Start another collaboration</button>
   </form>}
   {data.collaborations.map(c=><article key={c.id} className={styles.card}><h3>{c.content.title}</h3><p>{c.content.year} / {c.content.status} / {c.content.visibility}</p>{editable&&<button onClick={()=>{setCollabRecord(c);setCollaboration(c.content);}}>Edit collaboration</button>}</article>)}
  </section>
  <details><summary>Import provenance and decision history</summary>{data.events.map(e=><article key={e.id}><h3>{e.action}</h3><p>{new Date(e.createdAt).toISOString()} / {e.subjectId}</p><pre style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{JSON.stringify(e.snapshot,null,2)}</pre></article>)}</details>
 </div>;
}
