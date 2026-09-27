import Link from "next/link";
import { baselineAudit } from "../data/audit-baseline";
import { currentReportUrl } from "../data/home";
import { SiteMenu } from "./site-menu";
import styles from "./site-header.module.css";

const menu = [
  { label: "Report", href: currentReportUrl },
  { label: "Performance", href: "/sezioni/performance" },
  { label: "Visibilità AI", href: "/visibilita-ai" },
  { label: "Action plan", href: "/sezioni/action-plan" },
  { label: "Tracking", href: "/sezioni/tracking-setup" },
  { label: "Storico", href: "/sezioni/historical-comparison" },
];

/** Marchio e menu principale, da mettere in cima alla hero della pagina. */
export function SiteHeader({ current }: { current?: string }) {
  return (
    <header className={styles.topbar}>
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
