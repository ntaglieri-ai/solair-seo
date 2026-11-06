import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { baselineAudit } from "../data/audit-baseline";
import { hasComparableCoverage, performanceReading } from "../data/home-overview";
import { readHomePerformance } from "../data/home-performance";
import { getGscWeekly } from "../../lib/engine/read";
import { safeRead } from "../../lib/engine/safe";
import { comparisonPeriods, formatPeriod } from "../../lib/comparison-periods";
import { formatInt, formatPercent, formatShortDate } from "../../lib/format";
import { STABLE_CLICKS_BAND } from "../../lib/report-presentation";
import { CollectionNotice } from "./collection-notice";
import { WeeklyBars } from "./weekly-bars";
import styles from "./overview.module.css";

const WINDOW_DAYS = 28;
type Tone = "up" | "down" | "flat";
type Metric = { label: string; value: string; delta: { text: string; tone: Tone } | null; previous: string | null; note?: string };

/** Stessa fascia del PDF: sotto ±5% la variazione è oscillazione normale, non crescita o calo. */
function change(current: number, previous: number): { text: string; tone: Tone } | null {
  if (!previous) return null;
  const r = (current - previous) / previous;
  if (Math.abs(r) < STABLE_CLICKS_BAND) return { text: "stabile", tone: "flat" };
  return { text: `${r > 0 ? "+" : "−"}${Math.round(Math.abs(r) * 100)}%`, tone: r > 0 ? "up" : "down" };
}

export async function HomePerformanceSummary() {
  const siteId = baselineAudit.domain;
  const { gsc, ga4 } = await readHomePerformance(siteId);
  const periodEnd = gsc?.lastDate ?? ga4?.lastDate;
  const reading = performanceReading(gsc, ga4);
  const gscOk = hasComparableCoverage(gsc, WINDOW_DAYS), ga4Ok = hasComparableCoverage(ga4, WINDOW_DAYS);
  const gscNote = gsc?.lastDate && gsc.current.days < WINDOW_DAYS ? `${gsc.current.days} giorni con dati su ${WINDOW_DAYS}` : undefined;
  const ga4Note = ga4?.lastDate && ga4.current.days < WINDOW_DAYS ? `${ga4.current.days} giorni con dati su ${WINDOW_DAYS}` : undefined;
  const metrics: Metric[] = [
    { label: "Clic da Google", value: gsc?.lastDate ? formatInt(gsc.current.clicks) : "N/D", delta: gsc && gscOk ? change(gsc.current.clicks, gsc.previous.clicks) : null, previous: gsc && gscOk ? formatInt(gsc.previous.clicks) : null, note: gscNote },
    { label: "Impressioni su Google", value: gsc?.lastDate ? formatInt(gsc.current.impressions) : "N/D", delta: gsc && gscOk ? change(gsc.current.impressions, gsc.previous.impressions) : null, previous: gsc && gscOk ? formatInt(gsc.previous.impressions) : null, note: gscNote },
    { label: "CTR su Google", value: gsc?.lastDate ? formatPercent(gsc.current.ctr) : "N/D", delta: gsc && gscOk ? change(gsc.current.ctr, gsc.previous.ctr) : null, previous: gsc && gscOk ? formatPercent(gsc.previous.ctr) : null, note: gscNote },
    { label: "Sessioni da ricerca organica", value: ga4?.lastDate ? formatInt(ga4.current.sessions) : "N/D", delta: ga4 && ga4Ok ? change(ga4.current.sessions, ga4.previous.sessions) : null, previous: ga4 && ga4Ok ? formatInt(ga4.previous.sessions) : null, note: ga4Note },
  ];

  // Settimane complete (lun-dom) e con dati: una settimana in corso o senza archivio non è "zero clic".
  let weeks = (await safeRead("home settimane", () => getGscWeekly(siteId, 14))) ?? [];
  while (weeks.length && weeks[0].clicks === 0 && weeks[0].impressions === 0) weeks = weeks.slice(1);
  if (gsc?.lastDate && new Date(`${gsc.lastDate}T12:00:00Z`).getUTCDay() !== 0) weeks = weeks.slice(0, -1);
  weeks = weeks.slice(-12);
  const windows = periodEnd ? comparisonPeriods(periodEnd) : null;

  return (
    <section className={styles.performance} aria-labelledby="performance-title">
      <CollectionNotice siteId={siteId} />
      <header className={styles.cardHead}>
        <div>
          <h2 id="performance-title">I risultati di Solair, in sintesi</h2>
          <p>{windows ? <>Ultimi 28 giorni: <b>{formatPeriod(windows.current)}</b> · confronto con {formatPeriod(windows.previous)}</> : "Periodo non disponibile"}</p>
        </div>
        <Link className={styles.link} href="/sezioni/performance">Approfondisci i risultati <ArrowUpRight size={17} aria-hidden="true" /></Link>
      </header>
      <div className={styles.reading} data-tone={reading.tone}><h3>{reading.title}</h3><p>{reading.detail}</p></div>
      <ul className={styles.metrics}>
        {metrics.map(m => (
          <li key={m.label}>
            <span className={styles.metricLabel}>{m.label}</span>
            <strong className={styles.metricValue}>{m.value}</strong>
            <span className={styles.comparison}>
              {m.delta && <b data-tone={m.delta.tone}>{m.delta.text}</b>}
              {m.previous !== null ? `prima ${m.previous}` : "Confronto non disponibile"}
            </span>
            {m.note && <span className={styles.metricNote}>{m.note}</span>}
          </li>
        ))}
      </ul>
      {weeks.length >= 4 && <div className={styles.trend}>
        <div className={styles.trendHead}><h3>Clic da Google per settimana</h3><span>Ultime {weeks.length} settimane complete</span></div>
        <WeeklyBars valueLabel="clic" points={weeks.map(w => ({ start: w.start, label: `Settimana del ${formatShortDate(w.start)}`, value: w.clicks, detail: `${formatInt(w.impressions)} impressioni` }))} />
      </div>}
      {gsc?.lastDate && ga4?.lastDate && gsc.lastDate !== ga4.lastDate && <p className={styles.caveat}>Analytics: {formatPeriod(comparisonPeriods(ga4.lastDate).current)} · confronto: {formatPeriod(comparisonPeriods(ga4.lastDate).previous)}. Le due fonti hanno date di aggiornamento diverse.</p>}
    </section>
  );
}
