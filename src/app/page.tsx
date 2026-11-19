import Link from "next/link";
import { getRuntimeDatabase } from "@/db/runtime";
import { queryTalentDirectory } from "@/db/queries/talent";
import { listPublicProjects } from "@/projects/public-directory";
import { ProjectCard } from "@/components/discovery/ProjectCard";
import discovery from "@/components/discovery/discovery.module.css";
import styles from "./page.module.css";
export const dynamic = "force-dynamic";
export default async function Home() {
 const db = getRuntimeDatabase();
 const [projects,talent] = await Promise.all([listPublicProjects(db),queryTalentDirectory(db,{q:"",searchGroups:[],skills:[],availability:[],status:[]})]);
 return <main className={styles.home}>
   <section className={styles.hero} aria-labelledby="home-title">
     <div className={styles.heroCopy}><p className="ui-eyebrow"><span className={styles.liveDot} />Student talent. New dimensions.</p><h1 id="home-title">The people.<br />The ideas.<br /><em>The possibilities.</em></h1><p className={styles.heroIntro}>Discover student talent and the work moving immersive technology forward. From first experiments to experiences you can explore.</p><div className={styles.actions}><Link href="/talent" className="ui-button ui-button-primary">Discover talent <span aria-hidden="true">&#8599;</span></Link><Link href="/projects" className="ui-button">Explore the work <span aria-hidden="true">&#8599;</span></Link></div><div className={styles.heroNote}><span>XR &amp; spatial computing</span><span>Software &amp; creative technology</span></div></div>
     <Link href="/showcase" className={styles.exhibit} aria-label="Explore the immersive showcase">
       <div className={styles.exhibitTop}><span>ImmXrsive / Spatial studies</span><span aria-hidden="true">01 &mdash; &#8734;</span></div>
       <svg className={styles.spatialArt} viewBox="0 0 520 490" fill="none" aria-hidden="true">
         <defs><linearGradient id="portal-front" x1="180" y1="90" x2="400" y2="420" gradientUnits="userSpaceOnUse"><stop stopColor="#ffb49d"/><stop offset=".55" stopColor="#ff806b"/><stop offset="1" stopColor="#ab5044"/></linearGradient><linearGradient id="portal-side" x1="120" y1="80" x2="360" y2="420" gradientUnits="userSpaceOnUse"><stop stopColor="#634f48"/><stop offset="1" stopColor="#242c2d"/></linearGradient><pattern id="art-grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" stroke="#555d59" strokeWidth=".5"/></pattern></defs>
         <path fill="url(#art-grid)" opacity=".35" d="M0 0h520v490H0z"/>
         <path d="m35 399 230-132 230 132-230 132Z" stroke="#646b62" strokeWidth=".7"/><path d="m35 439 230-132 230 132M75 376l230 132M115 353l230 132M155 330l230 132M195 307l230 132" stroke="#646b62" strokeWidth=".5"/>
         <ellipse cx="273" cy="420" rx="156" ry="29" fill="#000" opacity=".25"/>
         <path d="m123 355 0-165c0-104 68-166 139-128l52 30-41 56-72-6-25 135 65 146Z" fill="url(#portal-side)" stroke="#b4a096" strokeWidth=".8"/>
         <path fillRule="evenodd" d="M166 382V217c0-104 68-166 139-128 71 38 91 114 91 202v144l-64-37V256c0-47-11-86-37-100-36-19-65 15-65 69v194Z" fill="url(#portal-front)" stroke="#ffc6ae" strokeWidth=".8"/>
         <path d="M187 393V222c0-84 51-133 105-106 58 29 82 93 82 169v138M205 404V224c0-66 37-103 77-84 43 21 69 72 69 137v133" stroke="#ffc5b0" strokeWidth=".7" opacity=".55"/>
         <path d="m230 419-31-18V228c0-72 37-114 83-96" stroke="#562e29" strokeWidth="1"/><path d="m230 419 102-59v38l64 37-65 38Z" fill="#513d36" stroke="#a78372" strokeWidth=".8"/>
         <circle cx="97" cy="176" r="3" fill="#b9d3bf"/><path d="M97 176V133h60M411 326h46v-53" stroke="#b9d3bf" strokeWidth=".8"/><circle cx="411" cy="326" r="3" fill="#b9d3bf"/>
         <path d="M61 46h17M69.5 37.5v17M444 71h17M452.5 62.5v17" stroke="#c2c8b8" strokeWidth=".8"/>
       </svg>
       <div className={styles.exhibitCaption}><div><span className={styles.exhibitKicker}>Beyond the screen</span><strong>A different point of view.</strong><span>Explore immersive projects &amp; playable demos</span></div><span className={styles.exhibitArrow} aria-hidden="true">&#8599;</span></div>
     </Link>
   </section>
   <div className={styles.disciplineStrip} aria-label="Creative technology disciplines"><span>Extended reality</span><span>Spatial computing</span><span>Interactive design</span><span>Software engineering</span><span>Artificial intelligence</span></div>
   <section className={styles.work} aria-labelledby="work-title"><div className={styles.sectionHeading}><div><p className="ui-eyebrow">01 / The work</p><h2 id="work-title">From possibility<br />to <em>proof.</em></h2></div><div><p>Real projects. Visible contributions.<br />A closer look at what students are building.</p><Link href="/projects">View all projects <span aria-hidden="true">&#8599;</span></Link></div></div><div className={discovery.grid}>{projects.slice(0,3).map((project,index)=><ProjectCard key={project.id} project={project} index={index}/>)}</div>{!projects.length && <div className="ui-empty">Published projects will appear here. <Link href="/talent">Meet the people behind the next idea.</Link></div>}</section>
   <section className={styles.talent} aria-labelledby="talent-title"><div className={styles.sectionHeading}><div><p className="ui-eyebrow">02 / The people</p><h2 id="talent-title">Built by people.<br /><em>Discovered here.</em></h2></div><div><p>Explore published portfolios, skills,<br />and the contributions behind the work.</p><Link href="/talent">Meet the talent <span aria-hidden="true">&#8599;</span></Link></div></div><div className={styles.people}>{talent.items.slice(0,4).map((student,index)=><Link href={`/students/${encodeURIComponent(student.id)}`} key={student.id} className={styles.person}><span className={styles.personIndex}>{String(index+1).padStart(2,"0")}</span><span className={styles.avatar} aria-hidden="true">{student.name.split(" ").map(n=>n[0]).slice(0,2).join("")}</span><div><h3>{student.name}</h3><p>{student.headline}</p><span>{student.skills.slice(0,3).join(" · ")}</span></div><span className={styles.personArrow} aria-hidden="true">&#8599;</span></Link>)}</div>{!talent.items.length && <div className="ui-empty">The talent directory will grow as students choose to publish their portfolios.</div>}</section>
   <section className={styles.collaborate} aria-labelledby="collaborate-title"><div><p className="ui-eyebrow">03 / The connection</p><h2 id="collaborate-title">Fresh thinking.<br /><em>Shared ambition.</em></h2></div><div><p>Great work opens doors. Explore industry partners and their published collaborations, or start a conversation about a student or project that caught your attention.</p><div className={styles.actions}><Link href="/partners" className="ui-button ui-button-primary">Meet industry partners <span aria-hidden="true">&#8599;</span></Link><Link href="/contact" className="ui-button">Start an inquiry <span aria-hidden="true">&#8599;</span></Link></div></div></section>
   <section className={styles.studentCallout}><div><p className="ui-eyebrow">Your next chapter</p><h2>Make room for your work.</h2><p>Create a private profile, document your contributions, and publish when you’re ready.</p></div><Link href="/student/dashboard" className="ui-button">Open student workspace <span aria-hidden="true">&#8599;</span></Link></section>
 </main>;
}
