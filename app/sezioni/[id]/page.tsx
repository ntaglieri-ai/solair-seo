import Link from "next/link";
import { notFound } from "next/navigation";
import { baselineAudit, type AuditArea } from "../../data/audit-baseline";

const trackingSectionId = "tracking-setup";

function scoreLabel(score: number | null) {
  return score === null ? "N/D" : `${score}/100`;
}

function priorityClass(priority: string) {
  return priority === "Alta" ? "badge priority-high" : "badge";
}

function trackingStatusClass(status: string) {
  return `status-pill status-${status.toLowerCase().replaceAll(" ", "-")}`;
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

  return {
    title: area ? `${area.title} | Solair SEO` : "Solair SEO",
    description: "Dettaglio sezione audit SEO Solair Group",
  };
}

export default async function SectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const area = findArea(id);

  if (area) {
    return (
      <main className="dashboard section-page">
        <AreaDetail area={area} />
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
