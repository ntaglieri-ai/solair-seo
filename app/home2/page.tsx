import { requireSeoPage } from "../../lib/crm-auth";
import Link from "next/link";
import { ComparisonPeriods } from "../components/comparison-periods";
import { comparisonPeriods, formatPeriod } from "../../lib/comparison-periods";
import { ArrowUpRight, Compass, Eye, MousePointer2, MousePointerClick, Search, ShieldCheck, UsersRound } from "lucide-react";
import { baselineAudit } from "../data/audit-baseline";
import { hasComparableCoverage, performanceReading } from "../data/home-overview";
import { readActionPlan } from "../data/read-action-plan";
import { getGa4Totals, getGscTotals, getLatestAttempts } from "../../lib/engine/read";
import { safeRead } from "../../lib/engine/safe";
import { getWork } from "../../lib/interventions-store";
import { workIdentity } from "../../lib/interventions";
import { getAiStatus } from "../../lib/research-store";
import { formatDate, formatDateTime, formatDayMonth, formatDelta, formatInt, formatPercent } from "../../lib/format";
import { SiteHeader } from "../components/site-header";
import { CollectionNotice } from "../components/collection-notice";
import { HeroPhoto } from "../components/hero-photo";
import { AuditScore } from "../components/audit-score";
import { fontVariables } from "../fonts";
import styles from "../home.module.css";

export const dynamic = "force-dynamic";
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

async function readOverview() {
  const siteId = baselineAudit.domain;
  const [gsc, ga4, plan, attempts, work, ai] = await Promise.all([
    safeRead("home gsc", () => getGscTotals(siteId, WINDOW_DAYS)),
    safeRead("home ga4", () => getGa4Totals(siteId, WINDOW_DAYS)),
    readActionPlan(siteId),
    safeRead("home fonti", () => getLatestAttempts(siteId)),
    safeRead("home avanzamento", () => getWork(siteId)),
    safeRead("home verifiche AI", () => getAiStatus(siteId)),
  ]);
  const pending=new Map(plan.actions.map((item)=>[workIdentity(item),item]));
  for(const item of work??[]) { if(item.completedAt)pending.delete(item.actionId);else pending.set(item.actionId,item.proposal); }
  return { gsc, ga4, plan:{...plan,actions:[...pending.values()]}, attempts, ai };
}

