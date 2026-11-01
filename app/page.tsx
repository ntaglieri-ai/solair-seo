import Link from "next/link";
import { baselineAudit } from "./data/audit-baseline";
import { SiteHeader } from "./components/site-header";
import { HeroPhoto } from "./components/hero-photo";
import { fontVariables } from "./fonts";
import { HomeOperations } from "./home-operations";
import { HomePerformanceSummary } from "./components/home-performance-summary";
import base from "./home.module.css";
import styles from "./launch.module.css";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <main className={`${base.home} ${styles.home} ${fontVariables}`}>
      <section className={base.hero} aria-labelledby="home-title">
        <HeroPhoto className={base.heroPhoto} />
        <SiteHeader current="/" />
        <div className={base.heroBody}>
          <p className={base.eyebrow}>Solair Group · {baselineAudit.domain}</p>
          <h1 id="home-title">Visibilità su Google e AI</h1>
          <p className={base.lead}>Performance del sito e analisi per migliorare la visibilità di Solair Group.</p>
          <div className={base.heroActions}>
            <Link className={base.primary} href="#operazioni">Inizia da qui <span aria-hidden="true">↓</span></Link>
            <Link className={base.secondary} href="/analisi">Apri ultimo report <span aria-hidden="true">→</span></Link>
          </div>
        </div>
      </section>
      <div className={styles.content}>
        <HomePerformanceSummary />
        <HomeOperations />
        <footer className={styles.footer}><span>Solair Group · solairgroup.it</span><Link href="/privacy">Privacy</Link></footer>
      </div>
    </main>
  );
}
