import Link from "next/link";
import { OperationFrame } from "../components/operation-frame";
import { readReport } from "../../lib/report-read";
import { reportReading,reportText } from "../../lib/report-presentation";
import { safeRead } from "../../lib/engine/safe";
import { actionTitle } from "../data/action-plan";
import { formatDate,formatDateTime,formatInt,formatPercent,formatDecimal } from "../../lib/format";
import { ExportButton } from "../report/[id]/export-button";
import styles from "../operazioni.module.css";
export const dynamic="force-dynamic";
export const metadata={title:"Report SEO/GEO | SolairSEO"};

export default async function Analysis({searchParams}:{searchParams:Promise<{id?:string;partial?:string}>}){
  const params=await searchParams;
  const report=await safeRead("report analisi",()=>readReport(params.id));
  const data=report?.data;
  const measured=report?.status!=="blocked"&&data?.summary&&data.windows;
  const reading=measured&&data?.summary?reportReading(data.summary.current,data.summary.previous):null;
  const actions=(data?.opportunities??[]).filter(item=>["ctr","near_top10","technical"].includes(item.kind)&&typeof item.page==="string"&&typeof item.action==="string");
  return <OperationFrame title="Report SEO/GEO" intro="Come sta andando Solair, cosa significa e quali interventi conviene valutare. Una lettura riferita alle evidenze della rilevazione." current="/analisi">
    <div className={styles.toolbar}><Link className={styles.back} href="/report">← Report e storico</Link>{report&&<ExportButton/>}</div>
    {!report?<p className={styles.notice}>Report non disponibile. Torna in Panoramica per generare una nuova analisi oppure consulta l’archivio.</p>:<>
      <div className={styles.meta}><span><strong>Report elaborato</strong> · {formatDateTime(new Date(report.validatedAt??report.createdAt))}</span>{data?.windows&&<span><strong>Periodo analizzato</strong> · {formatDate(data.windows.current.from)} – {formatDate(data.windows.current.to)}</span>}</div>
      {(report.status!=="complete"||params.partial==="1")&&<p className={styles.notice}>{report.status==="blocked"?"Le fonti non consentono un’analisi attendibile. Risultati e suggerimenti non vengono sostituiti con stime.":"La rilevazione è parziale: alcune fonti o verifiche non sono disponibili. Consulta i limiti prima di interpretare il report."}</p>}
      {reading&&<section className={styles.insight} aria-label="Sintesi del report"><h2>{reading.title}</h2><p>{reading.text}</p></section>}
      {measured&&data?.summary&&<section className={styles.panel}><h2>I risultati su Google</h2><p className={styles.note}>Confronto con {formatDate(data.windows!.previous.from)} – {formatDate(data.windows!.previous.to)}.</p><div className={styles.metrics}>{[{label:"Clic da Google",key:"clicks" as const,format:formatInt},{label:"Impressioni",key:"impressions" as const,format:formatInt},{label:"CTR",key:"ctr" as const,format:formatPercent},{label:"Posizione media",key:"position" as const,format:formatDecimal}].map(metric=><div key={metric.key}><span>{metric.label}</span><strong>{metric.format(data.summary!.current[metric.key])}</strong><small>Prima: {metric.format(data.summary!.previous[metric.key])}</small></div>)}</div><p className={styles.note}>La posizione è una media delle impressioni: un valore più basso è migliore. Questi risultati descrivono il periodo archiviato nel report.</p></section>}
      {measured&&<section className={styles.panel}><h2>Interventi prioritari</h2>{actions.length?actions.map(item=><article key={item.id} className={styles.recommendation}><span className={styles.priority}>Priorità {item.priority==="high"?"alta":"media"} · {item.page}</span><h3>{actionTitle(item)}</h3>
        {item.query&&<p className={styles.note}>Ricerca: {item.query}{typeof item.evidence?.impressions==="number"?` · ${formatInt(item.evidence.impressions)} impressioni`:""}{typeof item.evidence?.clicks==="number"?` · ${formatInt(item.evidence.clicks)} clic`:""}</p>}
        <p><strong>Perché:</strong> {reportText(item.interpretation)}</p><p><strong>Cosa fare:</strong> {reportText(item.action)}</p><p><strong>Risultato da verificare:</strong> {reportText(item.expectedOutcome)}</p>
      </article>):<p>Le evidenze disponibili non sostengono ulteriori interventi prioritari in questa rilevazione. Questo non equivale all’assenza di opportunità o problemi nel sito.</p>}</section>}
      <section className={styles.panel}><h2>Presenza nelle risposte AI</h2><p><strong>Non misurata in questa rilevazione.</strong> Il report non contiene risposte AI archiviate come fonte dell’analisi. Un controllo tecnico del sito non dimostra la presenza di Solair nei motori AI.</p><div className={styles.noPrint}><Link className={styles.back} href="/visibilita-ai">Consulta le verifiche AI documentate →</Link></div></section>
      <section className={styles.panel}><h2>Fonti e approfondimenti</h2><p className={styles.note}>Risultati Google: Search Console. I segnali di utilizzo e i controlli delle pagine concorrono all’analisi quando disponibili. Data del report e periodo dei dati sono distinti.</p>
        {!!data?.checks?.length&&<details><summary>Evidenze da approfondire</summary><p className={styles.note}>Osservazioni da interpretare, distinte dagli interventi prioritari.</p>{data.checks.map(item=><div key={item.id}><h3>{item.title}</h3><p>{reportText(item.interpretation)}</p></div>)}</details>}
        {!!data?.limitations?.length&&<details open={report.status!=="complete"}><summary>Copertura e limiti delle fonti</summary><ul>{data.limitations.map(note=><li key={note}>{note}</li>)}</ul></details>}
        <div className={styles.links}><Link href="/current-status">Statistiche più recenti →</Link><Link href="/ricerca">Keyword, concorrenti e backlink →</Link></div><p className={styles.note}>Gli approfondimenti mostrano le fonti più recenti disponibili e possono riferirsi a date successive a questo report.</p>
      </section>
    </>}
    {report&&<div className={styles.links}><Link href={`/report/sito?id=${report.id}`}>Analisi del sito pubblico →</Link><Link href={`/report/confronto?id=${report.id}`}>Confronta con i dati Google →</Link></div>}
    <div className={styles.links}><Link href="/report">Tutti i report →</Link><Link href="/impostazioni">Frequenza dei report automatici →</Link></div>
  </OperationFrame>;
}
