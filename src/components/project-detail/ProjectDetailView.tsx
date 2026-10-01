import Link from "next/link";

import type { PublicProjectDetail } from "@/db/queries/project-detail";

import { ProjectDetailMotion } from "./ProjectDetailMotion";
import styles from "./project-detail.module.css";

export function ProjectDetailView({ project }: { project: PublicProjectDetail }) {
  return (
    <ProjectDetailMotion>
      <a className={styles.skipLink} href="#project-evidence">Skip to project evidence</a>
      <div className={styles.spatialBackdrop} aria-hidden="true"><span /><span /><span /></div>

      <header className={styles.siteHeader} data-project-nav>
        <Link href="/talent" className={styles.brand} aria-label="ImmXrsive talent directory">
          IMM<span>X</span>RSIVE
        </Link>
        <nav aria-label="Primary navigation">
          <Link href="/talent">Talent</Link>
          <span aria-current="page">Project</span>
        </nav>
      </header>

      <section className={styles.hero} aria-labelledby="project-title">
        <div className={styles.heroIndex} data-project-index>
          <span>Project evidence</span>
          <strong>{project.id}</strong>
        </div>
        <div className={styles.heroBody}>
          <p className={styles.domain} data-project-lead>{project.domain}</p>
          <h1 id="project-title" data-project-title>{project.title}</h1>
          <p className={styles.description} data-project-lead>{project.description}</p>
          <dl className={styles.heroMeta} data-project-meta>
            <div><dt>Project</dt><dd>{project.id}</dd></div>
            <div><dt>Contributors</dt><dd>{project.contributors.length}</dd></div>
            <div><dt>Technologies</dt><dd>{project.technologies.length}</dd></div>
          </dl>
        </div>
      </section>

      <div id="project-evidence">
        <section className={styles.technologySection} aria-labelledby="technologies-title" data-project-section>
          <SectionHeading index="02" label="Technology system" id="technologies-title">
            Built with a<br /><em>project stack.</em>
          </SectionHeading>
          <div className={styles.sectionBody} data-project-reveal>
            <p>
              These are technologies used by the project. They are not the skills of every contributor.
            </p>
            <ol className={styles.technologyList} aria-label={`${project.title} project technologies`}>
              {project.technologies.map((technology, index) => (
                <li key={technology}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{technology}</strong>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className={styles.contributorSection} aria-labelledby="contributors-title" data-project-section>
          <SectionHeading index="03" label="Contributors" id="contributors-title">
            Roles make the<br /><em>work legible.</em>
          </SectionHeading>
          <p className={styles.sectionLead} data-project-reveal>
            Contributor roles describe work on this project. Individual skills live only on each published student profile.
          </p>
          <ol className={styles.contributorList} aria-label={`${project.title} contributors`}>
            {project.contributors.map((contributor, index) => (
              <li key={contributor.studentId} data-project-contributor>
                <span className={styles.contributorIndex}>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <span className={styles.roleLabel}>Contributor role</span>
                  <strong className={styles.role}>{contributor.role}</strong>
                </div>
                <div className={styles.contributorIdentity}>
                  {contributor.profileUrl && contributor.name ? (
                    <Link href={contributor.profileUrl}>
                      <span>{contributor.name}</span>
                      <small>{contributor.headline}</small>
                      <b aria-hidden="true">↗</b>
                    </Link>
                  ) : (
                    <div aria-label={`Public profile unavailable for contributor ${index + 1}`}>
                      <span>Public profile unavailable</span>
                      <small>Contributor relationship retained</small>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.assetsSection} aria-labelledby="assets-title" data-project-section>
          <SectionHeading index="04" label="Project evidence" id="assets-title">
            Follow the<br /><em>supplied links.</em>
          </SectionHeading>
          <div className={styles.sectionBody} data-project-reveal>
            <p>External evidence is provided as supplied and is not fetched or validated during page rendering.</p>
            {project.assets.length > 0 ? (
              <ul className={styles.assetList} aria-label={`${project.title} public assets`}>
                {project.assets.map((asset) => (
                  <li key={`${asset.type}-${asset.url}`}>
                    <a href={asset.url} target="_blank" rel="noopener noreferrer">
                      <span><small>{asset.type}</small>{asset.label}</span>
                      <span aria-hidden="true">↗</span>
                      <span className={styles.visuallyHidden}>(opens in a new tab)</span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : <p className={styles.emptyState}>No public project assets supplied.</p>}
          </div>
        </section>
      </div>

      <section className={styles.inquirySection} aria-labelledby="inquiry-title" data-project-section>
        <p className={styles.chapter} data-project-reveal>05 / Employer action</p>
        <h2 id="inquiry-title" data-project-reveal>
          Interested in collaborating<br />around <em>this project?</em>
        </h2>
        <p data-project-reveal>
          Send a project-specific inquiry with this project context attached automatically.
        </p>
        <Link className={styles.inquiryCta} href={`/inquiry/project/${project.id}`} data-project-reveal>
          Project inquiry for {project.title} <span aria-hidden="true">↗</span>
        </Link>
      </section>

      <footer className={styles.footer}>
        <span>ImmXrsive</span>
        <Link href="/talent">Return to talent index</Link>
      </footer>
    </ProjectDetailMotion>
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
    <div className={styles.sectionHeading} data-project-reveal>
      <p className={styles.chapter}>{index} / {label}</p>
      <h2 id={id}>{children}</h2>
    </div>
  );
}
