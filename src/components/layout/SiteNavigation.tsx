"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import styles from "./site.module.css";
export type AccountLink = { href: string; label: string };
const destinations = [{href:"/",label:"Home"},{href:"/talent",label:"Talent"},{href:"/projects",label:"Projects"},{href:"/showcase",label:"Showcase"},{href:"/partners",label:"Industry partners"},{href:"/contact",label:"Inquiries"}];
export function SiteNavigation({ accountLinks }: { accountLinks: AccountLink[] }) {
  const pathname = usePathname();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const close = () => { if (dialog.current) { dialog.current.inert = true; dialog.current.close(); } setOpen(false); trigger.current?.focus(); };
  const links = (mobile = false) => destinations.map(({href,label}) => <Link key={href} href={href} aria-current={(href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`)) ? "page" : undefined} onClick={mobile ? close : undefined}>{label}</Link>);
  return <>
    <nav className={styles.desktopNav} aria-label="Main navigation">{links()}</nav>
    <div className={styles.accountNav}>{accountLinks.map(link => <Link key={link.href} href={link.href}>{link.label}</Link>)}</div>
    <button className={styles.menuTrigger} ref={trigger} type="button" onClick={() => { if (dialog.current) { dialog.current.inert = false; dialog.current.showModal(); setOpen(true); } }} aria-label="Open navigation menu" aria-haspopup="dialog" aria-expanded={open} aria-controls="site-navigation-menu"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg><span>Menu</span></button>
    <dialog id="site-navigation-menu" ref={dialog} className={styles.mobileMenu} aria-labelledby="menu-title" onClick={event => { if (event.target === dialog.current) close(); }} onClose={() => { if (dialog.current) dialog.current.inert = true; setOpen(false); trigger.current?.focus(); }} onKeyDown={event => {
      if (event.key !== "Tab") return;
      const targets = event.currentTarget.querySelectorAll<HTMLElement>("a[href],button:not([disabled])");
      const first = targets[0], last = targets[targets.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }}>
      <div className={styles.menuHeading}><h2 id="menu-title">Explore ImmXrsive</h2><button type="button" onClick={close} aria-label="Close navigation menu">Close <span aria-hidden="true">×</span></button></div>
      <nav aria-label="Mobile navigation">{links(true)}</nav>
      <nav className={styles.mobileAccount} aria-label="Your workspaces">{accountLinks.map(link => <Link key={link.href} href={link.href} onClick={close}>{link.label}<span aria-hidden="true">&#8599;</span></Link>)}{!accountLinks.some(link => link.href === "/admin") && <Link href="/admin" onClick={close}>Staff / Admin Portal<span aria-hidden="true">&#8599;</span></Link>}</nav>
      <p>Student talent. Immersive ideas. Real connections.</p>
    </dialog>
  </>;
}
