import Link from "next/link";
import { ReportRunProvider, HeroReportControls } from "./components/report-runner";
import { HeroTrend } from "./components/hero-trend";
import { baselineAudit } from "./data/audit-baseline";
import { SiteHeader } from "./components/site-header";
import { HeroPhoto } from "./components/hero-photo";
import { fontVariables } from "./fonts";
import { HomeGemini } from "./components/home-gemini";
import { HomeActions } from "./components/home-actions";
import { HomeLatest } from "./components/home-latest";
import overview from "./components/overview.module.css";
import { HomePerformanceSummary } from "./components/home-performance-summary";
import base from "./home.module.css";
import styles from "./launch.module.css";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <ReportRunProvider><main className={`${base.home} ${styles.home} ${fontVariables}`}>
      <section className={base.hero} aria-labelledby="home-title">
        <HeroPhoto className={base.heroPhoto} />
        <SiteHeader current="/" />
        <div className={base.heroBody}>
          <p className={base.eyebrow}>Solair Group · {baselineAudit.domain}</p>
          <h1 id="home-title">Visibilità su Google e AI</h1>
          <p className={base.lead}>Performance del sito e analisi per migliorare la visibilità di Solair Group.</p>
          <HeroReportControls><HeroTrend siteId={baselineAudit.domain}/></HeroReportControls>
        </div>
      </section>
      <div className={styles.content}>
        <HomePerformanceSummary />
        <div className={overview.row}><HomeGemini /><HomeActions /></div>
        <HomeLatest />
        <footer className={styles.footer}><span>Solair Group · solairgroup.it</span><Link href="/privacy">Privacy</Link></footer>
      </div>
    </main></ReportRunProvider>
  );
}
