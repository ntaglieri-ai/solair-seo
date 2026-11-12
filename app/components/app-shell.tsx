"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ClipboardCheck, FileText, LayoutDashboard, Settings2, Sparkles } from "lucide-react";
import { baselineAudit } from "../data/audit-baseline";
import header from "./site-header.module.css";
import styles from "./app-shell.module.css";

const items = [
  { label: "Panoramica", href: "/", icon: LayoutDashboard, active: (p: string) => p === "/" },
  { label: "Report", href: "/report", icon: FileText, active: (p: string) => p === "/report" || p.startsWith("/report/") || p === "/analisi" },
  { label: "Visibilità AI", href: "/visibilita-ai", icon: Sparkles, active: (p: string) => p.startsWith("/visibilita-ai") },
  { label: "Interventi", href: "/interventi", icon: ClipboardCheck, active: (p: string) => p.startsWith("/interventi") },
  { label: "Impostazioni", href: "/impostazioni", icon: Settings2, active: (p: string) => p.startsWith("/impostazioni") },
];

/** Struttura da app: barra laterale blu a sinistra, contenuto a destra. */
/** Barra in alto comune a tutte le pagine: dove sei e di quale sito. */
export function Topbar({ title, children }: { title: string; children?: ReactNode }) {
  return <div className={styles.top}><div className={styles.crumb}>{title}<small>Solair Group · {baselineAudit.domain}</small></div>{children}</div>;
}
export function StatusPill({ ok, children }: { ok: boolean; children: ReactNode }) {
  return <span className={styles.pill} data-tone={ok ? undefined : "amber"}>{children}</span>;
}

export function AppShell({ children, dataDate = null }: { children: ReactNode; dataDate?: string | null }) {
  const pathname = usePathname();
  if (pathname.startsWith("/auth")) return <>{children}</>;
  return (
    <div className={styles.shell}>
      <aside className={styles.side} aria-label="Navigazione">
        <Link className={`${header.brand} ${styles.brand}`} href="/" aria-label="MosTag Studio, by Nando Taglieri">
          <span className={header.wordmark} aria-hidden="true"><i>M</i>os<i>T</i>ag<i>S</i>tudio<span className={header.dot} /></span>
          <span className={header.byline} aria-hidden="true">by Nando Taglieri</span>
        </Link>
        <nav className={styles.nav}>
          {items.map(({ label, href, icon: Icon, active }) => (
            <Link key={label} className={styles.link} href={href} aria-current={active(pathname) ? "page" : undefined}><Icon size={18} aria-hidden="true" />{label}</Link>
          ))}
        </nav>
        <div className={styles.foot}>
          <b>{baselineAudit.domain}</b>
          {dataDate ? `Dati Search Console al ${dataDate}` : "Solair Group"}
          <div className={styles.footLinks}>
            <form action="/auth/logout" method="post"><button className={styles.out} type="submit">Esci</button></form>
            <Link href="/privacy">Privacy</Link>
          </div>
        </div>
      </aside>
      <div className={styles.main}>{pathname !== "/" && <Topbar title={items.find(i => i.active(pathname))?.label ?? "Solair SEO"} />}{children}</div>
    </div>
  );
}
