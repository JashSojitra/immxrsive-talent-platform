import styles from "@/components/project-detail/project-detail.module.css";

export default function ProjectLoading() {
  return (
    <main className={styles.page} aria-busy="true">
      <section className={styles.loadingState} aria-label="Loading project">
        <p className={styles.chapter}>Resolving project evidence</p>
        <div /><div /><div />
      </section>
    </main>
  );
}
