import Image from "next/image";
import Link from "next/link";

import type { PublicStudentProfile } from "@/db/queries/student-profile";

import { StudentProfileMotion } from "./StudentProfileMotion";
import styles from "./student-profile.module.css";

export function StudentProfileView({
  profile,
  preview,
}: {
  profile: PublicStudentProfile;
  preview?: { hiddenFields: string[] };
}) {
  const statusLabel = profile.status ? labelValue(profile.status) : "Status not selected";
  const preset = profile.presentationPreset ?? "spatial";
  const heroMedia = profile.heroMedia ?? "default";
  const sectionOrder = normalizeSectionOrder(profile.sectionOrder);
  const visibleSections = sectionOrder.filter((section) => sectionIsVisible(section, profile));
  return (
    <StudentProfileMotion preset={preset}>
      <a className={styles.skipLink} href="#portfolio-sections">Skip to profile details</a>
      <div className={styles.spatialBackdrop} aria-hidden="true">
        <span /><span /><span />
      </div>

      <header className={styles.siteHeader} data-profile-nav>
        <nav aria-label="Breadcrumb">
          <Link href="/talent">Talent</Link>
          <span aria-current="page">Profile</span>
        </nav>
      </header>

      {preview ? (
        <aside className={styles.previewBanner} aria-label="Private public-profile preview">
          <div>
            <strong>Private preview — not public</strong>
            <p>This uses your saved draft and the same server-side projection as the public profile.</p>
            <p>{preview.hiddenFields.length > 0
              ? `Private fields omitted: ${preview.hiddenFields.join(", ")}.`
              : "No maintained optional fields are currently hidden."}</p>
          </div>
          <Link href="/student/profile/edit">Return to editor</Link>
        </aside>
      ) : null}

      <section className={styles.hero} aria-labelledby="student-name">
        <div className={styles.heroIndex} data-profile-index>
          <span>{preview ? "Public presentation preview" : "Public profile"}</span>
          <strong>Student portfolio</strong>
        </div>
        <div className={styles.heroBody}>
          <p className={styles.statusLine} data-profile-lead>
            <span>{statusLabel}</span>
            <span>{profile.program || "Program not added"}</span>
          </p>
          {profile.avatarMediaId && <Image src={`/media/${profile.avatarMediaId}`} alt="" width={144} height={144} unoptimized style={{ borderRadius: "50%", objectFit: "cover" }} />}
          <h1 id="student-name" data-profile-name className="ui-display">{profile.name}</h1>
          <p className={styles.headline} data-profile-lead>{profile.headline}</p>
          <dl className={styles.heroMeta} data-profile-meta>
            <div>
              <dt>Status</dt>
              <dd>{statusLabel}</dd>
            </div>
            <div>
              <dt>Program</dt>
              <dd>{profile.program || "Not added"}</dd>
            </div>
            {profile.location ? <div><dt>Location</dt><dd>{profile.location}</dd></div> : null}
            {profile.availability ? (
              <div><dt>Availability</dt><dd>{profile.availability.map(labelValue).join(" / ") || "Not listed"}</dd></div>
            ) : null}
          </dl>
        </div>
        <div className={styles.heroMedia} data-media={heroMedia} aria-hidden="true">
          <span /><span /><span />
        </div>
      </section>

      <section className={styles.projectsSection} aria-labelledby="projects-title" data-profile-section>
        <SectionHeading index="01" label="Project evidence" id="projects-title">
          Projects and<br /><em>contributions.</em>
        </SectionHeading>
        <p className={styles.sectionLead} data-profile-reveal>{profile.projects.length > 0
          ? "Projects connected to this portfolio through recorded contributor roles."
          : profile.curatedCredits?.length
            ? "No recorded contributor roles are public yet."
            : "No public projects are connected to this profile yet."}</p>
        <div className={styles.projectGrid}>
          {profile.projects.map((project, index) => (
            <article className={styles.projectCard} key={project.id} data-profile-reveal>
              <div className={styles.projectTopline}>
                <span>Project {String(index + 1).padStart(2, "0")}</span>
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
                  <a key={`${link.type}-${link.url}`} href={link.url} target="_blank" rel="noopener noreferrer">
                    {link.label} <span className={styles.visuallyHidden}>(opens in a new tab)</span>
                  </a>
                ))}
              </div>
            </article>
          ))}
        </div>
        {profile.curatedCredits?.length ? (
          <section className={styles.curatedCredits} aria-labelledby="curated-credits-title">
            <h3 id="curated-credits-title" data-profile-reveal>Credited in curated projects</h3>
            <p className={styles.sectionLead} data-profile-reveal>
              Platform staff credited {profile.name} on these showcases. Credits are descriptive attribution, not verified contribution records.
            </p>
            <div className={styles.projectGrid}>
              {profile.curatedCredits.map((credit) => (
                <article className={styles.projectCard} key={credit.projectId} data-profile-reveal>
                  <div className={styles.projectTopline}>
                    <span>Staff-curated credit</span>
                    <span>{credit.domain}</span>
                  </div>
                  <h4>{credit.title}</h4>
                  {credit.summary ? <p>{credit.summary}</p> : null}
                  <dl className={styles.projectRole}>
                    <div>
                      <dt>Credited role</dt>
                      <dd>{credit.roles.join(" / ") || "Contributor"}</dd>
                    </div>
                  </dl>
                  {credit.technologies.length ? (
                    <div className={styles.technologyBlock}>
                      <span>Project technologies</span>
                      <ul aria-label={`${credit.title} technologies`}>
                        {credit.technologies.map((technology) => <li key={technology}>{technology}</li>)}
                      </ul>
                    </div>
                  ) : null}
                  <div className={styles.projectActions}>
                    <Link href={`/projects/${credit.projectId}`} aria-label={`View curated project ${credit.title}`}>
                      View project <span aria-hidden="true">↗</span>
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </section>

      <div id="portfolio-sections" className={styles.portfolioSections}>
        {visibleSections.map((section, index) => (
          <PortfolioSection key={section} section={section} profile={profile}
            index={String(index + 2).padStart(2, "0")} />
        ))}
      </div>

      <section className={styles.inquirySection} aria-labelledby="inquiry-title" data-profile-section>
        <p className={styles.chapter} data-profile-reveal>Get in touch</p>
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


    </StudentProfileMotion>
  );
}

type PortfolioSectionKey = "about" | "skills" | "background" | "links";
const DEFAULT_SECTION_ORDER: PortfolioSectionKey[] = ["about", "skills", "background", "links"];

function normalizeSectionOrder(value: PublicStudentProfile["sectionOrder"]): PortfolioSectionKey[] {
  if (!value || value.length !== DEFAULT_SECTION_ORDER.length
    || new Set(value).size !== DEFAULT_SECTION_ORDER.length
    || value.some((section) => !DEFAULT_SECTION_ORDER.includes(section))) {
    return DEFAULT_SECTION_ORDER;
  }
  return value;
}

function sectionIsVisible(section: PortfolioSectionKey, profile: PublicStudentProfile) {
  if (section === "background") return Boolean(profile.education?.length || profile.experience?.length);
  if (section === "links") return Boolean(profile.links?.length);
  return true;
}

function PortfolioSection({
  section,
  profile,
  index,
}: {
  section: PortfolioSectionKey;
  profile: PublicStudentProfile;
  index: string;
}) {
  if (section === "about") {
    return (
      <section className={styles.capabilities} aria-labelledby="about-title" data-profile-section>
        <SectionHeading index={index} label="About" id="about-title">
          Perspective and<br /><em>direction.</em>
        </SectionHeading>
        <p className={styles.sectionLead} data-profile-reveal>{profile.biography
          || `Professional profile for ${profile.name}.`}</p>
      </section>
    );
  }
  if (section === "skills") {
    return (
      <section className={styles.capabilities} aria-labelledby="capabilities-title" data-profile-section>
        <SectionHeading index={index} label="Capabilities" id="capabilities-title">
          Structured skills.<br /><em>Clear signal.</em>
        </SectionHeading>
        <ul className={styles.skillMatrix} aria-label={`${profile.name}'s standardized skills`} data-profile-reveal>
          {profile.skills.map((skill, skillIndex) => (
            <li key={skill}><span>{String(skillIndex + 1).padStart(2, "0")}</span>{skill}</li>
          ))}
        </ul>
      </section>
    );
  }
  if (section === "background") {
    return (
      <section className={styles.linksSection} aria-labelledby="background-title" data-profile-section>
        <SectionHeading index={index} label="Background" id="background-title">
          Education and<br /><em>experience.</em>
        </SectionHeading>
        <div className={styles.backgroundColumns} data-profile-reveal>
          {profile.education?.length ? <div><h3>Education</h3><ul>{profile.education.map((entry) =>
            <li key={entry}>{entry}</li>)}</ul></div> : null}
          {profile.experience?.length ? <div><h3>Experience</h3><ul>{profile.experience.map((entry) =>
            <li key={entry}>{entry}</li>)}</ul></div> : null}
        </div>
      </section>
    );
  }
  return (
    <section className={styles.linksSection} aria-labelledby="links-title" data-profile-section>
      <SectionHeading index={index} label="Professional links" id="links-title">
        Continue the<br /><em>conversation.</em>
      </SectionHeading>
      <ul className={styles.professionalLinks} data-profile-reveal>
        {profile.links?.map((link) => (
          <li key={`${link.type}-${link.url}`}>
            <a href={link.url} target="_blank" rel="noopener noreferrer">
              <span>{link.label}</span><span aria-hidden="true">↗</span>
              <span className={styles.visuallyHidden}>(opens in a new tab)</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
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
