import { crmServicesRequest, type CrmServices } from "../../../../lib/crm-services";
import { DeliveryControls } from "./delivery-controls";
import { requireSeoPage } from "../../../../lib/crm-auth";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OperationFrame } from "../../../components/operation-frame";
import { KIND_LABEL } from "../../../../lib/report-documents/windows";
import { formatPeriod } from "../../../../lib/comparison-periods";
import { getReportDocument } from "../../../../lib/report-documents/store";
import { formatDateTime,formatInt,formatPercent } from "../../../../lib/format";
import { summarizeScan } from "../../../../lib/geo/summary";
import type { GeoAnswer } from "../../../../lib/geo/answer";
import styles from "../../../operazioni.module.css";
export const dynamic="force-dynamic";
export const metadata={title:"Report PDF | SolairSEO"};
async function Document({params}:{params:Promise<{id:string}>}){
  const {id}=await params,document=await getReportDocument(id);if(!document)notFound();
  const services: CrmServices | null = await crmServicesRequest("GET").catch(() => null);
  const p=document.payload,geo=p.geo?summarizeScan(p.geo.answers as GeoAnswer[],p.geo.planned):null;
  return <OperationFrame title="Il report è pronto" intro="Risultati e proposte di miglioramento, salvati insieme alle fonti usate per questa generazione." current="/report">
    <section className={styles.panel}><div className={styles.sectionHeading}><h2>Report SEO/GEO di Solair Group</h2><span className={styles.badge}>{document.status==="complete"?"Completo":"Parziale"}</span></div><p>Generato il {formatDateTime(new Date(p.generatedAt))} · {document.trigger==="scheduled"?"automatico":"su richiesta"} · {KIND_LABEL[p.kind??"update"]}{p.period?` · ${formatPeriod(p.period)}`:""}.</p>
      <div className={styles.toolbar}><a className={styles.primaryLink} href={`/api/reports/${id}/pdf`}>Scarica il report PDF</a><Link className={styles.back} href="/report">Tutti i PDF e lo storico →</Link></div>
      {document.status==="partial"&&<p className={styles.notice}>Una o più fonti non sono complete o disponibili. Il PDF indica quali dati sono misurati e quali restano non misurati.</p>}
    </section>
    <DeliveryControls id={id} services={services} />
    {p.totals&&p.report.status!=="blocked"&&<section className={styles.panel}><h2>I risultati inclusi</h2><div className={styles.metrics}><div><span>Clic da Google</span><strong>{formatInt(p.totals.current.clicks)}</strong></div><div><span>Impressioni</span><strong>{formatInt(p.totals.current.impressions)}</strong></div><div><span>CTR</span><strong>{formatPercent(p.totals.current.ctr)}</strong></div></div></section>}
    <section className={styles.panel}><h2>Gemini e proposte</h2>{geo?<p>Rilevazione del {formatDateTime(new Date(p.geo!.startedAt))}: {geo.nonBrandMentioned}/{geo.nonBrandComplete} risposte senza nome Solair la menzionano. {geo.complete}/{geo.planned} risposte complete.</p>:<p>Presenza Gemini non misurata in questo documento.</p>}<p>Il PDF include gli interventi motivati dall’analisi SEO, le opportunità AI da verificare e le fonti di riferimento. Gli eventuali aggiornamenti successivi non modificano questo documento.</p><Link className={styles.back} href={`/analisi?id=${p.report.id}`}>Leggi l’analisi SEO di riferimento →</Link></section>
  </OperationFrame>;
}

export default async function AuthorizedPage(...args: Parameters<typeof Document>) {
  await requireSeoPage();
  return Document(...args);
}
