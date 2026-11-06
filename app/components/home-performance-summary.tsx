import Link from "next/link";
import { ArrowUpRight, Compass, Eye, MousePointer2, MousePointerClick, UsersRound } from "lucide-react";
import { baselineAudit } from "../data/audit-baseline";
import { hasComparableCoverage, performanceReading } from "../data/home-overview";
import { readHomePerformance } from "../data/home-performance";
import { comparisonPeriods, formatPeriod } from "../../lib/comparison-periods";
import { ComparisonPeriods } from "./comparison-periods";
import { formatDelta, formatInt, formatPercent } from "../../lib/format";
import { CollectionNotice } from "./collection-notice";
import styles from "../home.module.css";

const WINDOW_DAYS = 28;


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
  const { gsc, ga4 } = await readHomePerformance(siteId);
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
              <p>{periodEnd ? "Search Console e Analytics · periodi di 28 giorni" : "Periodo non disponibile"}</p>
            </div>
            <Link className={styles.detailLink} href="/sezioni/performance">Approfondisci i risultati <ArrowUpRight size={18} aria-hidden="true" /></Link>
          </div>
          {periodEnd && <div className={styles.periodInset}><ComparisonPeriods {...comparisonPeriods(periodEnd)}/></div>}
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
                  {metric.previous !== null ? `Nel periodo di confronto: ${metric.previous}` : "Confronto non disponibile"}
                </span>
                <span className={styles.metricSource}>{metric.source}</span>
                {metric.date && <><span className={styles.metricDate}>Attuale: {formatPeriod(comparisonPeriods(metric.date).current)}</span><span className={styles.metricDate}>Confronto: {formatPeriod(comparisonPeriods(metric.date).previous)}</span></>}
                {metric.coverage && <span className={styles.metricDate}>{metric.coverage}</span>}
              </li>
            ); })}
          </ul>
          {gsc?.lastDate && ga4?.lastDate && gsc.lastDate !== ga4.lastDate && <p className={styles.caveat}>Analytics: {formatPeriod(comparisonPeriods(ga4.lastDate).current)} · confronto: {formatPeriod(comparisonPeriods(ga4.lastDate).previous)}. Le due fonti hanno date di aggiornamento diverse.</p>}
        </section>
  );
}
