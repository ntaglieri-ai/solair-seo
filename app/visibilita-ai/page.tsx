import type { Metadata } from "next";
import { SiteHeader } from "../components/site-header";
import { fontVariables } from "../fonts";
import { clientConfig } from "../../lib/client-config";
import styles from "./visibilita.module.css";
import { HeroPhoto } from "../components/hero-photo";

export const metadata: Metadata = {
  title: `Visibilità AI · ${clientConfig.productName}`,
};

export default function VisibilitaAi() {
  return (
    <main className={`${styles.page} ${fontVariables}`}>
      <section className={styles.hero} aria-labelledby="page-title">
        <HeroPhoto className={styles.heroPhoto} />
        <SiteHeader current="/visibilita-ai" />
        <div className={styles.heroBody}>
          <div className={styles.heroText}>
            <span className={styles.eyebrow}>GEO · Generative Engine Optimization</span>
            <h1 id="page-title">Visibilità AI</h1>
            <p>Misurazione da attivare</p>
          </div>
        </div>
      </section>
      <section className="content-section">
        <div className="section-inner">
          <h2>Nessuna rilevazione disponibile</h2>
          <p className="hero-copy">
            Non sono ancora state raccolte risposte verificabili dei motori AI.
            Citazioni di Solair, confronti con i concorrenti e variazioni nel tempo
            saranno disponibili dopo aver concordato le domande e svolto una rilevazione.
          </p>
          <p className="hero-copy">
            I controlli tecnici GEO dell’audit valutano accessibilità e struttura del sito:
            non misurano la presenza di Solair nelle risposte AI.
          </p>
        </div>
      </section>
    </main>
  );
}
