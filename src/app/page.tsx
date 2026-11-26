import Link from "next/link";
import { getRuntimeDatabase } from "@/db/runtime";
import { queryTalentDirectory } from "@/db/queries/talent";
import { listPublicProjects } from "@/projects/public-directory";
import { publicCompanies } from "@/partners/service";
import { Connection } from "@/components/home/Connection";
import { HomeHero } from "@/components/home/HomeHero";
import { Manifesto } from "@/components/home/Manifesto";
import { PeopleRail } from "@/components/home/PeopleRail";
import { WorkIndex } from "@/components/home/WorkIndex";
import { isReviewRecord } from "@/components/home/featured-content";
import { StudentStories } from "@/components/home/StudentStories";
import { Skiper28 } from "@/components/v1/skiper28";
import { Skiper31 } from "@/components/v1/skiper31";
import { MotionRoot } from "@/components/motion/MotionRoot";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import styles from "@/components/home/home.module.css";

export const dynamic = "force-dynamic";

export default async function Home() {
  const db = getRuntimeDatabase();
  const [projects, talent, partners] = await Promise.all([
    listPublicProjects(db),
    queryTalentDirectory(db, { q: "", searchGroups: [], skills: [], availability: [], status: [] }),
    publicCompanies(db),
  ]);
  // Only published, public fields cross into client components.
  const editorialProjects = projects.filter(project => !isReviewRecord(project.title));
  const featured = editorialProjects.slice(0, 6).map(({ id, title, description, domain, status, managementMode, technologies }) => ({ id, title, description, domain, status, managementMode, technologies }));
  const people = talent.items.slice(0, 8).map(({ id, name, headline, status, skills, projectEvidenceCount }) => ({ id, name, headline, status, skills, projectEvidenceCount }));
  const partnerNames = partners.filter(company => !isReviewRecord(company.content.name)).map(company => ({ id: company.id, name: company.content.name }));
  return <MotionRoot>
    <SmoothScroll />
    <main className={styles.home}>
      <HomeHero stats={{ projects: projects.length, portfolios: talent.count, partners: partners.length }} />
      <Manifesto />
      <Skiper28 text="Talent is more than a list of skills. See the work behind the profile: shared projects, visible contributions, and the people building what comes next." />
      <StudentStories />
      <WorkIndex projects={featured} />
      <Skiper31 text="Find the person behind the possibility." />
      <PeopleRail people={people} />
      <Connection partners={partnerNames} />
      <section className={styles.studentCallout} aria-labelledby="student-callout-title">
        <svg className={styles.calloutRing} viewBox="0 0 400 400" fill="none" aria-hidden="true"><defs><linearGradient id="callout-gate" x1="40" y1="40" x2="360" y2="360" gradientUnits="userSpaceOnUse"><stop stopColor="var(--brand-pink)" /><stop offset="1" stopColor="var(--brand-cold-purple)" /></linearGradient><radialGradient id="callout-core" cx="200" cy="200" r="190" gradientUnits="userSpaceOnUse"><stop stopColor="var(--brand-pink)" stopOpacity=".16" /><stop offset="1" stopColor="var(--brand-pink)" stopOpacity="0" /></radialGradient><filter id="callout-glow"><feGaussianBlur stdDeviation="6" /></filter></defs><path d="M143 12h114l131 131v114L257 388H143L12 257V143Z" fill="url(#callout-core)" /><path d="M143 12h114l131 131v114L257 388H143L12 257V143Z" stroke="url(#callout-gate)" strokeWidth="5" opacity=".35" filter="url(#callout-glow)" /><path d="M143 12h114l131 131v114L257 388H143L12 257V143Z" stroke="url(#callout-gate)" strokeWidth="1.2" opacity=".8" /></svg>
        <p className="ui-eyebrow">Your next chapter</p>
        <h2 id="student-callout-title">Make room for your work.</h2>
        <p>Create a private profile, document your contributions, and publish when you’re ready.</p>
        <Link href="/student/dashboard" className="ui-button">Open student workspace <span aria-hidden="true">&#8599;</span></Link>
      </section>
    </main>
  </MotionRoot>;
}
