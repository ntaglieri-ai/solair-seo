import Link from "next/link";
import { ArrowUpRight, Compass, Eye, MousePointer2, MousePointerClick, UsersRound } from "lucide-react";
import { baselineAudit } from "../data/audit-baseline";
import { hasComparableCoverage, performanceReading } from "../data/home-overview";
import { getGa4Totals, getGscTotals } from "../../lib/engine/read";
import { safeRead } from "../../lib/engine/safe";
import { formatDate, formatDayMonth, formatDelta, formatInt, formatPercent } from "../../lib/format";
import { CollectionNotice } from "./collection-notice";
import styles from "../home.module.css";

const WINDOW_DAYS = 28;

function periodLabel(end: string) {
  const from = new Date(`${end}T12:00:00Z`);
  from.setUTCDate(from.getUTCDate() - WINDOW_DAYS + 1);
  return `${formatDayMonth(from)} – ${formatDate(end)}`;
}

type Metric = {
  label: string;
  value: string;
  source: string;
  date: string | null;
  delta: ReturnType<typeof formatDelta>;
  previous: string | null;
  coverage?: string;
};

export async function HomePerformanceSummary() {
  const siteId = baselineAudit.domain;
  const [gsc, ga4] = await Promise.all([
    safeRead("home gsc", () => getGscTotals(siteId, WINDOW_DAYS)),
    safeRead("home ga4", () => getGa4Totals(siteId, WINDOW_DAYS)),
  ]);
  const periodEnd = gsc?.lastDate ?? ga4?.lastDate;
  const reading = performanceReading(gsc, ga4);
  const gscComparable = hasComparableCoverage(gsc, WINDOW_DAYS);
  const ga4Comparable = hasComparableCoverage(ga4, WINDOW_DAYS);
  const gscCoverage = gsc?.lastDate && gsc.current.days < WINDOW_DAYS ? `${gsc.current.days} giorni con dati su ${WINDOW_DAYS}` : undefined;
  const ga4Coverage = ga4?.lastDate && ga4.current.days < WINDOW_DAYS ? `${ga4.current.days} giorni con dati su ${WINDOW_DAYS}` : undefined;
  const metrics: Metric[] = [
    { label: "Clic da Google", value: gsc?.lastDate ? formatInt(gsc.current.clicks) : "N/D", source: "Search Console", date: gsc?.lastDate ?? null,
      delta: gsc && gscComparable ? formatDelta(gsc.current.clicks, gsc.previous.clicks) : null,
      previous: gsc && gscComparable ? formatInt(gsc.previous.clicks) : null, coverage: gscCoverage },
    { label: "Impressioni su Google", value: gsc?.lastDate ? formatInt(gsc.current.impressions) : "N/D", source: "Search Console", date: gsc?.lastDate ?? null,
      delta: gsc && gscComparable ? formatDelta(gsc.current.impressions, gsc.previous.impressions) : null,
      previous: gsc && gscComparable ? formatInt(gsc.previous.impressions) : null, coverage: gscCoverage },
    { label: "CTR su Google", value: gsc?.lastDate ? formatPercent(gsc.current.ctr) : "N/D", source: "Search Console", date: gsc?.lastDate ?? null,
      delta: gsc && gscComparable ? formatDelta(gsc.current.ctr, gsc.previous.ctr) : null,
      previous: gsc && gscComparable ? formatPercent(gsc.previous.ctr) : null, coverage: gscCoverage },
    { label: "Sessioni da ricerca organica", value: ga4?.lastDate ? formatInt(ga4.current.sessions) : "N/D", source: "Analytics · Organic Search", date: ga4?.lastDate ?? null,
      delta: ga4 && ga4Comparable ? formatDelta(ga4.current.sessions, ga4.previous.sessions) : null,
      previous: ga4 && ga4Comparable ? formatInt(ga4.previous.sessions) : null, coverage: ga4Coverage },
  ];

  return (
    <section className={styles.performance} aria-labelledby="performance-title">
          <CollectionNotice siteId={siteId} />
          <div className={styles.sectionHeading}>
            <div>
              <h2 id="performance-title">I risultati di Solair, in sintesi</h2>
              <p>{periodEnd ? periodLabel(periodEnd) : "Periodo non disponibile"} · confronto con i 28 giorni precedenti</p>
            </div>
            <Link className={styles.detailLink} href="/sezioni/performance">Approfondisci i risultati <ArrowUpRight size={18} aria-hidden="true" /></Link>
          </div>
          <div className={`${styles.reading} ${styles[`reading_${reading.tone}`]}`}>
            <span className={styles.readingIcon}><Compass size={25} aria-hidden="true" /></span>
            <div><h3>{reading.title}</h3><p>{reading.detail}</p></div>
          </div>
          <ul className={styles.metrics}>
            {metrics.map((metric, index) => {
              const MetricIcon = [MousePointer2, Eye, MousePointerClick, UsersRound][index];
              return (
              <li key={metric.label}>
                <span className={styles.metricLabel}><MetricIcon size={20} aria-hidden="true" />{metric.label}</span>
                <strong className={styles.metricValue}>{metric.value}</strong>
                <span className={styles.comparison}>
                  {metric.delta && <strong className={styles[`trend_${metric.delta.trend}`]}>{metric.delta.text}</strong>}
                  {metric.previous !== null ? `Prima: ${metric.previous}` : "Confronto non disponibile"}
                </span>
                <span className={styles.metricSource}>{metric.source}</span>
                {metric.date && <span className={styles.metricDate}>Dati al {formatDayMonth(metric.date)}</span>}
                {metric.coverage && <span className={styles.metricDate}>{metric.coverage}</span>}
              </li>
            ); })}
          </ul>
          {gsc?.lastDate && ga4?.lastDate && gsc.lastDate !== ga4.lastDate && <p className={styles.caveat}>Analytics: {periodLabel(ga4.lastDate)}. Le due fonti hanno date di aggiornamento diverse.</p>}
        </section>
  );
}
