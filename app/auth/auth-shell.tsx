import type { ReactNode } from "react";
import { ChartNoAxesCombined, LockKeyhole, ScanEye, FileText, ArrowUpRight } from "lucide-react";
import styles from "./auth-shell.module.css";

export function AuthShell({ title, children, showIntro = true }: { title: string; children: ReactNode; showIntro?: boolean }) {
  return (
    <main className={styles.page}>
      <div className={styles.orbit} aria-hidden="true" />
      <header className={styles.header}>
        <div className={styles.brand} aria-label="MosTagStudio, by Nando Taglieri">
          <span className={styles.wordmark}><i>M</i>os<i>T</i>ag<i>S</i>tudio<span>.</span></span>
          <span className={styles.byline}>by Nando Taglieri</span>
        </div>
        <span className={styles.headerLabel}><span /> Solair Intelligence</span>
      </header>

      <div className={styles.content}>
        {showIntro && <section className={styles.intro} aria-labelledby="welcome-title">
          <p className={styles.eyebrow}><span /> SOLAIR GROUP · AREA RISERVATA</p>
          <h1 id="welcome-title">La tua presenza online.<br /><span>Una nuova prospettiva.</span></h1>
          <p className={styles.description}>Google, intelligenza artificiale e opportunità di crescita. Tutto ciò che serve per dare più visibilità a Solair, in un unico spazio.</p>
          <div className={styles.features}>
            <div><ChartNoAxesCombined aria-hidden="true" /><span><strong>Visibilità su Google</strong><small>I risultati, settimana dopo settimana.</small></span></div>
            <div><ScanEye aria-hidden="true" /><span><strong>Presenza nelle AI</strong><small>Come le AI raccontano Solair ai clienti.</small></span></div>
            <div><FileText aria-hidden="true" /><span><strong>Report e prossime azioni</strong><small>Dai dati alle decisioni che contano.</small></span></div>
          </div>
        </section>}

        <section className={styles.card} aria-labelledby="signed-out-title">
          <div className={styles.cardTop}><span className={styles.cardLabel}>IL TUO WORKSPACE</span><LockKeyhole size={17} aria-hidden="true" /></div>
          <div className={styles.accessIcon}><ArrowUpRight size={27} strokeWidth={1.5} aria-hidden="true" /></div>
          <h2 id="signed-out-title">{title}</h2>
          {children}
        </section>
      </div>

      <footer className={styles.footer}><span>Solair Group <span className={styles.footerDivider}>/</span> SEO & AI Intelligence</span><a href="https://solairgroup.it" target="_blank" rel="noopener noreferrer">solairgroup.it <ArrowUpRight size={14} aria-hidden="true" /></a></footer>
    </main>
  );
}

export { styles as authStyles };
