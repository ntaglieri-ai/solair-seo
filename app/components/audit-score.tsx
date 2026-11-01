import Link from "next/link";
import { getAuditTrend } from "../../lib/service-read";
import { safeRead } from "../../lib/engine/safe";
import { formatDate } from "../../lib/format";
import styles from "./audit-score.module.css";

export async function AuditScore({ siteId, expanded = false }: { siteId: string; expanded?: boolean }) {
  const trend = await safeRead("punteggi audit", () => getAuditTrend(siteId));
  if (!trend?.latest) return <p className={styles.empty}>Punteggio audit non disponibile.</p>;
  const { latest, points, difference, serviceStarted } = trend;
  return <section className={styles.score} aria-label="Punteggio dell’ultimo audit">
    <div className={styles.summary}><div><span className={styles.label}>Ultimo audit SEO</span><strong>{latest.score}<small>/100</small></strong></div>
      <div><p>{serviceStarted ? formatDate(latest.date) : "Maggio 2026"}</p><span>{!serviceStarted ? "Riferimento provvisorio" : difference === null ? "Primo audit del nuovo trend" : `${difference > 0 ? "+" : ""}${difference} punti rispetto all’audit precedente`}</span></div>
      {!expanded && <Link href="/sezioni/historical-comparison#history-score">Andamento dei punteggi →</Link>}
    </div>
    {expanded && <><p className={styles.note}>{serviceStarted ? "Il trend parte dall’audit di avvio del servizio. Sono collegati solo punteggi calcolati con lo stesso metodo." : "Riferimento provvisorio di maggio. Il nuovo audit alla consegna lo sostituirà in questa vista e sarà il primo punto del trend."}</p>
      {points.length > 1 ? <svg className={styles.chart} viewBox="0 0 600 130" role="img" aria-label={`Trend di ${points.length} audit, ultimo punteggio ${latest.score} su 100`}>
        {[0,50,100].map((value) => <g key={value}><line x1="35" x2="585" y1={115-value} y2={115-value} stroke="#d9e7de"/><text x="0" y={119-value} fontSize="11" fill="#526c62">{value}</text></g>)}
        <polyline points={points.map((p,i)=>`${40+i*535/(points.length-1)},${115-p.score}`).join(" ")} fill="none" stroke="#278451" strokeWidth="3"/>
        {points.map((p,i)=><circle key={p.id} cx={40+i*535/(points.length-1)} cy={115-p.score} r="4" fill="#278451"><title>{formatDate(p.date)}: {p.score}/100</title></circle>)}
      </svg> : <p className={styles.note}>Il grafico sarà disponibile dal secondo audit confrontabile.</p>}
      <ol className={styles.history}>{points.map((point)=><li key={point.id}><span>{serviceStarted ? formatDate(point.date) : "Maggio 2026"}</span><strong>{point.score}/100</strong><span>{point.source}</span></li>)}</ol>
    </>}
  </section>;
}
