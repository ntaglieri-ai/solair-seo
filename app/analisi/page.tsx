import Link from "next/link";
import { OperationFrame } from "../components/operation-frame";
import { getLastSnapshot } from "../../lib/engine/store";
import { getSql } from "../../lib/db";
import { safeRead } from "../../lib/engine/safe";
import type { Opportunity,ReviewCheck } from "../../lib/engine/analyze";
import { actionTitle } from "../data/action-plan";
import { formatDate,formatDateTime,formatInt,formatPercent,formatDecimal } from "../../lib/format";
import styles from "../operazioni.module.css";
export const dynamic="force-dynamic";
export const metadata={title:"Analisi SEO/GEO | SolairSEO"};
type Totals={clicks:number;impressions:number;ctr:number;position:number};
type Report={id:string;status:string;createdAt:Date;validatedAt:Date;data:{windows?:{current:{from:string;to:string};previous:{from:string;to:string}};summary?:{current:Totals;previous:Totals};opportunities?:Opportunity[];checks?:ReviewCheck[];limitations?:string[]}};
async function readReport(id?:string):Promise<Report|null>{
  if(!id)return await getLastSnapshot("solairgroup.it") as Report|null;
  if(!/^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(id))return null;
  const [row]=await getSql()<Report[]>`select a.id,a.status,a.data,a.created_at as "createdAt",coalesce(s.validated_at,r.finished_at,a.created_at) as "validatedAt" from seo.analysis_snapshots a join seo.runs r on r.id=a.run_id left join seo.engine_state s on s.snapshot_id=a.id and s.site_id=a.site_id where a.site_id='solairgroup.it' and a.id=${id}`;
  return row??null;
}
function readable(text:string){return text.replace(/\bpuo'/g,"può").replace(/\bpiu'/g,"più").replace(/\be'/g,"è").replace(/\bgia'/g,"già");}
export default async function Analysis({searchParams}:{searchParams:Promise<{id?:string;partial?:string}>}){
  const params=await searchParams;
  const report=await safeRead("report analisi",()=>readReport(params.id));
  const data=report?.data;
  const measured=report?.status!=="blocked"&&data?.summary&&data.windows;
  return <OperationFrame title="Analisi SEO/GEO" intro="Risultati, lettura delle evidenze e interventi consigliati per la visibilità di Solair Group." current="/analisi">
    {!report?<p className={styles.notice}>Analisi non disponibile. Torna in Home per avviare una nuova elaborazione.</p>:<>
      <div className={styles.meta}><span><strong>Analisi elaborata</strong> · {formatDateTime(new Date(report.validatedAt??report.createdAt))}</span>{data?.windows&&<span><strong>Dati analizzati</strong> · {formatDate(data.windows.current.from)} – {formatDate(data.windows.current.to)}</span>}</div>
      {(report.status!=="complete"||params.partial==="1")&&<p className={styles.notice}>{report.status==="blocked"?"Le fonti non consentono un’analisi attendibile. Non vengono presentati risultati o suggerimenti sostitutivi.":"Analisi parziale: alcune fonti o verifiche non sono disponibili. I limiti sono riportati sotto."}</p>}
      {measured&&data?.summary&&<section className={styles.panel}><h2>I risultati</h2><p className={styles.note}>Search Console · confronto con {formatDate(data.windows!.previous.from)} – {formatDate(data.windows!.previous.to)}.</p><div className={styles.metrics}>{[{label:"Clic da Google",key:"clicks" as const,format:formatInt},{label:"Impressioni",key:"impressions" as const,format:formatInt},{label:"CTR",key:"ctr" as const,format:formatPercent},{label:"Posizione media",key:"position" as const,format:formatDecimal}].map(metric=><div key={metric.key}><span>{metric.label}</span><strong>{metric.format(data.summary!.current[metric.key])}</strong><small>Prima: {metric.format(data.summary!.previous[metric.key])}</small></div>)}</div></section>}
      {measured&&<section className={styles.panel}><h2>Interventi consigliati</h2>{data?.opportunities?.length?data.opportunities.map(item=><article key={item.id} className={styles.recommendation}><span className={styles.priority}>Priorità {item.priority==="high"?"alta":"media"} · {item.page}</span><h3>{actionTitle(item)}</h3><p>{readable(item.interpretation)}</p><p><strong>Cosa fare:</strong> {readable(item.action)}</p><p><strong>Risultato da verificare:</strong> {readable(item.expectedOutcome)}</p></article>):<p>Questa elaborazione non ha individuato interventi sufficientemente supportati dalle evidenze disponibili.</p>}</section>}
      <section className={styles.panel}><h2>Visibilità AI / GEO</h2><p>Il run aggiorna le fonti disponibili e l’analisi SEO. Le risposte dei motori AI richiedono verifiche documentate: non vengono interrogate automaticamente da questa elaborazione.</p><Link className={styles.back} href="/visibilita-ai">Consulta le verifiche AI disponibili →</Link></section>
      {!!data?.checks?.length&&<section className={styles.panel}><details><summary>Evidenze da approfondire</summary><p className={styles.note}>Sono osservazioni da interpretare, distinte dagli interventi consigliati.</p>{data.checks.map(item=><div key={item.id}><h3>{item.title}</h3><p>{readable(item.interpretation)}</p></div>)}</details></section>}
      {!!data?.limitations?.length&&<section className={styles.panel}><details open={report.status!=="complete"}><summary>Fonti e limiti dell’analisi</summary><ul>{data.limitations.map(note=><li key={note}>{note}</li>)}</ul></details></section>}
    </>}
    <div className={styles.links}><Link href="/">Avvia una nuova analisi dalla Home →</Link><Link href="/impostazioni">Frequenza automatica →</Link></div>
  </OperationFrame>;
}
