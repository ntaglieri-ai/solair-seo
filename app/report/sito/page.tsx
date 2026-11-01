import Link from "next/link";
import { OperationFrame } from "../../components/operation-frame";
import { ExportButton } from "../[id]/export-button";
import { readReport } from "../../../lib/report-read";
import { readPublicBatch } from "../../../lib/report-comparison-read";
import { publicPageReport } from "../../../lib/public-report";
import { pageName, pageRole, clientFinding } from "../../../lib/report-language";
import { safeRead } from "../../../lib/engine/safe";
import { formatDateTime, formatInt } from "../../../lib/format";
import styles from "../../operazioni.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "La presenza online di Solair | SolairSEO", robots: { index: false, follow: false } };

export default async function PublicSiteReport({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  const report = await safeRead("riferimento report pubblico", () => readReport(id));
  const batch = report ? await safeRead("scansione pubblica archiviata", () => readPublicBatch(report)) : null;
  const pages = batch?.data.pages.map(publicPageReport) ?? [];
  const findings = pages.flatMap(page => page.findings.map(finding => ({ ...clientFinding(finding), path: page.path ?? page.url })));
  return <OperationFrame title="La presenza online di Solair" intro="Come si presenta il sito, quali elementi sono già presenti e dove vale la pena concentrare il prossimo intervento." current="/report">
    <div className={styles.toolbar}><Link className={styles.back} href="/report">← Report e storico</Link>{batch && <ExportButton />}</div>
    {!batch ? <p className={styles.notice}>Questa prima lettura non è ancora disponibile per il report scelto. Puoi generarne una nuova dalla home.</p> : <>
      <div className={styles.meta}><span>Solair Group · solairgroup.it</span><span>Aggiornato al {formatDateTime(batch.createdAt)}</span><span>{formatInt(pages.length)} pagine esaminate</span></div>
      {!batch.data.complete && <p className={styles.notice}>La verifica copre solo una parte del sito. Le indicazioni si riferiscono alle pagine esaminate.</p>}
      <section className={styles.insight}><h2>{findings.length ? "Alcuni elementi meritano attenzione." : pages.length ? "Le basi per presentare Solair ci sono." : "La prima lettura richiede ulteriori verifiche."}</h2><p>{findings.length ? "Il controllo del sito ha individuato elementi su cui lavorare. Qui trovi cosa migliorare e perché può essere utile a chi cerca Solair." : pages.length ? "Nelle pagine esaminate sono presenti i titoli e le descrizioni verificati. Per scegliere come far crescere la visibilità, il passo successivo è capire quali ricerche portano le persone sul sito." : "Non ci sono ancora pagine sufficienti per formulare una valutazione."}</p></section>
      <section className={styles.panel}><h2>Le pagine che raccontano Solair</h2><p>Ogni pagina ha un ruolo nel rapporto con chi visita il sito.</p><div className={styles.comparisonGrid}>{pages.map((page, index) => <div key={`${page.url}:${index}`}><h3>{pageName(page.path ?? page.url)}</h3><p>{pageRole(page.path ?? page.url)}</p><span className={styles.badge}>{page.readable ? page.findings.length ? "Elementi da migliorare" : "Titolo e descrizione presenti" : "Accesso da verificare"}</span></div>)}</div></section>
      <section className={styles.panel}><h2>Dove concentrare l’attenzione</h2>{findings.length ? findings.map((finding, index) => <article className={styles.recommendation} key={`${finding.path}:${index}`}><span className={styles.priority}>{pageName(finding.path)}</span><h3>{finding.title}</h3><p>{finding.work}</p></article>) : <p>I controlli selezionati non segnalano correzioni specifiche su titoli, descrizioni e accesso alle pagine. Questo è un punto di partenza: le opportunità sulle ricerche e sui contenuti si individuano leggendo i risultati Google.</p>}</section>
      <section className={`${styles.panel} ${styles.commercialCallout}`}><h2>Quali pagine possono dare di più?</h2><p>Il report completo affianca a questa prima lettura le ricerche reali, le apparizioni su Google e i clic ricevuti. Permette di scegliere gli interventi con un contesto concreto.</p><div className={styles.links}><Link href={`/report/confronto?id=${report!.id}`}>Scopri le opportunità di crescita →</Link><Link href={`/analisi?id=${report!.id}`}>Apri il report completo →</Link></div></section>
      <p className={styles.note}>Questa prima lettura riguarda il sito visibile dall’esterno. Velocità e presenza nelle risposte AI non sono misurate in questa rilevazione.</p>
      <section className={styles.panel}><details><summary>Fonti e dettagli della verifica</summary><p>Fonte: contenuti e sitemap pubblici, senza usare dati degli account Google per formulare questa valutazione. Nessun punteggio globale o promessa di posizionamento.</p><p>Sitemap: {batch.data.sitemapFound ? "rilevata e letta" : "non rilevata correttamente"}. La sitemap non dimostra l’indicizzazione. L’assenza di rilievi nei controlli selezionati non equivale a un audit esaustivo.</p>{pages.map((page, index) => <article className={styles.recommendation} key={`${page.url}:${index}`}><h3>{pageName(page.path ?? page.url)}</h3><p>{page.url} · HTTP {page.status ?? "non rilevato"}</p><p><strong>Titolo:</strong> {page.title || "Non disponibile"}<br /><strong>Descrizione:</strong> {page.description || "Non disponibile"}<br /><strong>Canonical:</strong> {page.canonical || "Non rilevato"}<br /><strong>Noindex:</strong> {page.noindex === null ? "Non verificabile" : page.noindex ? "Presente" : "Non rilevato"}</p>{page.content ? <><p><strong>Titoli principali:</strong> {page.content.h1.join(" · ") || "Nessuno rilevato"}</p><p>{formatInt(page.content.words)} parole nell’HTML · {formatInt(page.content.internalLinks)} collegamenti interni.</p><p><strong>Tipi JSON-LD:</strong> {page.content.schemaTypes.join(", ") || "Nessuno rilevato"}.</p></> : <p>Questi dettagli aggiuntivi non fanno parte della scansione archiviata.</p>}</article>)}<ul>{batch.data.limitations.map(note => <li key={note}>{note}</li>)}</ul><p>Non sono misurati Core Web Vitals, citazioni AI o backlink. Le soglie di lunghezza dello scanner non sono requisiti imposti da Google.</p></details></section>
    </>}
  </OperationFrame>;
}
