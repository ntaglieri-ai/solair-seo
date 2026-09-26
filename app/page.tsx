import Image from "next/image";
import Link from "next/link";
import { IBM_Plex_Sans, Sora } from "next/font/google";
import { baselineAudit } from "./data/audit-baseline";
import { baselineDate, currentReportUrl, workPriorities } from "./data/home";
import { getGscClicksBetween, getGscTotals } from "../lib/engine/read";
import { getIndexedPages } from "../lib/engine/indexed-pages";
import { safeRead } from "../lib/engine/safe";
import { formatDate, formatDelta, formatInt } from "../lib/format";
import { HomeMenu } from "./components/home-menu";
import styles from "./home.module.css";

// I numeri di "A che punto siamo" leggono l'archivio a ogni richiesta.
export const dynamic = "force-dynamic";

const sora = Sora({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-sora",
});

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex",
});

const WINDOW_DAYS = 28;

const menu = [
  { label: "Report", href: currentReportUrl },
  { label: "Performance", href: "/sezioni/performance" },
  { label: "Visibilità AI", href: "/visibilita-ai" },
  { label: "Action plan", href: "/sezioni/action-plan" },
  { label: "Tracking", href: "/sezioni/tracking-setup" },
  { label: "Storico", href: "/sezioni/historical-comparison" },
];

const steps = [
  {
    title: "Misura",
    description:
      "Dati reali da Google e dalle risposte AI, raccolti in automatico sulle ricerche che portano clienti.",
    links: [
      { label: "Tracking", href: "/sezioni/tracking-setup" },
      { label: "Nuovo audit", href: "/audit" },
    ],
  },
  {
    title: "Analizza",
    description: "Dove Solair perde posizioni e contro chi: marketplace nazionali e installatori locali.",
    links: [{ label: "Performance", href: "/sezioni/performance" }],
  },
  {
    title: "Intervieni",
    description: "Interventi in ordine di impatto. Li decidete voi, li realizziamo noi.",
    links: [{ label: "Action plan", href: "/sezioni/action-plan" }],
    current: true,
  },
  {
    title: "Verifica",
    description: "Il prima e dopo di ogni intervento, misurato sulla baseline di partenza.",
    links: [{ label: "Storico", href: "/sezioni/historical-comparison" }],
  },
];

/** "2026-09-06" meno `days` giorni, sempre in YYYY-MM-DD. */
function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

type Metric = {
  label: string;
  value: string;
  delta?: { text: string; trend: "up" | "down" | "flat" };
  note?: string;
};

async function getProgress(): Promise<Metric[]> {
  const siteId = baselineAudit.domain;
  const baselineFrom = shiftDate(baselineDate, WINDOW_DAYS - 1);

  const gsc = await safeRead("home gsc", () => getGscTotals(siteId, WINDOW_DAYS));
  const lastDate = gsc?.lastDate ?? null;
  const currentFrom = lastDate ? shiftDate(lastDate, WINDOW_DAYS - 1) : null;

  const [baselineClicks, pagesNow, pagesBaseline] = await Promise.all([
    safeRead("home clic baseline", () => getGscClicksBetween(siteId, baselineFrom, baselineDate)),
    lastDate && currentFrom
      ? safeRead("home pagine", () => getIndexedPages(siteId, currentFrom, lastDate))
      : null,
    safeRead("home pagine baseline", () => getIndexedPages(siteId, baselineFrom, baselineDate)),
  ]);

  const pages: Metric = { label: "Pagine visibili su Google", value: "—" };
  if (pagesNow !== null) {
    pages.value = formatInt(pagesNow);
    if (pagesBaseline !== null) {
      const diff = pagesNow - pagesBaseline;
      pages.delta = {
        text: diff === 0 ? "invariate" : `${diff > 0 ? "+" : "−"}${formatInt(Math.abs(diff))} vs baseline`,
        trend: diff > 0 ? "up" : diff < 0 ? "down" : "flat",
      };
    }
  }

  const clicks: Metric = { label: `Clic organici · ultimi ${WINDOW_DAYS} giorni`, value: "—" };
  if (gsc && lastDate) {
    clicks.value = formatInt(gsc.current.clicks);
    clicks.note = `al ${formatDate(lastDate)}`;
    const delta = baselineClicks && formatDelta(gsc.current.clicks, baselineClicks.clicks);
    if (delta) clicks.delta = { ...delta, text: `${delta.text} vs baseline` };
  }

  return [pages, clicks, { label: "Presenza nelle risposte AI", value: "In arrivo" }];
}

const icons = {
  report: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6M9 17h4" />
    </>
  ),
  trend: (
    <>
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M15 7h6v6" />
    </>
  ),
};

