import Link from "next/link";
import { requireAuthenticatedUser } from "@/auth/server";
import { getRuntimeDatabase } from "@/db/runtime";
import { maintainerRequests } from "@/partners/service";
import { StudentRequests } from "@/partners/StudentRequests";
import { ProjectError } from "@/projects/service";
import styles from "@/partners/partners.module.css";
export const dynamic = "force-dynamic";
export default async function RequestsPage({params}:{params:Promise<{projectId:string}>}) {
 const {projectId} = await params; const user = await requireAuthenticatedUser(`/student/projects/${projectId}/requests`);
 let data;
 try { data = await maintainerRequests(getRuntimeDatabase(),user.id,projectId); }
 catch(error) {if(!(error instanceof ProjectError)||error.status!==403)throw error;}
 if(!data)return <main className={styles.page}><h1 className="ui-display">Maintainer access required</h1><Link href="/student/projects">My projects</Link></main>;
 return <main className={styles.page}><Link href="/student/projects">My projects</Link><h1 className="ui-display">Request staff review</h1><p>Staff independently review official verification and company associations. Submitting does not grant either status.</p><StudentRequests projectId={projectId} data={data}/></main>;
}
