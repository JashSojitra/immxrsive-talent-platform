"use client";
import Link from "next/link";
import styles from "@/components/discovery/discovery.module.css";

export default function ErrorPage({ reset }: { reset: () => void }) { return <main className={styles.page}><h1 className="ui-display">Administration is temporarily <em className="ui-display-accent">unavailable</em></h1><p role="alert">Your request could not be completed. Check your connection and current staff access before retrying.</p><button className="ui-button ui-button-primary" onClick={reset}>Try again</button> <Link className="ui-button" href="/">Return home</Link></main>; }