export default async function Home() {
  const progress = await getProgress();

  return (
    <main className={`${styles.home} ${sora.variable} ${plexSans.variable}`}>
      <section className={styles.hero} aria-labelledby="home-title">
        {/* Energy Hill, Taipei — foto di Anders J su Unsplash (hxUcl0nUsIY) */}
        <Image
          className={styles.heroPhoto}
          src="https://images.unsplash.com/photo-1594818379496-da1e345b0ded?ixlib=rb-4.1.0&q=80&fm=jpg&cs=srgb"
          alt=""
          fill
          priority
          sizes="100vw"
        />
        <header className={styles.topbar}>
          <div className={styles.topbarInner}>
            <Link className={styles.brand} href="/">
              <span className={styles.brandMark} aria-hidden="true" />
              <span className={styles.brandText}>
                <strong>SolairSEO</strong>
                <span>by Solair Group</span>
              </span>
            </Link>
            <HomeMenu items={menu} domain={baselineAudit.domain} />
          </div>
        </header>

        <div className={styles.heroBody}>
          <span className={styles.eyebrow}>
            <span className={styles.dot} aria-hidden="true" />
            SEO &amp; GEO per il fotovoltaico
          </span>
          <h1 id="home-title">Visibilità su Google e AI</h1>
          <p className={styles.lead}>
            Sappiamo dove Solair Group viene trovata, dove perde clienti a favore
            dei concorrenti e cosa fare per recuperarli.
          </p>
          <div className={styles.actions}>
            <Link className={styles.primary} href={currentReportUrl}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                {icons.report}
              </svg>
              Apri l&apos;ultimo report
            </Link>
            <Link className={styles.secondary} href="/sezioni/performance">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                {icons.trend}
              </svg>
              Verifica performance
            </Link>
          </div>
        </div>
      </section>

      <section className={styles.progress} aria-labelledby="progress-title">
        <div className={styles.progressHeading}>
          <h2 id="progress-title">A che punto siamo</h2>
          <span>Confronto con la baseline del {formatDate(baselineDate)}</span>
        </div>
        <ul className={styles.metrics}>
          {progress.map((metric) => (
            <li key={metric.label}>
              <span className={styles.metricLabel}>{metric.label}</span>
              <div className={styles.metricValue}>
                <strong className={metric.value === "In arrivo" ? styles.metricPending : undefined}>
                  {metric.value}
                </strong>
                {metric.delta && (
                  <span className={styles[`trend_${metric.delta.trend}`]}>{metric.delta.text}</span>
                )}
              </div>
              {metric.note && <span className={styles.metricNote}>{metric.note}</span>}
              {metric.label === "Presenza nelle risposte AI" && (
                <Link className={styles.metricLink} href="/visibilita-ai">
                  Visibilità AI →
                </Link>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.cycle} aria-labelledby="cycle-title">
        <div className={styles.sectionIntro}>
          <h2 id="cycle-title">Un ciclo, non un report</h2>
          <p>
            Ogni mese misuriamo, capiamo cosa è cambiato, interveniamo sul sito e
            verifichiamo il risultato.
          </p>
        </div>
        <ol className={styles.steps}>
          {steps.map((step, index) => (
            <li key={step.title}>
              <span className={`${styles.stepNumber} ${step.current ? styles.stepCurrent : ""}`}>
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
              <div className={styles.stepLinks}>
                {step.links.map((link) => (
                  <Link key={link.href} href={link.href}>
                    {link.label} →
                  </Link>
                ))}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.work} aria-labelledby="work-title">
        <div className={styles.workHeading}>
          <div className={styles.sectionIntro}>
            <h2 id="work-title">Su cosa stiamo lavorando</h2>
            <p>Le pagine con il maggiore potenziale di traffico, in ordine di priorità.</p>
          </div>
          <Link className={styles.workLink} href="/sezioni/action-plan">
            Action plan completo →
          </Link>
        </div>
        <ol className={styles.workList}>
          {workPriorities.map((item, index) => (
            <li key={item.title}>
              <span className={styles.workNumber}>{String(index + 1).padStart(2, "0")}</span>
              <div className={styles.workText}>
                <strong>{item.title}</strong>
                <span>{item.description}</span>
              </div>
              <div className={styles.tags}>
                {item.tags.map((tag) => (
                  <span key={tag} className={tag === "GEO" ? styles.tagGeo : styles.tagSeo}>
                    {tag}
                  </span>
                ))}
              </div>
              <span className={item.priority === "alta" ? styles.priorityHigh : styles.priorityMedium}>
                Priorità {item.priority}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
