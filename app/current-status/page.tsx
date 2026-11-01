import Link from "next/link";
import { OperationFrame } from "../components/operation-frame";
import { PerformanceLive,AnalyticsLive } from "../sezioni/[id]/live-data";
import { CollectionNotice } from "../components/collection-notice";
import { getLatestAttempts } from "../../lib/engine/read";
import { safeRead } from "../../lib/engine/safe";
import { formatDateTime } from "../../lib/format";
import styles from "../operazioni.module.css";
export const dynamic="force-dynamic";
export const metadata={title:"Current Status | SolairSEO"};
export default async function CurrentStatus({searchParams}:{searchParams:Promise<{partial?:string}>}){
  const [attempts,params]=await Promise.all([safeRead("current status",()=>getLatestAttempts("solairgroup.it")),searchParams]);
  return <OperationFrame title="Current Status" intro="I dati disponibili sul sito, con la data della raccolta e il periodo a cui si riferiscono." current="/current-status">
    {params.partial==="1"&&<p className={styles.notice}>L’aggiornamento è parziale. Per alcune fonti restano visibili i dati precedenti: controlla le date prima di confrontarli.</p>}
    <div className={styles.meta}>{["gsc","ga4"].map(kind=>{const run=attempts?.find(r=>r.kind===kind);return <span key={kind}><strong>{kind==="gsc"?"Search Console":"Analytics"}</strong> · {run?.finishedAt?formatDateTime(new Date(run.finishedAt)):"raccolta non disponibile"}{run?.status==="error"?" · raccolta non riuscita":""}</span>;})}</div>
    <CollectionNotice siteId="solairgroup.it"/>
    <div className={styles.panel}><PerformanceLive siteId="solairgroup.it"/></div>
    <div className={styles.panel}><AnalyticsLive siteId="solairgroup.it"/></div>
    <div className={styles.links}><Link href="/analisi">Leggi l’ultima analisi →</Link><Link href="/ricerca">Approfondisci keyword e fonti →</Link></div>
  </OperationFrame>;
}
