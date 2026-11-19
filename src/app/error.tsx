"use client";
import Link from "next/link";
import styles from "@/components/discovery/discovery.module.css";
export default function PageError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className={styles.page}><p className="ui-eyebrow">Something interrupted this page</p><h1 className={styles.heading}>Let’s try <em>again.</em></h1><p className={styles.intro}>We couldn’t load this page. Try again, or return to the talent directory to keep exploring.</p><div className={styles.summary}><button className="ui-button ui-button-primary" onClick={reset}>Try again</button><Link href="/talent">Explore talent</Link></div></main>;
}
