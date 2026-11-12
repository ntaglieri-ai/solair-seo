import { requireSeoPage, canWriteSeo } from "../../lib/crm-auth";
import { getDocumentArchive } from "../../lib/report-documents/store";
import { KIND_LABEL } from "../../lib/report-documents/windows";
import { ReportGenerator } from "../components/report-runner";
import Link from "next/link";
import { OperationFrame } from "../components/operation-frame";
import { readReportArchive } from "../../lib/report-read";
import { reportPage } from "../../lib/report-presentation";
import { safeRead } from "../../lib/engine/safe";
import { currentReportUrl } from "../data/home";
import { formatDate,formatDateTime,formatInt } from "../../lib/format";
import styles from "../operazioni.module.css";

export const dynamic="force-dynamic";
export const metadata={title:"Report | SolairSEO"};
async function Reports({searchParams}:{searchParams:Promise<{page?:string}>}){
  const params=await searchParams;
  const [archive,documents,canGenerate]=await Promise.all([safeRead("archivio report",()=>readReportArchive(reportPage(params.page))),safeRead("PDF archiviati", () => getDocumentArchive()),canWriteSeo()]);
  return <OperationFrame title="Report" intro="Genera un report aggiornato oppure apri uno dei report precedenti." current="/report">
    <section id="nuovo-report" className={styles.panel}>
      <h2>Nuovo report</h2>
      <p>Aggiorna i dati Google, analizza il sito e raccoglie le risposte AI se attive. Al termine si apre il report con il PDF da scaricare.</p>
      {canGenerate ? <ReportGenerator hasReports={!!documents?.length} /> : <p>Il tuo profilo consente di consultare e scaricare i report. Per generarli serve il permesso di scrittura Solair SEO nel CRM.</p>}
    </section>
    <section className={styles.panel}><h2>Report precedenti</h2>
      {documents===null?<p>Archivio PDF temporaneamente non disponibile.</p>:!documents.length?<p>Non ci sono ancora report. Usa “Genera report” qui sopra per creare il primo.</p>:<div className={styles.reportList}>{documents.map(doc=><article className={styles.reportRow} key={doc.id}><div><strong>{KIND_LABEL[doc.kind]} · {formatDateTime(doc.createdAt)}</strong><span>{doc.from&&doc.to?`${formatDate(doc.from)} – ${formatDate(doc.to)}`:"Periodo non disponibile"}</span><small>{doc.trigger==="scheduled"?"Automatico":"Su richiesta"} · {doc.status==="complete"?"Completo":"Parziale"}</small></div><div className={styles.reportAside}><Link href={`/report/documento/${doc.id}`}>Apri report →</Link><a href={`/api/reports/${doc.id}/pdf`}>Scarica PDF</a></div></article>)}</div>}
      <p className={styles.note}>Sono mostrati gli ultimi 20 report. Ogni documento conserva i dati e le date delle fonti usate.</p>
    </section>
    {!archive?<p className={styles.notice}>Archivio temporaneamente non disponibile. Riprova tra poco.</p>:<section className={styles.panel}><details open={archive.page>1}><summary>Dettagli delle analisi</summary><div className={styles.sectionHeading}><h2>Analisi archiviate</h2><span>{formatInt(archive.total)} report</span></div><p className={styles.note}>Analisi manuali e automatiche usano lo stesso formato. Una nuova elaborazione con evidenze identiche può confermare un report già presente.</p>
      {archive.rows.length?<div className={styles.reportList}>{archive.rows.map(item=><Link className={styles.reportRow} href={`/analisi?id=${item.id}`} key={item.id}><div><strong>Analisi del {formatDate(item.date)}</strong><span>{item.from&&item.to?`${formatDate(item.from)} – ${formatDate(item.to)}`:"Periodo non disponibile"}</span><small>Elaborazione: {formatDateTime(item.date)} · origine {item.trigger==="cron"?"automatica":"manuale"}</small></div><div className={styles.reportAside}><span className={styles.badge}>{item.status==="complete"?"Disponibile":item.status==="partial"?"Parziale":"Non conclusa"}</span>{item.status!=="blocked"&&item.clicks!==null&&<span>{formatInt(item.clicks)} clic da Google</span>}<strong>Leggi il report →</strong></div></Link>)}</div>:<p>Non ci sono analisi in questa pagina.</p>}
      {archive.pages>1&&<nav className={styles.pager} aria-label="Pagine dei report">{archive.page>1&&<Link href={`/report?page=${Math.min(archive.page-1,archive.pages)}`}>← Precedenti</Link>}<span>Pagina {archive.page} · {archive.pages} disponibili</span>{archive.page<archive.pages&&<Link href={`/report?page=${archive.page+1}`}>Successive →</Link>}</nav>}
    </details></section>}
    <section className={styles.panel}><details><summary>Approfondimenti e fonti</summary><p className={styles.note}>Apri i dettagli quando vuoi verificare un dato o una fonte dell’analisi.</p><div className={styles.links}><Link href="/report/sito">Analisi del sito →</Link></div><div className={styles.resourceGrid}><Link href="/current-status"><strong>Dati e statistiche</strong><span>Traffico da ricerca, pagine e configuratore</span></Link><Link href="/ricerca"><strong>Ricerca SEO</strong><span>Keyword, concorrenti e backlink disponibili</span></Link><Link href="/visibilita-ai"><strong>Verifiche AI</strong><span>Domande, risposte e citazioni documentate</span></Link></div></details></section>
    <section className={styles.panel}><details><summary>Audit e documenti di riferimento</summary><div className={styles.links}><Link href="/sezioni/executive-summary">Audit baseline →</Link><Link href="/sezioni/historical-comparison">Andamento e punteggi →</Link><Link href={currentReportUrl}>Documento storico del 6 settembre →</Link></div></details></section>
  </OperationFrame>;
}

export default async function AuthorizedPage(...args: Parameters<typeof Reports>) {
  await requireSeoPage();
  return Reports(...args);
}
