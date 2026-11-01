import { ResearchShell } from "./shell";
import { getKeywords,researchAccess } from "../../lib/research-store";
import { safeRead } from "../../lib/engine/safe";
import { keywordRows } from "../../lib/free-research";
import { formatDate,formatDateTime } from "../../lib/format";
import { OperatorAccess } from "../interventi/checklist";
import { ResearchForm } from "./forms";
import { KeywordTable } from "./keyword-table";
import { CollectionNotice } from "../components/collection-notice";
import Link from "next/link";
import styles from "./research.module.css";
export const dynamic="force-dynamic";
export const metadata={title:"Keyword | SolairSEO"};
export default async function Keywords(){
  const [data,editable]=await Promise.all([safeRead("ricerca keyword",()=>getKeywords("solairgroup.it")),researchAccess()]);
  const evidence=data?.latest?.data;const rows=evidence?keywordRows(evidence,data!.watched):[];
  return <ResearchShell current="/ricerca" title="Le ricerche che portano a Solair." intro="Query, clic e posizione media misurati da Google. Un punto di partenza concreto per scegliere quali pagine migliorare.">
    <CollectionNotice siteId="solairgroup.it"/>
    <p className={styles.notice}>Aggiornamento automatico con il motore Search Console. È la visibilità rilevata da Google per Solair, non un controllo indipendente delle classifiche.</p>
    <OperatorAccess authenticated={editable} label="Gestione fonti"/>
    {editable&&<details className={styles.panel}><summary>Scegli una query da seguire</summary><p className={styles.note}>Se Google non restituisce dati per questa ricerca, vedrai “non rilevata”, senza attribuirle una posizione o un volume.</p><ResearchForm kind="watch" today=""/></details>}
    {!evidence?<p className={styles.empty}>{data?"In attesa della prima raccolta completa delle query. Le query scelte resteranno nell’elenco da seguire.":"Archivio temporaneamente non disponibile."}</p>:<section className={styles.panel}><h2>Keyword e andamento</h2><p className={styles.note}>{formatDate(evidence.windows.current.from)} – {formatDate(evidence.windows.current.to)} · confronto con {formatDate(evidence.windows.previous.from)} – {formatDate(evidence.windows.previous.to)}.<br/>Raccolta: {formatDateTime(data!.latest!.createdAt)}.</p>
      <KeywordTable rows={rows} editable={editable} comparable={!!evidence.gsc.current.keywordRowsComplete&&!!evidence.gsc.previous.keywordRowsComplete} history={data!.history.map(h=>({from:h.data.windows.current.from,date:h.data.windows.current.to,queries:h.data.gsc.current.queries??[]}))}/>
      <p className={styles.note}>Google omette alcune query per riservatezza e limiti del report. Una query assente non vale zero e non dimostra una perdita di posizione. La posizione è una media delle impressioni; i totali per query possono differire dai totali del sito. {(!evidence.gsc.current.keywordRowsComplete||!evidence.gsc.previous.keywordRowsComplete)&&"Il campione API ha raggiunto il limite: confronti disattivati."}</p>
      <Link className={styles.back} href="/interventi">Consulta gli interventi proposti →</Link>
    </section>}
  </ResearchShell>;
}
