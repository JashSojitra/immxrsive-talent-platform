import Link from "next/link";

import type { PublicStudentProfile } from "@/db/queries/student-profile";

import { StudentProfileMotion } from "./StudentProfileMotion";
import styles from "./student-profile.module.css";

export function StudentProfileView({ profile }: { profile: PublicStudentProfile }) {
  return (
    <StudentProfileMotion>
      <a className={styles.skipLink} href="#capabilities">Skip to profile details</a>
      <div className={styles.spatialBackdrop} aria-hidden="true">
        <span /><span /><span />
      </div>

      <header className={styles.siteHeader} data-profile-nav>
        <Link href="/talent" className={styles.brand} aria-label="ImmXrsive talent directory">
          IMM<span>X</span>RSIVE
        </Link>
        <nav aria-label="Primary navigation">
          <Link href="/talent">Talent</Link>
          <span aria-current="page">Profile</span>
        </nav>
      </header>

      <section className={styles.hero} aria-labelledby="student-name">
        <div className={styles.heroIndex} data-profile-index>
          <span>Public profile</span>
          <strong>{profile.id}</strong>
        </div>
        <div className={styles.heroBody}>
          <p className={styles.statusLine} data-profile-lead>
            <span>{labelValue(profile.status)}</span>
            <span>{profile.program}</span>
          </p>
          <h1 id="student-name" data-profile-name>{profile.name}</h1>
          <p className={styles.headline} data-profile-lead>{profile.headline}</p>
          <dl className={styles.heroMeta} data-profile-meta>
            <div>
              <dt>Status</dt>
              <dd>{labelValue(profile.status)}</dd>
            </div>
            <div>
              <dt>Program</dt>
              <dd>{profile.program}</dd>
            </div>
            <div>
              <dt>Availability</dt>
              <dd>{profile.availability.map(labelValue).join(" / ")}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section id="capabilities" className={styles.capabilities} aria-labelledby="capabilities-title" data-profile-section>
        <SectionHeading index="02" label="Capabilities" id="capabilities-title">
          Structured skills.<br /><em>Clear signal.</em>
        </SectionHeading>
        <p className={styles.sectionLead} data-profile-reveal>
          Standardized capabilities associated directly with {profile.name}&apos;s public profile.
        </p>
        <ul className={styles.skillMatrix} aria-label={`${profile.name}'s standardized skills`} data-profile-reveal>
          {profile.skills.map((skill, index) => (
            <li key={skill}><span>{String(index + 1).padStart(2, "0")}</span>{skill}</li>
          ))}
        </ul>
      </section>

      <section className={styles.availabilitySection} aria-labelledby="availability-title" data-profile-section>
        <SectionHeading index="03" label="Availability" id="availability-title">
          Ready for the<br /><em>right opportunity.</em>
        </SectionHeading>
        <div className={styles.availabilityPanel} data-profile-reveal>
          <div><span>Academic status</span><strong>{labelValue(profile.status)}</strong></div>
          <div><span>Program</span><strong>{profile.program}</strong></div>
          <div>
            <span>Available for</span>
            <strong>{profile.availability.map(labelValue).join(" / ")}</strong>
          </div>
        </div>
      </section>

      <section className={styles.projectsSection} aria-labelledby="projects-title" data-profile-section>
        <SectionHeading index="04" label="Project evidence" id="projects-title">
          Work made<br /><em>visible.</em>
        </SectionHeading>
        <p className={styles.sectionLead} data-profile-reveal>
          Canonical project records connected through verified contributor roles.
        </p>
        <div className={styles.projectGrid}>
          {profile.projects.map((project, index) => (
            <article className={styles.projectCard} key={project.id} data-profile-reveal>
              <div className={styles.projectTopline}>
                <span>{project.id} / {String(index + 1).padStart(2, "0")}</span>
                <span>{project.domain}</span>
              </div>
              <h3>{project.title}</h3>
              <p>{project.description}</p>
              <dl className={styles.projectRole}>
                <div>
                  <dt>{profile.name}&apos;s contributor role</dt>
                  <dd>{project.role}</dd>
                </div>
              </dl>
              <div className={styles.technologyBlock}>
                <span>Project technologies</span>
                <ul aria-label={`${project.title} technologies`}>
                  {project.technologies.map((technology) => <li key={technology}>{technology}</li>)}
                </ul>
              </div>
              <div className={styles.projectActions}>
                <Link href={`/projects/${project.id}`} aria-label={`View project ${project.title}`}>
                  View project <span aria-hidden="true">↗</span>
                </Link>
                {project.links.map((link) => (
                  <a key={link.type} href={link.url} target="_blank" rel="noopener noreferrer">
                    {link.label} <span className={styles.visuallyHidden}>(opens in a new tab)</span>
                  </a>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      {profile.links.length > 0 ? (
        <section className={styles.linksSection} aria-labelledby="links-title" data-profile-section>
          <SectionHeading index="05" label="Professional links" id="links-title">
            Continue the<br /><em>conversation.</em>
          </SectionHeading>
          <ul className={styles.professionalLinks} data-profile-reveal>
            {profile.links.map((link) => (
              <li key={link.type}>
                <a href={link.url} target="_blank" rel="noopener noreferrer">
                  <span>{link.label}</span><span aria-hidden="true">↗</span>
                  <span className={styles.visuallyHidden}>(opens in a new tab)</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className={styles.inquirySection} aria-labelledby="inquiry-title" data-profile-section>
        <p className={styles.chapter} data-profile-reveal>06 / Employer action</p>
        <h2 id="inquiry-title" data-profile-reveal>
          Interested in working<br />with <em>{profile.name}?</em>
        </h2>
        <p data-profile-reveal>
          Send a student-specific inquiry with this profile context attached automatically.
        </p>
        <Link className={styles.inquiryCta} href={`/inquiry/student/${profile.id}`} data-profile-reveal>
          Employer inquiry for {profile.name} <span aria-hidden="true">↗</span>
        </Link>
      </section>

      <footer className={styles.footer}>
        <span>ImmXrsive</span>
        <Link href="/talent">Return to talent index</Link>
      </footer>
    </StudentProfileMotion>
  );
}

function SectionHeading({
  index,
  label,
  id,
  children,
}: {
  index: string;
  label: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.sectionHeading} data-profile-reveal>
      <p className={styles.chapter}>{index} / {label}</p>
      <h2 id={id}>{children}</h2>
    </div>
  );
}

function labelValue(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
