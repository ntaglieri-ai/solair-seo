import Link from "next/link";
import { notFound } from "next/navigation";
import { baselineAudit, type AuditArea } from "../../data/audit-baseline";
import { clientConfig } from "../../../lib/client-config";
import { AnalyticsLive, CollectionStatus, HistoryLive, PerformanceLive } from "./live-data";

// Performance, Storico e Tracking leggono il database a ogni richiesta.
export const dynamic = "force-dynamic";

const siteId = baselineAudit.domain;

const trackingSectionId = "tracking-setup";
const performanceSectionId = "performance";
const historySectionId = "historical-comparison";

function scoreLabel(score: number | null) {
  return score === null ? "N/D" : `${score}/100`;
}

function priorityClass(priority: string) {
  return priority === "Alta" ? "badge priority-high" : "badge";
}

function trackingStatusClass(status: string) {
  return `status-pill status-${status.toLowerCase().replaceAll(" ", "-")}`;
}

function performanceStatusClass(status: string) {
  return `performance-status performance-status-${status.toLowerCase().replaceAll(" ", "-")}`;
}

function findArea(id: string) {
  return baselineAudit.areas.find((area) => area.id === id);
}

function AreaDetail({ area }: { area: AuditArea }) {
  return (
    <>
      <section className="detail-hero">
        <div className="section-inner">
          <Link className="back-link" href="/">
            Torna alla panoramica
          </Link>
          <span className="eyebrow">{baselineAudit.label}</span>
          <h1>{area.title}</h1>
          <div className="detail-meta">
            <span className="badge">Score: {scoreLabel(area.score)}</span>
            <span className={priorityClass(area.priority)}>
              Priorita&apos;: {area.priority}
            </span>
            <span className="badge">Data audit: {area.auditDate}</span>
          </div>
          <p className="hero-copy">{area.status}</p>
        </div>
      </section>

      <section className="content-section">
        <div className="section-inner detail-grid">
          <div className="detail-panel">
            <h2>Note</h2>
            <ul>
              {area.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </div>
          <div className="detail-panel">
            <h2>Criticita&apos;</h2>
            <ul>
              {area.criticalIssues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          </div>
          <div className="detail-panel">
            <h2>Opportunita&apos;</h2>
            <ul>
              {area.opportunities.map((opportunity) => (
                <li key={opportunity}>{opportunity}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}

function TrackingDetail() {
  return (
    <>
      <section className="detail-hero">
        <div className="section-inner">
          <Link className="back-link" href="/">
            Torna alla panoramica
          </Link>
          <span className="eyebrow">Operativo</span>
          <h1>Setup Tracking</h1>
          <div className="detail-meta">
            <span className="badge">Verifica: {baselineAudit.trackingSetup.verifiedAt}</span>
            <span className="badge priority-high">GSC e GA4 validati</span>
          </div>
          <p className="hero-copy">
            Stato operativo di Google Analytics, Search Console e prime azioni
            di indicizzazione.
          </p>
        </div>
      </section>

      <section className="content-section">
        <div className="section-inner">
          <div className="tracking-grid">
            {baselineAudit.trackingSetup.items.map((item) => (
              <article className="tracking-card" key={item.id}>
                <div className="tracking-card-header">
                  <div>
                    <h2>{item.title}</h2>
                    <p>{item.source}</p>
                  </div>
                  <span className={trackingStatusClass(item.status)}>
                    {item.status}
                  </span>
                </div>
                <div className="area-body">
                  <div className="field">
                    <h4>Dettagli</h4>
                    <ul>
                      {item.details.map((detail) => (
                        <li key={detail}>{detail}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="field">
                    <h4>Azioni</h4>
                    <ul>
                      {item.nextActions.map((action) => (
                        <li key={action}>{action}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="content-section">
        <div className="section-inner">
          <CollectionStatus siteId={siteId} />
        </div>
      </section>
    </>
  );
}

function PerformanceDetail() {
  return (
    <>
      <section className="detail-hero">
        <div className="section-inner">
          <Link className="back-link" href="/">
            Torna alla panoramica
          </Link>
          <span className="eyebrow">Performance</span>
          <h1>Stato Attuale</h1>
          <div className="detail-meta">
            <span className="badge">Fonti: Search Console e Analytics 4</span>
            <span className="badge priority-high">Aggiornamento giornaliero</span>
          </div>
          <p className="hero-copy">
            Visibilità su Google e traffico sul sito, raccolti ogni giorno e confrontati con il
            periodo precedente.
          </p>
        </div>
      </section>

      <section className="content-section">
        <div className="section-inner">
          <PerformanceLive siteId={siteId} />
        </div>
      </section>

      <section className="content-section">
        <div className="section-inner">
          <AnalyticsLive siteId={siteId} />
        </div>
      </section>

      <section className="content-section">
        <div className="section-inner">
          <div className="section-heading">
            <h2>Lettura operativa</h2>
            <span>Aggiornata al {baselineAudit.performance.updatedAt}</span>
          </div>
          <div className="performance-grid">
            {baselineAudit.performance.items.map((item) => (
              <article className="performance-card" key={item.id}>
                <div className="performance-card-top">
                  <div>
                    <span className="eyebrow">{item.title}</span>
                    <h2>{item.value}</h2>
                  </div>
                  <span className={performanceStatusClass(item.status)}>
                    {item.status}
                  </span>
                </div>
                <div className="performance-copy">
                  <h3>Cosa significa</h3>
                  <p>{item.meaning}</p>
                </div>
                <div className="performance-copy">
                  <h3>Azione</h3>
                  <p>{item.action}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function HistoryDetail() {
  return (
    <>
      <section className="detail-hero">
        <div className="section-inner">
          <Link className="back-link" href="/">
            Torna alla panoramica
          </Link>
          <span className="eyebrow">Storico</span>
          <h1>Confronto nel tempo</h1>
          <div className="detail-meta">
            <span className="badge">Baseline: {baselineAudit.auditDate}</span>
            <span className="badge priority-high">Aggiornamento giornaliero</span>
          </div>
          <p className="hero-copy">
            Andamento di Search Console mese per mese, score delle analisi e registro di tutte le
            rilevazioni archiviate.
          </p>
        </div>
      </section>

      <section className="content-section">
        <div className="section-inner">
          <HistoryLive
            siteId={siteId}
            baseline={{
              label: `${baselineAudit.label} (manuale)`,
              date: baselineAudit.auditDate,
              score: baselineAudit.globalScore,
            }}
          />
        </div>
      </section>
    </>
  );
}

function GeoDetail() {
  const area = baselineAudit.geoAiVisibility;

  return (
    <>
      <section className="detail-hero">
        <div className="section-inner">
          <Link className="back-link" href="/">
            Torna alla panoramica
          </Link>
          <span className="eyebrow">Futuro</span>
          <h1>{area.title}</h1>
          <div className="detail-meta">
            <span className="badge">Score: N/D</span>
            <span className="badge">Priorita&apos;: {area.priority}</span>
            <span className="badge">Data audit: {area.auditDate}</span>
          </div>
          <p className="hero-copy">{area.status}</p>
        </div>
      </section>

      <section className="content-section">
        <div className="section-inner">
          <div className="empty-state">
            Sezione predisposta per valutazioni on demand. Nessun dato GEO o AI
            Visibility e&apos; stato inserito nella baseline di maggio 2026.
          </div>
        </div>
      </section>
    </>
  );
}

export function generateStaticParams() {
  return [
    ...baselineAudit.areas.map((area) => ({ id: area.id })),
    { id: performanceSectionId },
    { id: trackingSectionId },
    { id: baselineAudit.geoAiVisibility.id },
  ];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const area = findArea(id);
  const title =
    id === performanceSectionId
      ? `Performance | ${clientConfig.productName}`
      : id === trackingSectionId
        ? `Setup Tracking | ${clientConfig.productName}`
        : area
          ? `${area.title} | ${clientConfig.productName}`
          : clientConfig.productName;

  return {
    title,
    description: `Dettaglio sezione audit SEO ${clientConfig.brandEyebrow}`,
  };
}

export default async function SectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const area = findArea(id);

  if (id === historySectionId) {
    return (
      <main className="dashboard section-page">
        <HistoryDetail />
      </main>
    );
  }

  if (area) {
    return (
      <main className="dashboard section-page">
        <AreaDetail area={area} />
      </main>
    );
  }

  if (id === performanceSectionId) {
    return (
      <main className="dashboard section-page">
        <PerformanceDetail />
      </main>
    );
  }

  if (id === trackingSectionId) {
    return (
      <main className="dashboard section-page">
        <TrackingDetail />
      </main>
    );
  }

  if (id === baselineAudit.geoAiVisibility.id) {
    return (
      <main className="dashboard section-page">
        <GeoDetail />
      </main>
    );
  }

  notFound();
}
