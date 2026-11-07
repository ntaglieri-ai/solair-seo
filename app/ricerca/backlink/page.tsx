import { requireSeoPage } from "../../../lib/crm-auth";
import { ResearchShell } from "../shell";
import { getBacklinks,researchAccess } from "../../../lib/research-store";
import { safeRead } from "../../../lib/engine/safe";
import { backlinkChanges } from "../../../lib/free-research";
import { formatDate,formatInt } from "../../../lib/format";
import { OperatorAccess } from "../../interventi/checklist";
import { ResearchForm } from "../forms";
import { LinkTable } from "./link-table";
import styles from "../research.module.css";
export const dynamic="force-dynamic";
export const metadata={title:"Backlink | SolairSEO"};
async function Backlinks(){
  const [data,editable]=await Promise.all([safeRead("backlink",()=>getBacklinks("solairgroup.it")),researchAccess()]);
  const latest=data?.[0],previous=data?.[1];const changes=backlinkChanges(latest?.data??[],previous?.data??null);
  return <ResearchShell current="/ricerca/backlink" title="I collegamenti verso Solair." intro="Link esterni documentati da Search Console, conservati per data. Un archivio verificabile, senza stime di autorevolezza inventate.">
    <p className={styles.notice}>Aggiornamento tramite esportazione del report Link di Search Console. Non è un censimento completo del web e non viene aggiornato automaticamente via API.</p>
    <OperatorAccess authenticated={editable} label="Gestione fonti"/>
    {editable&&<details className={styles.panel}><summary>Importa un’esportazione di Search Console</summary><p className={styles.note}>Apri il report Link, esporta i link esterni e scegli il CSV delle pagine con link.</p><a className={styles.back} href="https://search.google.com/search-console/links?resource_id=sc-domain%3Asolairgroup.it" target="_blank" rel="noreferrer">Apri il report Link ↗</a><ResearchForm kind="backlinks" today={new Date().toISOString().slice(0,10)}/></details>}
    {!latest?<p className={styles.empty}>{data?"Nessuna esportazione ancora importata. Numero di backlink e domini non misurati.":"Archivio non disponibile."}</p>:<>
      <section className={styles.panel}><h2>L’esportazione più recente</h2><p className={styles.note}>{formatDate(latest.date)} · {latest.filename}</p><div className={styles.metrics}><span><strong>{formatInt(latest.data.length)}</strong>link distinti nell’export</span><span><strong>{formatInt(new Set(latest.data.map(l=>l.domain)).size)}</strong>domini nell’export</span></div><LinkTable links={latest.data}/><p className={styles.note}>Fonte dichiarata dall’operatore: esportazione Search Console. Link e domini non rappresentano il totale assoluto; il file non verifica che un collegamento sia ancora presente oggi.</p></section>
      {previous&&<section className={styles.panel}><h2>Confronto tra esportazioni</h2><p className={styles.note}>{formatDate(previous.date)} → {formatDate(latest.date)}. Un campione può cambiare: l’assenza dal file non dimostra la perdita di un backlink.</p>{!changes.comparable?<p className={styles.empty}>Esportazioni non confrontabili: la disponibilità delle destinazioni è diversa tra i due file.</p>:<><div className={styles.metrics}><span><strong>{changes.added.length}</strong>nuovi nel campione</span><span><strong>{changes.missing.length}</strong>non più nel campione</span></div><details><summary>Dettagli delle differenze</summary><h3>Nuovi nel campione</h3><LinkTable links={changes.added}/><h3>Non più nel campione</h3><LinkTable links={changes.missing}/></details></>}</section>}
    </>}
    <details className={styles.panel}><summary>Come leggere questi dati</summary><p className={styles.note}>I link non equivalgono a raccomandazioni né a un punteggio di autorità. Google mostra un campione di collegamenti conosciuti e ne consente l’esportazione. <a href="https://support.google.com/webmasters/answer/9049606?hl=it" target="_blank" rel="noreferrer">Documentazione Google ↗</a></p></details>
  </ResearchShell>;
}

export default async function AuthorizedPage(...args: Parameters<typeof Backlinks>) {
  await requireSeoPage();
  return Backlinks(...args);
}
