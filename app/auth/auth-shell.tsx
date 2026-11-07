import type { ReactNode } from "react";
import { HeroPhoto } from "../components/hero-photo";
import { fontVariables } from "../fonts";
import header from "../components/site-header.module.css";
import styles from "./auth-shell.module.css";

/** Pagine pubbliche di accesso: stessa foto e marchio della home, senza dati del servizio. */
export function AuthShell({ title, children, showIntro = true }: { title: string; children: ReactNode; showIntro?: boolean }) {
  return (
    <main className={`${styles.page} ${fontVariables}`}>
      <HeroPhoto className={styles.photo} />
      <div className={styles.veil} aria-hidden="true" />
      <span className={`${header.brand} ${styles.brand}`}>
        <span className={header.wordmark} aria-hidden="true"><i>M</i>os<i>T</i>ag<i>S</i>tudio<span className={header.dot} /></span>
        <span className={header.byline} aria-hidden="true">by Nando Taglieri</span>
      </span>
      <div className={styles.wrap}>
        {showIntro && <div className={styles.intro}>
          <span className={styles.eyebrow}>Solair Group · solairgroup.it</span>
          <h1>Visibilità su Google e AI</h1>
          <p>L’area riservata dove Solair vede come appare online, legge i report e trova le azioni per migliorare.</p>
          <ul className={styles.points}><li>Risultati su Google, settimana per settimana</li><li>Come le AI rispondono ai clienti</li><li>Report mensile e azioni da fare</li></ul>
        </div>}
        <section className={styles.card} aria-labelledby="auth-title"><h2 id="auth-title">{title}</h2>{children}</section>
      </div>
    </main>
  );
}
export { styles as authStyles };
