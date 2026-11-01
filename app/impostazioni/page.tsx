import Link from "next/link";
import { OperationFrame } from "../components/operation-frame";
import { getEngineSettings,getLastSnapshot } from "../../lib/engine/store";
import { researchAccess } from "../../lib/research-store";
import { safeRead } from "../../lib/engine/safe";
import { OperatorAccess } from "../interventi/checklist";
import { ReportSettingsForm } from "./settings-form";
import { formatDateTime } from "../../lib/format";
import styles from "../operazioni.module.css";
export const dynamic="force-dynamic";
export const metadata={title:"Impostazioni | SolairSEO"};
export default async function Settings(){
  const [settings,snapshot,editable]=await Promise.all([safeRead("impostazioni",()=>getEngineSettings("solairgroup.it")),safeRead("ultima analisi",()=>getLastSnapshot("solairgroup.it")),researchAccess()]);
  return <OperationFrame title="Impostazioni" intro="La stessa analisi, su richiesta oppure alla frequenza che scegli." current="/impostazioni"><OperatorAccess authenticated={editable} label="Gestione impostazioni"/>
    <section className={styles.panel}><h2>Programmazione delle analisi</h2>{settings?<ReportSettingsForm key={`${settings.enabled}:${settings.analysisDays}:${editable}`} enabled={settings.enabled} analysisDays={settings.analysisDays} editable={editable}/>:<p>Impostazioni non disponibili. Riprova tra poco.</p>}</section>
    <section className={styles.panel}><h2>Consultazione del report</h2><p>Le analisi automatiche sono consultabili nella pagina “Analisi SEO/GEO”. La programmazione viene controllata ogni giorno; l’invio via email non è incluso.</p>{snapshot?.validatedAt&&<p className={styles.note}>Ultima elaborazione validata: {formatDateTime(new Date(snapshot.validatedAt))}.</p>}<Link className={styles.back} href="/analisi">Apri l’ultima analisi →</Link></section>
    <div className={styles.links}><Link href="/sezioni/tracking-setup">Stato delle fonti →</Link><Link href="/home2">Panoramica precedente →</Link></div>
  </OperationFrame>;
}
