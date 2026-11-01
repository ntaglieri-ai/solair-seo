import Link from "next/link";
import { OperationFrame } from "../../components/operation-frame";
import { ExportButton } from "../[id]/export-button";
import { readReport } from "../../../lib/report-read";
import { readPublicBatch } from "../../../lib/report-comparison-read";
import { publicPageReport } from "../../../lib/public-report";
import { safeRead } from "../../../lib/engine/safe";
import { formatDateTime, formatInt } from "../../../lib/format";
import styles from "../../operazioni.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Analisi del sito pubblico | SolairSEO", robots: { index: false, follow: false } };

export default async function PublicSiteReport({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  const report = await safeRead("riferimento report pubblico", () => readReport(id));
  const batch = report ? await safeRead("scansione pubblica archiviata", () => readPublicBatch(report)) : null;
  const pages = batch?.data.pages.map(publicPageReport) ?? [];
  const findings = pages.flatMap(page => page.findings.map(finding => ({ ...finding, path: page.path ?? page.url })));
  return <OperationFrame title="Analisi del sito pubblico" intro="Solair Group · solairgroup.it. Cosa emerge osservando il sito dall’esterno, senza usare Search Console o Analytics per formulare questa valutazione." current="/report">
    <div className={styles.toolbar}><Link className={styles.back} href="/report">← Report e storico</Link>{batch && <ExportButton />}</div>
    {!batch ? <p className={styles.notice}>Questa analisi non ha una scansione pubblica archiviata collegata. Genera un nuovo report dalla home: non vengono usate scansioni di altre date al suo posto.</p> : <>
      <div className={styles.meta}><span><strong>Sito osservato</strong> · solairgroup.it</span><span><strong>Scansione</strong> · {formatDateTime(batch.createdAt)}</span><span><strong>Fonte</strong> · HTML e sitemap pubblici</span></div>
      {!batch.data.complete && <p className={styles.notice}>La scansione ha copertura parziale. I risultati riguardano soltanto le pagine effettivamente analizzate.</p>}
      <section className={styles.insight}><h2>Il sito, visto dall’esterno</h2><p>La scansione comprende {formatInt(pages.length)} pagine, di cui {formatInt(pages.filter(page => page.readable).length)} con HTML analizzato. {findings.length ? `Sono emersi ${formatInt(findings.length)} elementi da valutare nelle pagine.` : "Nei controlli eseguiti non emergono interventi specifici sui titoli e sulle descrizioni. Questo non certifica che il sito sia privo di problemi."}</p></section>
      <section className={styles.panel}><h2>Struttura e accessibilità tecnica</h2><p><strong>Sitemap:</strong> {batch.data.sitemapFound ? "documento rilevato e letto" : "non rilevata correttamente nella scansione"}. La presenza di una sitemap non dimostra che le pagine siano indicizzate da Google.</p><p>Per ciascuna pagina verifichiamo risposta HTTP, titolo, descrizione, canonical e direttive noindex. Un canonical assente o una direttiva noindex richiedono una valutazione del contesto prima di intervenire.</p></section>
      <section className={styles.panel}><h2>Contenuti delle pagine</h2>{pages.map((page, index) => <article className={styles.recommendation} key={`${page.url}:${index}`}><span className={styles.priority}>{page.path ?? page.url} · HTTP {page.status ?? "non rilevato"}</span><h3>{page.title || "Titolo non disponibile"}</h3><p><strong>Descrizione:</strong> {page.description || (page.readable ? "Assente nell’HTML analizzato." : "Non verificabile.")}</p><details><summary>Dettagli pubblici della pagina</summary><p><strong>Canonical:</strong> {page.canonical || (page.readable ? "Assente nell’HTML." : "Non verificabile.")}</p><p><strong>Noindex:</strong> {page.noindex === null ? "Non verificabile" : page.noindex ? "Presente" : "Non rilevato"}</p>{page.content ? <><p><strong>Titoli principali:</strong> {page.content.h1.join(" · ") || "Nessuno rilevato"}</p><p><strong>Contenuto HTML:</strong> {formatInt(page.content.words)} parole · {formatInt(page.content.internalLinks)} collegamenti interni.</p><p><strong>Tipi JSON-LD:</strong> {page.content.schemaTypes.join(", ") || "Nessuno rilevato"}.</p></> : <p>Conteggio del testo, titoli principali e tipi JSON-LD non sono disponibili in questa scansione storica. Saranno raccolti nelle nuove analisi.</p>}</details></article>)}</section>
      <section className={styles.panel}><h2>Interventi suggeriti dal sito</h2>{findings.length ? findings.map((finding, index) => <article className={styles.recommendation} key={`${finding.path}:${index}`}><span className={styles.priority}>{finding.path}</span><h3>{finding.title}</h3><p>{finding.action}</p></article>) : <p>Nessun intervento specifico sostenuto dai controlli qui disponibili. I dati Google possono comunque evidenziare opportunità sulle query e sulle pagine.</p>}<p className={styles.note}>Questi suggerimenti non sono ordinati sulla base del traffico: quella valutazione richiede le fonti del report completo.</p></section>
      <section className={styles.panel}><h2>Predisposizione AI e limiti dell’analisi</h2><p>Testo presente nell’HTML, titoli e dati strutturati descrivono ciò che un lettore automatico può trovare. Non provano che Solair venga citata nelle risposte AI. La presenza di un tipo schema non ne certifica la correttezza.</p><p><strong>Velocità e Core Web Vitals:</strong> non misurati in questa scansione. <strong>Presenza nelle risposte AI:</strong> non misurata. <strong>Traffico, ranking e backlink:</strong> non ricavabili da questi controlli HTML.</p><p>Non viene assegnato un punteggio globale: mancano misure sufficienti per rappresentare tutte queste dimensioni in un unico numero.</p><details><summary>Metodo e copertura</summary><ul>{batch.data.limitations.map(note => <li key={note}>{note}</li>)}</ul><p>Le soglie di lunghezza del precedente scanner non vengono usate come requisiti Google né come prova di una perdita di visibilità.</p></details></section>
      <div className={styles.links}><Link href={`/report/confronto?id=${report!.id}`}>Cosa aggiungono i dati Google →</Link><Link href={`/analisi?id=${report!.id}`}>Report completo →</Link></div>
    </>}
  </OperationFrame>;
}
