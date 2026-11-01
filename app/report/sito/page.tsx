import Link from "next/link";
import { OperationFrame } from "../../components/operation-frame";
import { ExportButton } from "../[id]/export-button";
import { readReport } from "../../../lib/report-read";
import { readPublicBatch, readStandalonePublicBatch } from "../../../lib/report-comparison-read";
import { safeRead } from "../../../lib/engine/safe";
import { formatDateTime, formatInt } from "../../../lib/format";
import type { AuditEvidence } from "../../../lib/url-audit";
import { RunPublicAudit } from "./run-public-audit";
import styles from "../../operazioni.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Analisi SEO/GEO del sito | SolairSEO", robots: { index: false, follow: false } };
function Sources({ items }: { items: AuditEvidence[] }) {
  return <details><summary>Su quali elementi si basa</summary>{items.map((item, index) => <div className={styles.sourceEvidence} key={`${item.url}:${index}`}><a href={item.url} target="_blank" rel="noreferrer">{item.url}</a><p>{item.detail}</p></div>)}</details>;
}

export default async function PublicSiteReport({ searchParams }: { searchParams: Promise<{ id?: string; audit?: string }> }) {
  const { id, audit } = await searchParams;
  const report = id ? await safeRead("riferimento report pubblico", () => readReport(id)) : null;
  const batch = id
    ? report ? await safeRead("scansione collegata", () => readPublicBatch(report)) : null
    : await safeRead("analisi da URL", () => readStandalonePublicBatch(audit));
  const analysis = batch?.data.publicAnalysis;
  const detailUrl = report ? `/analisi?id=${report.id}` : "/analisi";
  const comparisonUrl = report ? `/report/confronto?id=${report.id}` : "/report/confronto";
  return <OperationFrame title="Solair Group: analisi SEO/GEO del sito" intro="Come il sito presenta l’offerta, accompagna la scelta di un impianto e rende disponibili le informazioni ai motori di ricerca. Valutazione basata esclusivamente sull’URL pubblico." current="/report">
    <div className={styles.toolbar}><Link className={styles.back} href="/report">← Report e storico</Link><RunPublicAudit />{analysis && <ExportButton />}</div>
    {!analysis ? <p className={styles.notice}>{batch ? "Questa rilevazione conserva i precedenti controlli di base. Avvia l’analisi del sito per raccogliere contenuti, percorsi e destinazioni dei collegamenti; lo storico non viene riscritto." : "Avvia l’analisi di solairgroup.it per ottenere il report basato sul sito pubblico. Non occorrono Search Console o Analytics."}</p> : <>
      <div className={styles.meta}><span><strong>Fonte</strong> · solairgroup.it</span><span><strong>Rilevazione</strong> · {formatDateTime(batch!.createdAt)}</span><span>{formatInt(analysis.scope.scanned)} destinazioni verificate · {formatInt(analysis.scope.readable)} pagine leggibili</span></div>
      {!analysis.scope.complete && <p className={styles.notice}>La copertura è parziale: alcune pagine non sono state raggiunte oppure è stato raggiunto il limite della raccolta. Le conclusioni riguardano il campione indicato.</p>}
      <section className={styles.insight}><span className={styles.priority}>VALUTAZIONE COMPLESSIVA</span><h2>{analysis.headline}</h2><p>{analysis.summary}</p></section>
      <section className={styles.panel}><h2>Le priorità di lavoro</h2><p>Prima i problemi riscontrati nei percorsi e nelle informazioni pubblicate. Le proposte di nuovi contenuti restano opportunità da sviluppare e validare.</p>{analysis.findings.length ? analysis.findings.map((finding, index) => <article className={styles.recommendation} key={finding.id}><span className={styles.priority}>{String(index + 1).padStart(2, "0")} · Priorità {finding.priority} · {finding.basis === "riscontro" ? "Riscontro nel sito" : "Opportunità editoriale"}</span><h3>{finding.title}</h3><p><strong>Cosa emerge.</strong> {finding.observation}</p><p><strong>Perché conta.</strong> {finding.impact}</p><p><strong>Intervento proposto.</strong> {finding.action}</p><Sources items={finding.evidence} /></article>) : <p>Le evidenze disponibili non sostengono interventi specifici in questa rilevazione. Non vengono aggiunti problemi per giustificare un lavoro sul sito.</p>}</section>
      <div className={styles.assessmentGrid}>{analysis.areas.map(area => <section className={styles.panel} key={area.title}><h2>{area.title}</h2><p>{area.assessment}</p>{area.evidence.length > 0 && <Sources items={area.evidence} />}</section>)}</div>
      <section className={`${styles.panel} ${styles.commercialCallout}`}><h2>Dalla valutazione del sito al piano di crescita</h2><p>Questa analisi individua il lavoro sui contenuti e sui percorsi a partire da ciò che il sito pubblica. Search Console e Analytics aggiungono quali ricerche generano visibilità, quali pagine ricevono clic e come vengono utilizzate.</p><p>Il passo successivo è scegliere gli interventi, applicarli al sito e confrontare i risultati nel tempo. Le proposte qui elencate non sono modifiche già eseguite né previsioni di visite o richieste.</p><div className={styles.links}><Link href={comparisonUrl}>Approfondisci con i dati Google →</Link><Link href={detailUrl}>Report con i dati collegati →</Link></div>{!report && <p className={styles.note}>L’approfondimento Google mantiene il proprio periodo e la propria data di rilevazione. La raccolta da URL funziona indipendentemente da questi collegamenti.</p>}</section>
      <section className={styles.panel}><details><summary>Copertura, metodo e misure tecniche</summary><p>Metodo {analysis.version}. L’analisi legge contenuti pubblici e collegamenti; non consulta account Google, dati di traffico o risposte di servizi AI. Le letture editoriali sono ipotesi motivate dai riscontri, non una verifica esaustiva della qualità.</p><ul>{[...analysis.limits, ...batch!.data.limitations].map((note, index) => <li key={index}>{note}</li>)}</ul>{batch!.data.pages.map((page, index) => <article className={styles.recommendation} key={`${page.url}:${index}`}><h3>{page.url}</h3><p>HTTP {page.status ?? "non rilevato"} · {page.content ? `${formatInt(page.content.words)} parole HTML` : "contenuto non rilevato"}</p>{page.download && <p>Download HTML dal server di raccolta: {formatInt(page.download.milliseconds)} ms · {formatInt(page.download.bytes)} byte. Non è una misura di caricamento nel browser.</p>}<p><strong>Titolo:</strong> {page.title || "Non rilevato"}<br /><strong>Descrizione:</strong> {page.description || "Non rilevata"}</p>{page.profile?.frames.length ? <p>Contenuti incorporati: {page.profile.frames.join(", ")}. Il funzionamento dei percorsi incorporati non è verificato da questa lettura HTML.</p> : null}</article>)}<p>Velocità nel browser, Core Web Vitals, volumi delle ricerche, posizionamenti, backlink e citazioni nelle risposte AI non sono misurati da questa raccolta.</p><p>Riferimento metodologico: <a href="https://developers.google.com/search/docs/appearance/ai-features">indicazioni Google su contenuti e funzionalità AI</a>. I dati strutturati non sono un requisito speciale o una garanzia di citazione.</p></details></section>
    </>}
  </OperationFrame>;
}
