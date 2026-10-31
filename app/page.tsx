import Link from "next/link";
import { baselineAudit } from "./data/audit-baseline";
import { hasComparableCoverage, splitInterventions } from "./data/home-overview";
import { getGa4Totals, getGscTotals, getLatestAttempts } from "../lib/engine/read";
import { getLastSnapshot } from "../lib/engine/store";
import { ANALYSIS_VERSION, type Opportunity } from "../lib/engine/analyze";
import { safeRead } from "../lib/engine/safe";
import { formatDate, formatDateTime, formatDayMonth, formatDelta, formatInt, formatPercent } from "../lib/format";
import { SiteHeader } from "./components/site-header";
import { CollectionNotice } from "./components/collection-notice";
import { HeroPhoto } from "./components/hero-photo";
import { fontVariables } from "./fonts";
import styles from "./home.module.css";

export const dynamic = "force-dynamic";
const WINDOW_DAYS = 28;

function periodLabel(end: string) {
  const from = new Date(`${end}T12:00:00Z`);
  from.setUTCDate(from.getUTCDate() - WINDOW_DAYS + 1);
  return `${formatDayMonth(from)} – ${formatDate(end)}`;
}

function isIntervention(value: unknown): value is Opportunity {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return ["id", "title", "page", "action", "expectedOutcome", "interpretation"].every((key) => typeof item[key] === "string") &&
    !!item.evidence && typeof item.evidence === "object";
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

function Intervention({ item, index }: { item: Opportunity; index: number }) {
  const queryEvidence = typeof item.evidence.impressions === "number" && typeof item.evidence.clicks === "number" && typeof item.evidence.ctr === "number";
  return (
    <details className={styles.intervention}>
      <summary>
        <span className={styles.ordinal}>{String(index + 1).padStart(2, "0")}</span>
        <span className={styles.interventionTitle}>
          <strong>{item.title}</strong>
          <span>{item.page === "/" ? "Homepage" : item.page}</span>
        </span>
        <span className={`${styles.priority} ${item.priority === "high" ? styles.priorityHigh : ""}`}>{item.priority === "high" ? "Priorità alta" : "Priorità media"}</span>
      </summary>
      <div className={styles.interventionBody}>
        <p className={styles.priorityDetail}>{item.priority === "high" ? "Priorità alta" : "Priorità media"}</p>
        {item.query && <p className={styles.query}>Ricerca: <strong>{item.query}</strong></p>}
        {queryEvidence && <p className={styles.facts}>{formatInt(item.evidence.impressions as number)} impressioni · {formatInt(item.evidence.clicks as number)} clic · CTR {formatPercent(item.evidence.ctr as number)}</p>}
        {Array.isArray(item.evidence.issues) && <p className={styles.facts}>{item.evidence.issues.map((issue) => String(issue).replace(/\s+\(-\d+\)$/, "")).join("; ")}</p>}
        <h3>Intervento proposto</h3>
        <p>{item.action}</p>
        <h3>Obiettivo</h3>
        <p>{item.expectedOutcome}</p>
      </div>
    </details>
  );
}

async function readOverview() {
  const siteId = baselineAudit.domain;
  const [gsc, ga4, snapshot, attempts] = await Promise.all([
    safeRead("home gsc", () => getGscTotals(siteId, WINDOW_DAYS)),
    safeRead("home ga4", () => getGa4Totals(siteId, WINDOW_DAYS)),
    safeRead("home interventi", () => getLastSnapshot(siteId)),
    safeRead("home fonti", () => getLatestAttempts(siteId)),
  ]);
  return { gsc, ga4, snapshot, attempts, now: Date.now() };
}

export default async function Home() {
  const siteId = baselineAudit.domain;
  const { gsc, ga4, snapshot, attempts, now } = await readOverview();
  const periodEnd = gsc?.lastDate ?? ga4?.lastDate;
  const analysisDate = snapshot?.validatedAt ? new Date(snapshot.validatedAt) : null;
  const analysisDays = Number(snapshot?.data?.settings?.analysisDays) || 7;
  const recentAnalysis = analysisDate !== null && Number.isFinite(analysisDate.getTime()) && now - analysisDate.getTime() <= (analysisDays + 1) * 86400000;
  const validAnalysis = snapshot?.data?.version === ANALYSIS_VERSION && snapshot.status !== "blocked" && recentAnalysis;
  const actions: Opportunity[] = validAnalysis && Array.isArray(snapshot.data.opportunities)
    ? snapshot.data.opportunities.filter(isIntervention) : [];
  const { primary, additional } = splitInterventions(actions);
  const windows = validAnalysis ? snapshot.data.windows : null;
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
    { label: "Sessioni sul sito", value: ga4?.lastDate ? formatInt(ga4.current.sessions) : "N/D", source: "Analytics · tutti i canali", date: ga4?.lastDate ?? null,
      delta: ga4 && ga4Comparable ? formatDelta(ga4.current.sessions, ga4.previous.sessions) : null,
      previous: ga4 && ga4Comparable ? formatInt(ga4.previous.sessions) : null, coverage: ga4Coverage },
  ];

  return (
    <main className={`${styles.home} ${fontVariables}`}>
      <section className={styles.hero} aria-labelledby="home-title">
        <HeroPhoto className={styles.heroPhoto} />
        <SiteHeader current="/" />
        <div className={styles.heroBody}>
          <p className={styles.eyebrow}>Solair Group · {siteId}</p>
          <h1 id="home-title">Visibilità su Google e AI</h1>
          <p className={styles.lead}>Performance del sito e interventi proposti per migliorare la visibilità di Solair Group.</p>
          <div className={styles.heroActions}>
            <Link className={styles.primary} href="/sezioni/performance">Performance del sito <span aria-hidden="true">&rarr;</span></Link>
            <Link className={styles.secondary} href="#interventi">Interventi proposti <span aria-hidden="true">&darr;</span></Link>
          </div>
        </div>
      </section>
      <div className={styles.content}>
        <section className={styles.performance} aria-labelledby="performance-title">
          <CollectionNotice siteId={siteId} />
          <div className={styles.sectionHeading}>
            <div>
              <h2 id="performance-title">Performance del sito</h2>
              <p>{periodEnd ? periodLabel(periodEnd) : "Periodo non disponibile"} · confronto con i 28 giorni precedenti</p>
            </div>
            <Link className={styles.detailLink} href="/sezioni/performance">Dettaglio performance <span aria-hidden="true">&rarr;</span></Link>
          </div>
          <ul className={styles.metrics}>
            {metrics.map((metric) => (
              <li key={metric.label}>
                <span className={styles.metricLabel}>{metric.label}</span>
                <strong className={styles.metricValue}>{metric.value}</strong>
                <span className={styles.comparison}>
                  {metric.delta && <strong className={styles[`trend_${metric.delta.trend}`]}>{metric.delta.text}</strong>}
                  {metric.previous !== null ? `Prima: ${metric.previous}` : "Confronto non disponibile"}
                </span>
                <span className={styles.metricSource}>{metric.source}</span>
                {metric.date && <span className={styles.metricDate}>Dati al {formatDayMonth(metric.date)}</span>}
                {metric.coverage && <span className={styles.metricDate}>{metric.coverage}</span>}
              </li>
            ))}
          </ul>
          {gsc?.lastDate && ga4?.lastDate && gsc.lastDate !== ga4.lastDate && <p className={styles.caveat}>Analytics: {periodLabel(ga4.lastDate)}. Le due fonti hanno date di aggiornamento diverse.</p>}
        </section>
        <section id="interventi" className={styles.interventions} aria-labelledby="interventions-title">
          <div className={styles.sectionHeading}>
            <div>
              <h2 id="interventions-title">Interventi proposti</h2>
              <p>{windows ? `Analisi: ${formatDayMonth(windows.current.from)} – ${formatDate(windows.current.to)}` : "Nessuna analisi utilizzabile"}</p>
            </div>
            {actions.length > 0 && <span className={styles.count}>{actions.length} da valutare</span>}
          </div>
          {validAnalysis && snapshot.status === "partial" && <p className={styles.caveat}>Analisi parziale: alcune fonti o verifiche non sono disponibili. Gli interventi proposti conservano le proprie evidenze.</p>}
          <div className={styles.interventionList}>
            {actions.length ? primary.map((item, index) => <Intervention key={item.id} item={item} index={index} />)
              : <p className={styles.empty}>{validAnalysis ? "Nessun intervento proposto dall'ultima analisi." : "Non è disponibile un'analisi aggiornata utilizzabile per proporre interventi."}</p>}
            {additional.length > 0 && <details className={styles.more}><summary>Altri {additional.length} interventi</summary>{additional.map((item, index) => <Intervention key={item.id} item={item} index={index + primary.length} />)}</details>}
          </div>
        </section>
        <details className={styles.system}>
          <summary><span>Stato sistema</span><span className={styles.systemHint}>Fonti e aggiornamenti</span></summary>
          <div className={styles.systemBody}>
            <dl>
              {(["gsc", "ga4"] as const).map((kind) => {
                const run = attempts?.find((attempt) => attempt.kind === kind);
                const status = !run ? "Non disponibile" : run.status === "error" ? "Errore di raccolta" : run.status === "running" ? "Raccolta in corso" : run.stale ? "Da aggiornare" : "Aggiornata";
                return <div key={kind}><dt>{kind === "gsc" ? "Search Console" : "Google Analytics"}</dt><dd><strong>{status}</strong>{run?.finishedAt && <span>{formatDateTime(new Date(run.finishedAt))}</span>}</dd></div>;
              })}
              <div><dt>Visibilità AI</dt><dd><strong>Non misurata</strong></dd></div>
              <div><dt>Ultima analisi validata</dt><dd>{analysisDate && Number.isFinite(analysisDate.getTime()) ? formatDateTime(analysisDate) : "Non disponibile"}</dd></div>
            </dl>
            <Link className={styles.detailLink} href="/sezioni/tracking-setup">Dettaglio delle fonti <span aria-hidden="true">&rarr;</span></Link>
          </div>
        </details>
      </div>
    </main>
  );
}
