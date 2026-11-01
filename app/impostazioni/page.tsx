import Link from "next/link";
import { OperationFrame } from "../components/operation-frame";
import { getEngineSettings,getLastSnapshot } from "../../lib/engine/store";
import { researchAccess } from "../../lib/research-store";
import { safeRead } from "../../lib/engine/safe";
import { OperatorAccess } from "../interventi/checklist";
import { ReportSettingsForm } from "./settings-form";
import { formatDateTime } from "../../lib/format";
import { getLatestAttempts } from "../../lib/engine/read";
import styles from "../operazioni.module.css";
export const dynamic="force-dynamic";
export const metadata={title:"Impostazioni | SolairSEO"};
export default async function Settings(){
  const [settings,snapshot,editable,attempts]=await Promise.all([safeRead("impostazioni",()=>getEngineSettings("solairgroup.it")),safeRead("ultima analisi",()=>getLastSnapshot("solairgroup.it")),researchAccess(),safeRead("fonti collegate",()=>getLatestAttempts("solairgroup.it"))]);
  return <OperationFrame title="Impostazioni" intro="Programmazione dei report e stato delle fonti usate per l’analisi di Solair." current="/impostazioni"><OperatorAccess authenticated={editable} label="Gestione impostazioni"/>
    <section className={styles.panel}><h2>Report automatici</h2>{settings?<ReportSettingsForm key={`${settings.enabled}:${settings.analysisDays}:${editable}`} enabled={settings.enabled} analysisDays={settings.analysisDays} editable={editable}/>:<p>Impostazioni non disponibili. Riprova tra poco.</p>}<p className={styles.note}>I report sono consultabili in app nello stesso archivio delle analisi manuali. La programmazione viene controllata ogni giorno.</p>{snapshot?.validatedAt&&<p className={styles.note}>Ultima elaborazione validata: {formatDateTime(new Date(snapshot.validatedAt))}.</p>}<Link className={styles.back} href="/report">Apri l’archivio report →</Link></section>
    <section className={styles.panel}><h2>Fonti collegate</h2><p>Le rilevazioni usano le proprietà Google configurate per solairgroup.it.</p><div className={styles.sourceStatus}>{(["gsc","ga4"] as const).map(kind=>{const run=attempts?.find(r=>r.kind===kind);const status=!run?"Stato non disponibile":run.status==="error"?"Collegamento o raccolta da verificare":run.status==="running"?"Raccolta in corso":run.stale?"Dati da aggiornare":"Ultima raccolta riuscita";return <div key={kind}><strong>{kind==="gsc"?"Google Search Console":"Google Analytics"}</strong><span>{status}</span>{run?.finishedAt&&<span>{formatDateTime(new Date(run.finishedAt))}</span>}</div>;})}</div><Link className={styles.back} href="/sezioni/tracking-setup">Stato sistema e registro delle raccolte →</Link></section>
    <section className={styles.panel}><details><summary>Archivio e viste precedenti</summary><div className={styles.links}><Link href="/home2">Panoramica precedente →</Link><Link href="/report">Audit e documenti di riferimento →</Link></div></details>{editable&&<details><summary>Strumenti interni del servizio</summary><p className={styles.note}>L’organizzazione dei lavori resta separata dal report destinato al cliente.</p><Link className={styles.back} href="/interventi">Gestione interventi →</Link></details>}</section>
    <div className={styles.links}><Link href="/privacy">Privacy →</Link></div>
  </OperationFrame>;
}
