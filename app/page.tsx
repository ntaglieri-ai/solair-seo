import { requireSeoPage } from "../lib/crm-auth";
import Link from "next/link";
import { baselineAudit } from "./data/audit-baseline";
import { SiteHeader } from "./components/site-header";
import { HeroPhoto } from "./components/hero-photo";
import { fontVariables } from "./fonts";
import { HomeDashboard } from "./components/home-dashboard";
import { HeroActions } from "./components/hero-actions";
import base from "./home.module.css";
import styles from "./launch.module.css";

export const dynamic = "force-dynamic";

function Home() {
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
        <HomeDashboard />
        <footer className={styles.footer}><span>Solair Group · solairgroup.it</span><Link href="/privacy">Privacy</Link></footer>
      </div>
    </main>
  );
}

export default async function AuthorizedPage(...args: Parameters<typeof Home>) {
  await requireSeoPage();
  return Home(...args);
}
