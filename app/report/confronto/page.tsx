import Link from "next/link";
import { OperationFrame } from "../../components/operation-frame";
import { ExportButton } from "../[id]/export-button";
import { readReport } from "../../../lib/report-read";
import { readPublicBatch, readComparisonEvidence } from "../../../lib/report-comparison-read";
import { publicPageReport, comparePublicPage } from "../../../lib/public-report";
import { safeRead } from "../../../lib/engine/safe";
import { formatDate, formatDateTime, formatInt } from "../../../lib/format";
import styles from "../../operazioni.module.css";
import { actionTitle } from "../../data/action-plan";
import { reportText } from "../../../lib/report-presentation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dal sito ai risultati | SolairSEO", robots: { index: false, follow: false } };

export default async function ReportComparison({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  const report = await safeRead("report da confrontare", () => readReport(id));
  const [batch, evidence] = report ? await Promise.all([
    safeRead("scansione del report", () => readPublicBatch(report)),
    safeRead("dati Google del report", () => readComparisonEvidence(report)),
  ]) : [null, null];
  const pages = batch?.data.pages.map(publicPageReport) ?? [];
  const compared = pages.map(page => ({ page, ...comparePublicPage(page, evidence) }));
  const addedActions = report?.status !== "blocked" ? report?.data.opportunities?.filter(action => action.kind === "ctr" || action.kind === "near_top10") ?? [] : [];
  return <OperationFrame title="Dal sito ai risultati" intro="Il confronto tra ciò che si osserva dal sito pubblico e ciò che i dati Google permettono di misurare. Stesso report di riferimento, fonti e date dichiarate." current="/report">
    <div className={styles.toolbar}><Link className={styles.back} href="/report">← Report e storico</Link>{batch && <ExportButton />}</div>
    {!report || !batch ? <p className={styles.notice}>Il confronto non è disponibile: manca la scansione collegata a questo report. Non viene sostituita con una scansione più recente.</p> : <>
      <div className={styles.meta}><span><strong>Scansione pubblica</strong> · {formatDateTime(batch.createdAt)}</span>{evidence && <span><strong>Periodo Google</strong> · {formatDate(evidence.windows.current.from)} – {formatDate(evidence.windows.current.to)}</span>}</div>
      {(!batch.data.complete || report.status !== "complete" || !evidence) && <p className={styles.notice}>Il confronto ha copertura parziale. Un dato non disponibile viene indicato come non rilevato, senza sostituirlo con zero o stime.</p>}
      <section className={styles.insight}><h2>Il sito mostra gli elementi da valutare. I dati ne chiariscono il contesto.</h2><p>{formatInt(pages.length)} pagine osservate dall’esterno; {formatInt(compared.filter(row => row.gsc !== null).length)} trovano riscontro nelle righe Search Console archiviate per il periodo. Il collegamento avviene per percorso della pagina e non dimostra un rapporto di causa ed effetto.</p></section>
      <section className={styles.panel}><h2>Due livelli di lettura</h2><div className={styles.comparisonGrid}><div><h3>Dal sito pubblico</h3><p>Contenuti e metadati disponibili, risposta delle pagine, sitemap, canonical e noindex. Dove rilevati: titoli principali, testo HTML e tipi JSON-LD.</p><p>Permette di individuare elementi da valutare, senza conoscere traffico, query o posizionamento.</p></div><div><h3>Con i dati collegati</h3><p>Search Console aggiunge ricerche, impressioni e clic. Analytics aggiunge le sessioni da ricerca organica quando il dato è attendibile.</p><p>Il report completo propone inoltre interventi sulle query e sulle pagine a partire da queste evidenze.</p></div></div></section>
      <section className={styles.panel}><h2>Riscontro pagina per pagina</h2>{compared.map((row, index) => <article className={styles.recommendation} key={`${row.page.url}:${index}`}><h3>{row.page.path ?? row.page.url}</h3><div className={styles.comparisonGrid}><div><span className={styles.priority}>OSSERVAZIONE PUBBLICA</span>{row.page.findings.length ? <ul>{row.page.findings.map(finding => <li key={finding.title}>{finding.title}</li>)}</ul> : <p>Nessuna anomalia nei controlli selezionati su titoli, descrizione e noindex. Non equivale a un audit esaustivo.</p>}</div><div><span className={styles.priority}>DATI GOOGLE DEL PERIODO</span><p><strong>Clic:</strong> {row.gsc ? formatInt(row.gsc.clicks) : "Non rilevati"}<br /><strong>Impressioni:</strong> {row.gsc ? formatInt(row.gsc.impressions) : "Non rilevate"}<br /><strong>Sessioni da ricerca organica:</strong> {row.organicSessions === null ? "Non rilevate" : formatInt(row.organicSessions)}</p></div></div><p><strong>Lettura congiunta:</strong> {row.reading}</p></article>)}</section>
      <section className={styles.panel}><h2>Le opportunità che aggiungono i dati Google</h2>{addedActions.length ? addedActions.map(action => <article className={styles.recommendation} key={action.id}><span className={styles.priority}>{action.page} · Priorità {action.priority === "high" ? "alta" : "media"}</span><h3>{actionTitle(action)}</h3>{action.query && <p><strong>Ricerca:</strong> {action.query}</p>}<p>{reportText(action.interpretation)}</p><p><strong>Intervento proposto:</strong> {reportText(action.action)}</p></article>) : <p>In questa rilevazione non ci sono ulteriori interventi sulle query sostenuti dai dati disponibili. Il dettaglio dei controlli resta nel report completo.</p>}</section>
      <section className={styles.panel}><h2>Come leggere il confronto</h2><p>La scansione descrive il sito al momento dell’osservazione; i dati Google descrivono il periodo indicato. Non è un confronto prima/dopo un intervento. Varianti www e senza www, parametri e slash finale sono riuniti per percorso; clic e sessioni restano misure differenti. Le sessioni Analytics sono filtrate su Google / organic.</p><p>L’assenza di una riga non dimostra assenza di traffico o mancata indicizzazione. La presenza nelle risposte AI e la velocità non vengono dedotte da clic, metadati o dati strutturati.</p>{evidence?.sourceErrors?.length ? <p className={styles.notice}>Una o più fonti Google risultano incomplete nella rilevazione.</p> : null}{evidence?.ga4?.current.limitations.length ? <ul>{evidence.ga4.current.limitations.map(note => <li key={note}>{note}</li>)}</ul> : null}</section>
      <div className={styles.links}><Link href={`/report/sito?id=${report.id}`}>Leggi l’analisi del sito pubblico →</Link><Link href={`/analisi?id=${report.id}`}>Apri il report completo e gli interventi →</Link></div>
    </>}
  </OperationFrame>;
}
