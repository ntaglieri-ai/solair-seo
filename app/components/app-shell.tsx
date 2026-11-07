import Link from "next/link";
import type { ReactNode } from "react";
import { FileText, History, LayoutDashboard, Settings2 } from "lucide-react";
import { baselineAudit } from "../data/audit-baseline";
import header from "./site-header.module.css";
import styles from "./app-shell.module.css";

const items = [
  { label: "Panoramica", href: "/", icon: LayoutDashboard },
  { label: "Report", href: "/report/ultimo", icon: FileText },
  { label: "Storico", href: "/report", icon: History },
  { label: "Impostazioni", href: "/impostazioni", icon: Settings2 },
];

/** Struttura da app: barra laterale blu a sinistra, contenuto a destra. */
export function AppShell({ current = "/", children }: { current?: string; children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <aside className={styles.side} aria-label="Navigazione">
        <Link className={`${header.brand} ${styles.brand}`} href="/" aria-label="MosTag Studio, by Nando Taglieri">
          <span className={header.wordmark} aria-hidden="true"><i>M</i>os<i>T</i>ag<i>S</i>tudio<span className={header.dot} /></span>
          <span className={header.byline} aria-hidden="true">by Nando Taglieri</span>
        </Link>
        <nav className={styles.nav}>
          {items.map(({ label, href, icon: Icon }) => (
            <Link key={label} className={styles.link} href={href} aria-current={href === current ? "page" : undefined}><Icon size={18} aria-hidden="true" />{label}</Link>
          ))}
        </nav>
        <div className={styles.foot}>
          <b>{baselineAudit.domain}</b>
          Solair Group
          <form action="/auth/logout" method="post"><button className={styles.out} type="submit">Esci</button></form>
          <div style={{ marginTop: 8 }}><Link href="/privacy">Privacy</Link></div>
        </div>
      </aside>
      <div className={styles.main}>{children}</div>
    </div>
  );
}
