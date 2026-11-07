import { getDocumentArchive } from "../../lib/report-documents/store";
import { KIND_LABEL } from "../../lib/report-documents/windows";
import { GeneratePdf } from "../components/generate-pdf";
import Link from "next/link";
import { OperationFrame } from "../components/operation-frame";
import { readReportArchive } from "../../lib/report-read";
import { reportPage } from "../../lib/report-presentation";
import { safeRead } from "../../lib/engine/safe";
import { currentReportUrl } from "../data/home";
import { formatDate,formatDateTime,formatInt } from "../../lib/format";
import styles from "../operazioni.module.css";

export const dynamic="force-dynamic";
export const metadata={title:"Report e storico | SolairSEO"};
export default async function Reports({searchParams}:{searchParams:Promise<{page?:string}>}){
  const params=await searchParams;
  const [archive,documents]=await Promise.all([safeRead("archivio report",()=>readReportArchive(reportPage(params.page))),safeRead("PDF archiviati", () => getDocumentArchive())]);
  return <OperationFrame title="Report e storico" intro="Le analisi di Solair, raccolte in un unico archivio. Ogni report conserva risultati, interpretazione e suggerimenti riferiti al proprio periodo." current="/report">
    <div className={styles.toolbar}><Link className={styles.primaryLink} href="/report/ultimo">Apri l’ultimo PDF →</Link><Link className={styles.back} href="/#operazioni">Genera una nuova analisi →</Link></div>
    <section className={styles.panel}><h2>Report PDF</h2><p>Generazioni manuali e automatiche nello stesso formato. Ogni file conserva i risultati e le date delle fonti usate.</p>
      <GeneratePdf latest label="Genera PDF dai risultati disponibili"/>
      {documents===null?<p>Archivio PDF temporaneamente non disponibile.</p>:!documents.length?<p>Non ci sono ancora PDF. Premi Genera Report dalla home per aggiornare le fonti e creare il documento.</p>:<div className={styles.reportList}>{documents.map(doc=><article className={styles.reportRow} key={doc.id}><div><strong>{KIND_LABEL[doc.kind]} · {formatDateTime(doc.createdAt)}</strong><span>{doc.from&&doc.to?`${formatDate(doc.from)} – ${formatDate(doc.to)}`:"Periodo non disponibile"}</span><small>{doc.trigger==="scheduled"?"Automatico":"Su richiesta"} · {doc.status==="complete"?"Completo":"Parziale"}</small></div><div className={styles.reportAside}><Link href={`/report/documento/${doc.id}`}>Apri report →</Link><a href={`/api/reports/${doc.id}/pdf`}>Scarica PDF</a></div></article>)}</div>}
      <p className={styles.note}>Sono mostrati gli ultimi 20 PDF. La generazione da risultati disponibili non avvia nuove raccolte AI.</p>
    </section>
    <section className={styles.panel}><h2>La presenza di oggi, le opportunità di domani</h2><p>La valutazione del sito parte dall’URL. L’approfondimento aggiunge i risultati reali su Google.</p><div className={styles.links}><Link href="/report/sito">Analisi del sito da URL →</Link></div></section>
    {!archive?<p className={styles.notice}>Archivio temporaneamente non disponibile. Riprova tra poco.</p>:<section className={styles.panel}><div className={styles.sectionHeading}><h2>Analisi sorgenti archiviate</h2><span>{formatInt(archive.total)} report</span></div><p className={styles.note}>Analisi manuali e automatiche usano lo stesso formato. Una nuova elaborazione con evidenze identiche può confermare un report già presente.</p>
      {archive.rows.length?<div className={styles.reportList}>{archive.rows.map(item=><Link className={styles.reportRow} href={`/analisi?id=${item.id}`} key={item.id}><div><strong>Analisi del {formatDate(item.date)}</strong><span>{item.from&&item.to?`${formatDate(item.from)} – ${formatDate(item.to)}`:"Periodo non disponibile"}</span><small>Elaborazione: {formatDateTime(item.date)} · origine {item.trigger==="cron"?"automatica":"manuale"}</small></div><div className={styles.reportAside}><span className={styles.badge}>{item.status==="complete"?"Disponibile":item.status==="partial"?"Parziale":"Non conclusa"}</span>{item.status!=="blocked"&&item.clicks!==null&&<span>{formatInt(item.clicks)} clic da Google</span>}<strong>Leggi il report →</strong></div></Link>)}</div>:<p>Non ci sono report in questa pagina. Genera un’analisi oppure torna alla prima pagina dell’archivio.</p>}
      {archive.pages>1&&<nav className={styles.pager} aria-label="Pagine dei report">{archive.page>1&&<Link href={`/report?page=${Math.min(archive.page-1,archive.pages)}`}>← Precedenti</Link>}<span>Pagina {archive.page} · {archive.pages} disponibili</span>{archive.page<archive.pages&&<Link href={`/report?page=${archive.page+1}`}>Successive →</Link>}</nav>}
    </section>}
    <section className={styles.panel}><h2>Approfondimenti</h2><p className={styles.note}>Apri i dettagli quando vuoi verificare un dato o una fonte dell’analisi.</p><div className={styles.resourceGrid}><Link href="/current-status"><strong>Dati e statistiche</strong><span>Traffico da ricerca, pagine e configuratore</span></Link><Link href="/ricerca"><strong>Ricerca SEO</strong><span>Keyword, concorrenti e backlink disponibili</span></Link><Link href="/visibilita-ai"><strong>Verifiche AI</strong><span>Domande, risposte e citazioni documentate</span></Link></div></section>
    <section className={styles.panel}><details><summary>Audit e documenti di riferimento</summary><div className={styles.links}><Link href="/sezioni/executive-summary">Audit baseline →</Link><Link href="/sezioni/historical-comparison">Andamento e punteggi →</Link><Link href={currentReportUrl}>Documento storico del 6 settembre →</Link></div></details></section>
  </OperationFrame>;
}
