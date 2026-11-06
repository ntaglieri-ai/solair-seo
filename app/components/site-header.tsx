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
        <Link className={styles.brand} href="/" aria-label="MosTag Studio, by Nando Taglieri">
          <span className={styles.wordmark} aria-hidden="true">
            <i>M</i>os<i>T</i>ag<i>S</i>tudio<span className={styles.dot} />
          </span>
          <span className={styles.byline} aria-hidden="true">by Nando Taglieri</span>
        </Link>
        <SiteMenu items={menu} current={section} domain={baselineAudit.domain} />
      </div>
    </header>
  );
}
