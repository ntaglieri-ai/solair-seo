import Link from "next/link";
import { baselineAudit } from "../data/audit-baseline";
import { currentReportUrl } from "../data/home";
import { SiteMenu } from "./site-menu";
import styles from "./site-header.module.css";

const menu = [
  { label: "Performance", href: "/sezioni/performance" },
  { label: "Ricerca SEO", href: "/ricerca" },
  { label: "Interventi proposti", href: "/interventi" },
  { label: "Visibilità AI", href: "/visibilita-ai" },
  { label: "Audit baseline", href: "/sezioni/executive-summary" },
  { label: "Storico", href: "/sezioni/historical-comparison" },
  { label: "Stato sistema", href: "/sezioni/tracking-setup" },
  { label: "Report storico", href: currentReportUrl },
  { label: "Privacy", href: "/privacy" },
];

/** Marchio e menu condivisi; variante compatta per il cruscotto. */
export function SiteHeader({ current, compact = false }: { current?: string; compact?: boolean }) {
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
        <SiteMenu items={menu} current={current} domain={baselineAudit.domain} />
      </div>
    </header>
  );
}
