import Link from "next/link";
import { ResearchShell } from "../shell";
import { getMarket,researchAccess } from "../../../lib/research-store";
import { getEngineInputs } from "../../../lib/engine/store";
import { safeRead } from "../../../lib/engine/safe";
import { formatDateTime } from "../../../lib/format";
import { OperatorAccess } from "../../interventi/checklist";
import { ResearchButton,ResearchForm } from "../forms";
import styles from "../research.module.css";
export const dynamic="force-dynamic";
export const metadata={title:"Concorrenti | SolairSEO"};
const topics=[{name:"Fotovoltaico",pattern:/fotovoltaic/i},{name:"Accumulo",pattern:/accumul|batteri/i},{name:"Configuratore",pattern:/configurator|calcol.*risparm/i},{name:"Imprese",pattern:/aziend|impres|industr/i}];
export default async function Competitors(){
  const [market,inputs,editable]=await Promise.all([safeRead("concorrenti",()=>getMarket("solairgroup.it")),safeRead("pagine Solair",()=>getEngineInputs("solairgroup.it")),researchAccess()]);
  const scanned=(market?.batch?.data??[]).filter(scan=>market?.rivals.some(r=>r.enabled&&r.domain===scan.domain));
  const own=inputs?.technical;
  const rows=[...(own?[{name:"Solair Group",pages:own.data.pages,date:own.createdAt}]:[]),...scanned.map(scan=>({name:scan.name,pages:scan.pages,date:new Date(scan.scannedAt)}))];
  return <ResearchShell current="/ricerca/concorrenti" title="Il confronto con il mercato." intro="Le pagine pubbliche dei benchmark selezionati, accanto a quelle di Solair. Evidenze da leggere prima di decidere il prossimo intervento.">
    <p className={styles.notice}>Raccolta automatica con la frequenza dei controlli tecnici. Per ogni benchmark vengono lette al massimo tre pagine. Il confronto riguarda l’HTML pubblico: non misura traffico, ranking o quote di mercato.</p>
    <OperatorAccess authenticated={editable} label="Gestione fonti"/>
    {editable&&<details className={styles.panel}><summary>Aggiungi un benchmark</summary><ResearchForm kind="rival" today=""/></details>}
    {!market?<p className={styles.empty}>Archivio dei concorrenti non disponibile.</p>:<>
      <section className={styles.panel}><h2>Benchmark selezionati</h2>{market.rivals.map(r=><div key={r.domain}><h3><a href={`https://${r.domain}`} target="_blank" rel="noreferrer">{r.name} ↗</a> <span className={styles.tag}>{r.enabled?"Attivo":"Sospeso"}</span></h3><p className={styles.note}>{r.reason}</p>{editable&&<ResearchButton body={{operation:"rival",...r,enabled:!r.enabled}}>{r.enabled?"Sospendi confronto":"Riattiva confronto"}</ResearchButton>}</div>)}<p className={styles.note}>La selezione serve al confronto editoriale e commerciale; non è una classifica dei concorrenti più visibili su Google.</p></section>
      {!market.batch?<p className={styles.empty}>Prima raccolta dei benchmark in attesa.</p>:<>
        <section className={styles.panel}><h2>Temi visibili nel campione</h2><p className={styles.note}>Riscontro nei titoli e nelle descrizioni delle pagine lette. “Non rilevato” non significa che il sito non tratti il tema.</p><div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Sito</th>{topics.map(t=><th key={t.name}>{t.name}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={r.name}><td>{r.name}<br/><small>{formatDateTime(r.date)}</small></td>{topics.map(t=><td key={t.name}>{r.pages.some(p=>p.status===200&&t.pattern.test(`${p.title} ${"description" in p?p.description:""}`))?"Rilevato":"Non rilevato"}</td>)}</tr>)}</tbody></table></div></section>
        {scanned.map(scan=><section className={styles.panel} key={scan.domain}><h2>{scan.name}</h2><p className={styles.note}>Lettura: {formatDateTime(new Date(scan.scannedAt))} · {scan.complete?"Campione letto":"Copertura parziale"}</p>{scan.pages.some(p=>p.status===200)?scan.pages.map(p=><div key={p.url}><h3><a href={p.url} target="_blank" rel="noreferrer">{p.title||p.url} ↗</a></h3><p className={styles.note}>{p.status===200?p.description||"Descrizione non rilevata.":`Lettura non riuscita (${p.status??"errore di rete"}).`}</p></div>):<p className={styles.empty}>Nessuna pagina disponibile in questa lettura. Non vengono dedotte conclusioni sul concorrente.</p>}<details><summary>Fonti e limiti del campione</summary><ul className={styles.sourceList}>{scan.limitations.map(note=><li key={note}>{note}</li>)}</ul></details></section>)}
      </>}
      <p className={styles.note}>Prima di proporre contenuti nuovi, confrontiamo queste evidenze con le ricerche reali di Solair. Un tema presente nel campione di un concorrente non diventa automaticamente un’attività da finanziare.</p><Link className={styles.back} href="/ricerca">Confronta le query di Solair →</Link>
    </>}
  </ResearchShell>;
}
