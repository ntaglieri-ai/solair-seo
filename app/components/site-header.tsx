import Link from "next/link";
import { baselineAudit } from "../data/audit-baseline";
import { SiteMenu } from "./site-menu";
import styles from "./site-header.module.css";

const menu = [
  { label: "Panoramica", href: "/" },
  { label: "Report", href: "/report" },
  { label: "Impostazioni", href: "/impostazioni" },
];

/** Marchio e menu condivisi; variante compatta per il cruscotto. */
export function SiteHeader({ current, compact = false }: { current?: string; compact?: boolean }) {
  const section = current === "/" || current === "/home2" ? "/" :
    current === "/impostazioni" || current === "/sezioni/tracking-setup" ? "/impostazioni" : current ? "/report" : undefined;
  return (
    <header className={`${styles.topbar} ${compact ? styles.compact : ""}`}>
      <div className={styles.topbarInner}>
        <Link className={styles.brand} href="/">
          <span className={styles.brandMark} aria-hidden="true" />
          <span className={styles.brandText}>
            <strong>SolairSEO</strong>
            <span>by Solair Group</span>
          </span>
        </Link>
        <div className={styles.headerActions}>
          <SiteMenu items={menu} current={section} domain={baselineAudit.domain} />
          <a className={styles.creditLink} href="https://aistudio.google.com/billing" target="_blank" rel="noopener noreferrer" aria-label="Apri il credito Google in AI Studio, nuova scheda" title="Consulta il saldo reale su Google AI Studio">
            Credito Google <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
    </header>
  );
}
