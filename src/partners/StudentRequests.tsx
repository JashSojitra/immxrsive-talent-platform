"use client";
import { useState } from "react";
import type { maintainerRequests } from "./service";
import styles from "./partners.module.css";
export function StudentRequests({projectId,data}:{projectId:string;data:Awaited<ReturnType<typeof maintainerRequests>>}) {
 const [kind,setKind] = useState("verification"); const [message,setMessage] = useState(""); const [busy,setBusy] = useState(false);
 return <><form className={styles.form} onSubmit={async e=>{e.preventDefault(); const form = new FormData(e.currentTarget);setBusy(true);try {const r = await fetch("/api/v1/student/partner-requests",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({kind,projectId,note:form.get("note"),evidence:form.get("evidence"),companyId:kind === "association"?(form.get("companyId")||null):null,suggestedCompany:kind === "association"?form.get("suggestedCompany"):""})});const body = await r.json();if(!r.ok)throw new Error([body.error?.message??"Request failed",...(body.error?.details??[]).map((d:{field:string;message:string})=>`${d.field}: ${d.message}`)].join(" "));window.location.reload();}catch(error){setMessage(error instanceof Error?error.message:"Request failed");}finally{setBusy(false);}}}>
 <label>Request type<select value={kind} onChange={e=>setKind(e.target.value)}><option value="verification">Official project verification</option><option value="association">Company association</option></select></label>
 {kind === "association"&&<><label>Existing company<select name="companyId"><option value="">Suggest a new company below</option>{data.companies.map(c=><option key={c.id} value={c.id}>{c.content.name}</option>)}</select></label><label>Suggested company<input name="suggestedCompany" maxLength={200}/></label></>}
 <label>Explanation / review note<textarea name="note" required maxLength={4000}/></label><label>Evidence URL (public HTTPS, optional)<input name="evidence" type="url" maxLength={2048}/></label><button disabled={busy}>Submit for staff review</button><p role="status">{message}</p>
 </form><h2>Your requests</h2>{data.requests.map(r=><article className={styles.card} key={r.id}><h3>{r.kind} — {r.status}</h3><p>{r.note}</p><p>Staff response: {r.decisionNote||"Awaiting review"}</p></article>)}</>;
}
