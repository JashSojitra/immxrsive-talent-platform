import Link from "next/link";
import styles from "@/components/discovery/discovery.module.css";

export default function NotFound() {
  return (
    <main className={styles.page}>
      <p className="ui-eyebrow">404 / Page not found</p>
      <h1 className={`ui-display ${styles.heading}`}>Page <em className="ui-display-accent">not found.</em></h1>
      <p className={styles.intro}>The page may have moved or the address may be incorrect.</p>
      <Link href="/" className="ui-button ui-button-primary">Return home</Link>
    </main>
  );
}
