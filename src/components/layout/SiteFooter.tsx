import Link from "next/link";
import { BrandMark } from "./BrandMark";
import { FooterWordmark } from "./FooterWordmark";
import styles from "./site.module.css";
export function SiteFooter() {
  return <footer className={styles.footer}>
    <div className={styles.footerInner}>
      <div className={styles.footerTop}>
        <div><p className={styles.footerBrand}>Ideas deserve<br /><em>an audience.</em></p><p>Discover the people and projects<br />shaping immersive experiences.</p></div>
        <nav aria-label="Footer navigation"><span className={styles.footerLabel}>Explore</span><Link href="/talent">Discover talent</Link><Link href="/projects">Explore projects</Link><Link href="/showcase">Experience the showcase</Link><Link href="/world">ImmXrsive World</Link><Link href="/partners">Industry partners</Link></nav>
        <nav aria-label="Get involved"><span className={styles.footerLabel}>Get involved</span><Link href="/student/dashboard">Student workspace</Link><Link href="/admin">Staff / Admin Portal</Link><Link href="/contact">Start an inquiry</Link><span>COSC 3506 · Brampton</span></nav>
      </div>
      <FooterWordmark />
      <p>Interactive components adapted from <a href="https://skiper-ui.com" target="_blank" rel="noopener noreferrer">Skiper UI</a> by Gurvinder Singh.</p>
      <div className={styles.footerBottom}><span className={styles.footerSign}><BrandMark className={styles.footerMark} />NOT ImmXrsive · Talent &amp; Industry Platform</span><div className={styles.credit}><span>Developed by <strong>Jash Sojitra</strong></span><a href="https://github.com/JashSojitra" target="_blank" rel="noopener noreferrer" aria-label="Jash Sojitra on GitHub"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.86c-2.78.6-3.37-1.18-3.37-1.18-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.35 1.09 2.93.83.09-.65.35-1.09.64-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.99 1.03-2.69-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.58 9.58 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.6 1.03 2.69 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.76c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" /></svg></a><a href="https://www.linkedin.com/in/jashsojitra/" target="_blank" rel="noopener noreferrer" aria-label="Jash Sojitra on LinkedIn"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.45 2H3.55C2.69 2 2 2.68 2 3.52v16.96c0 .84.69 1.52 1.55 1.52h16.9c.86 0 1.55-.68 1.55-1.52V3.52c0-.84-.69-1.52-1.55-1.52ZM7.93 18.75H4.98V9.2h2.95v9.55ZM6.46 7.9a1.71 1.71 0 1 1 0-3.42 1.71 1.71 0 0 1 0 3.42Zm12.29 10.85H15.8v-4.64c0-1.11-.02-2.54-1.55-2.54-1.55 0-1.79 1.21-1.79 2.46v4.72H9.51V9.2h2.83v1.3h.04c.39-.74 1.36-1.53 2.79-1.53 2.99 0 3.58 1.96 3.58 4.5v5.28Z" /></svg></a></div></div>
    </div>
  </footer>;
}
