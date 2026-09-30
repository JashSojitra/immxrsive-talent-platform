import styles from "@/components/student-profile/student-profile.module.css";

export default function StudentProfileLoading() {
  return (
    <main className={styles.page} aria-busy="true">
      <section className={styles.loadingState} aria-label="Loading student profile">
        <p className={styles.chapter}>Resolving public profile</p>
        <div /><div /><div />
      </section>
    </main>
  );
}
