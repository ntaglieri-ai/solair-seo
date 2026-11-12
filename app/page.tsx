import { requireSeoPage } from "../lib/crm-auth";
import Link from "next/link";
import { Topbar } from "./components/app-shell";
import { fontVariables } from "./fonts";
import { HomeDashboard } from "./components/home-dashboard";
import { SourcesPill } from "./components/sources-pill";
import base from "./home.module.css";
import styles from "./launch.module.css";
import home from "./components/dash.module.css";

export const dynamic = "force-dynamic";

function Home() {
  return (
    <main className={`${base.home} ${styles.home} ${fontVariables} ${home.screen}`}>
      <Topbar title="Panoramica"><SourcesPill /></Topbar>
      <div className={`${styles.content} ${home.page}`}>
        <div className={home.pageHeading}>
          <div><h1 className={home.title}>Il servizio in un colpo d’occhio</h1>
          <p className={home.subtitle}>Cosa stiamo misurando per Solair, cosa è pronto e cosa fare adesso.</p></div>
          <Link className={home.generateLink} href="/report#nuovo-report">Genera report →</Link>
        </div>
        <HomeDashboard />
      </div>
    </main>
  );
}

export default async function AuthorizedPage(...args: Parameters<typeof Home>) {
  await requireSeoPage();
  return Home(...args);
}