async function Home() {
  const siteId = baselineAudit.domain;
  const { gsc, ga4, plan, attempts, ai } = await readOverview();
  const periodEnd = gsc?.lastDate ?? ga4?.lastDate;
  const { actions, period, validatedAt: analysisDate } = plan;
  const reading = performanceReading(gsc, ga4);
  const searchPages = new Set(actions.filter((item) => item.kind !== "technical").map((item) => item.page)).size;
  const technicalCount = actions.filter((item) => item.kind === "technical").length;
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
                {metric.date && <span className={styles.metricDate}>Dati al {formatDayMonth(metric.date)}</span>}
                {metric.coverage && <span className={styles.metricDate}>{metric.coverage}</span>}
              </li>
            ); })}
          </ul>
          {gsc?.lastDate && ga4?.lastDate && gsc.lastDate !== ga4.lastDate && <p className={styles.caveat}>Analytics: {formatPeriod(comparisonPeriods(ga4.lastDate).current)} · confronto: {formatPeriod(comparisonPeriods(ga4.lastDate).previous)}. Le due fonti hanno date di aggiornamento diverse.</p>}
        </section>
      </div>
      <section id="interventi" className={styles.serviceBand} aria-labelledby="interventions-title">
        <div className={styles.serviceInner}>
          <div className={styles.serviceCopy}>
            <span className={styles.serviceEyebrow}>Il prossimo passo</span>
            <h2 id="interventions-title">Le prossime opportunità <em>per Solair.</em></h2>
            <p>{actions.length ? `Le analisi indicano ${actions.length} interventi da valutare per rendere più efficaci le pagine del sito. Proposte concrete, da definire insieme prima di iniziare.` : plan.status === "unavailable" ? "Il prossimo piano di intervento partirà dalle evidenze disponibili, senza anticipare conclusioni non verificate." : "L'ultima analisi non ha generato proposte di intervento. I risultati restano il riferimento per le prossime valutazioni."}</p>
            <Link className={styles.serviceButton} href="/interventi">{actions.length ? "Scopri gli interventi per Solair" : plan.status === "unavailable" ? "Stato del piano di intervento" : "Consulta l'esito dell'analisi"}<ArrowUpRight size={21} aria-hidden="true" /></Link>
            {period && <span className={styles.serviceDate}>Analisi: {formatDayMonth(period.from)} – {formatDate(period.to)}</span>}
          </div>
          <div className={styles.planPreview}>
            <div className={styles.planPreviewHeading}><span className={styles.planNumber}>{actions.length ? String(actions.length).padStart(2, "0") : "—"}</span><div><strong>{actions.length ? "interventi da valutare o svolgere" : plan.status === "unavailable" ? "Piano non disponibile" : "Nessun intervento in attesa"}</strong><span>Una proposta di lavoro per Solair Group</span></div></div>
            <div className={styles.planAreas}>
              {searchPages > 0 && <div><span className={styles.searchIcon}><Search size={25} aria-hidden="true" /></span><div><strong>Risultati di ricerca</strong><p>{searchPages} {searchPages === 1 ? "pagina da valorizzare" : "pagine da valorizzare"}</p></div></div>}
              {technicalCount > 0 && <div><span className={styles.qualityIcon}><ShieldCheck size={25} aria-hidden="true" /></span><div><strong>Qualità delle pagine</strong><p>{technicalCount} {technicalCount === 1 ? "intervento proposto" : "interventi proposti"}</p></div></div>}
            </div>
            <p className={styles.planFootnote}>{plan.status === "partial" ? "Analisi parziale: alcune verifiche restano aperte." : actions.length ? "Proposte motivate da dati rilevati. Approvazione e avanzamento sono consultabili nel piano di intervento." : plan.status === "unavailable" ? "Al momento non è disponibile un piano aggiornato." : "L'ultima analisi non ha generato proposte d'intervento."}</p>
          </div>
        </div>
      </section>
      <div className={styles.content}>
        <AuditScore siteId={siteId} />
        <details className={styles.system}>
          <summary><span>Stato sistema</span><span className={styles.systemHint}>Fonti e aggiornamenti</span></summary>
          <div className={styles.systemBody}>
            <dl>
              {(["gsc", "ga4"] as const).map((kind) => {
                const run = attempts?.find((attempt) => attempt.kind === kind);
                const status = !run ? "Non disponibile" : run.status === "error" ? "Errore di raccolta" : run.status === "running" ? "Raccolta in corso" : run.stale ? "Da aggiornare" : "Aggiornata";
                return <div key={kind}><dt>{kind === "gsc" ? "Search Console" : "Google Analytics"}</dt><dd><strong>{status}</strong>{run?.finishedAt && <span>{formatDateTime(new Date(run.finishedAt))}</span>}</dd></div>;
              })}
              <div><dt>Visibilità AI</dt><dd><strong>{ai===null?"Stato non disponibile":ai.count?"Verifiche manuali archiviate":"Non misurata"}</strong>{ai?.date&&<span>{formatDate(ai.date)}</span>}</dd></div>
              <div><dt>Ultima analisi validata</dt><dd>{analysisDate && Number.isFinite(analysisDate.getTime()) ? formatDateTime(analysisDate) : "Non disponibile"}</dd></div>
            </dl>
            <Link className={styles.detailLink} href="/sezioni/tracking-setup">Dettaglio delle fonti <span aria-hidden="true">&rarr;</span></Link>
          </div>
        </details>
      </div>
    </main>
  );
}

export default async function AuthorizedPage(...args: Parameters<typeof Home>) {
  await requireSeoPage();
  return Home(...args);
}
