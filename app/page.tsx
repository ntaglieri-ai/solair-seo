import Link from "next/link";
import { baselineAudit } from "./data/audit-baseline";
import { SiteHeader } from "./components/site-header";
import { HeroPhoto } from "./components/hero-photo";
import { fontVariables } from "./fonts";
import { HomeNow } from "./components/home-now";
import { HomeAi } from "./components/home-ai";
import { HomeFunctions } from "./components/home-functions";
import { HeroActions } from "./components/hero-actions";
import { HomeActions } from "./components/home-actions";
import overview from "./components/overview.module.css";
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
          <p className={base.lead}>Come Solair appare su Google e nelle risposte delle AI, e cosa fare per migliorare.</p>
          <HeroActions />
        </div>
      </section>
      <div className={styles.content}>
        <HomeNow />
        <HomeAi />
        <div className={overview.panel}><HomeActions /></div>
        <HomeFunctions />
        <footer className={styles.footer}><span>Solair Group · solairgroup.it</span><Link href="/privacy">Privacy</Link></footer>
      </div>
    </main>
  );
}
