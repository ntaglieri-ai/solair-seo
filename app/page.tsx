import Link from "next/link";
import { audits, baselineAudit } from "./data/audit-baseline";

const scoreMetrics = [
  ["Technical SEO", baselineAudit.scores.technicalSeo],
  ["On-Page", baselineAudit.scores.onPage],
  ["Off-Page", baselineAudit.scores.offPage],
  ["Structure", baselineAudit.scores.structure],
] as const;

function scoreLabel(score: number | null) {
  return score === null ? "N/D" : `${score}/100`;
}

function priorityClass(priority: string) {
  return priority === "Alta" ? "badge priority-high" : "badge";
}

function scoreDelta(score: number, baseline: number) {
  const delta = score - baseline;

  if (delta === 0) {
    return "Baseline";
  }

  return delta > 0 ? `+${delta}` : `${delta}`;
}

export default function Home() {
  const activeTrackingItems = baselineAudit.trackingSetup.items.filter(
    (item) => item.status === "Attivo",
  ).length;

  return (
    <main className="dashboard">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <strong>Solair SEO</strong>
            <span>Dashboard SEO/GEO per audit on demand</span>
          </div>
          <div className="audit-meta" aria-label="Dati audit baseline">
            <span>{baselineAudit.auditDate}</span>
            <span>{baselineAudit.client}</span>
            <span>{baselineAudit.domain}</span>
          </div>
        </div>
      </header>

      <section className="hero" aria-labelledby="baseline-title">
        <div className="section-inner">
          <div>
            <span className="eyebrow">{baselineAudit.label}</span>
            <h1 id="baseline-title">Audit Baseline</h1>
            <p className="hero-copy">
              Baseline iniziale del report SEO di maggio 2026 per confrontare
              audit commissionati, variazioni di score e priorita&apos; operative
              nel tempo.
            </p>
            <div className="positioning">
              {baselineAudit.positioning.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
            <div className="score-grid" aria-label="Score iniziali">
              {scoreMetrics.map(([label, score]) => (
                <div className="metric" key={label}>
                  <strong>{score}</strong>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>

          <aside className="score-panel" aria-label="SEO Global Score">
            <div>
              <span className="score-label">SEO Global Score</span>
              <div className="score-value">
                <strong>{baselineAudit.globalScore}</strong>
                <span>/100</span>
              </div>
              <div className="score-bar" aria-hidden="true">
                <span style={{ width: `${baselineAudit.globalScore}%` }} />
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="content-section">
        <div className="section-inner">
          <div className="section-heading">
            <h2>Panoramica</h2>
            <span>Una pagina indice, dettagli separati per sezione</span>
          </div>
          <div className="overview-grid">
            <Link className="overview-card" href="/sezioni/executive-summary">
              <span className="eyebrow">Baseline</span>
              <h3>Executive Summary</h3>
              <p>Situazione iniziale, posizionamento e priorita&apos; del progetto.</p>
              <strong>{baselineAudit.globalScore}/100</strong>
            </Link>

            <Link className="overview-card" href="/sezioni/tracking-setup">
              <span className="eyebrow">Operativo</span>
              <h3>Setup Tracking</h3>
              <p>Stato GA4, Search Console e richieste di indicizzazione.</p>
              <strong>{activeTrackingItems}/3 attivi</strong>
            </Link>

            <Link className="overview-card" href="/sezioni/historical-comparison">
              <span className="eyebrow">Storico</span>
              <h3>Confronti Audit</h3>
              <p>Baseline pronta per confronti con audit futuri on demand.</p>
              <strong>{audits.length} audit</strong>
            </Link>
          </div>
        </div>
      </section>

      <section className="content-section" aria-label="Aree audit baseline">
        <div className="section-inner">
          <div className="section-heading">
            <h2>Sezioni</h2>
            <span>Apri solo cio&apos; che serve</span>
          </div>
          <div className="areas-grid">
            {baselineAudit.areas.map((area) => (
              <Link className="area-card area-card-link" href={`/sezioni/${area.id}`} key={area.id}>
                <div className="area-header">
                  <div className="area-title">
                    <h3>{area.title}</h3>
                    <span className="status">{area.status}</span>
                  </div>
                  <div className="area-score">
                    <strong>{scoreLabel(area.score)}</strong>
                    <span>Score area</span>
                  </div>
                </div>

                <div className="area-body">
                  <p>{area.notes[0]}</p>
                </div>

                <div className="priority-row">
                  <span className={priorityClass(area.priority)}>
                    Priorita&apos;: {area.priority}
                  </span>
                  <span className="badge">Data audit: {area.auditDate}</span>
                  <span className="badge open-badge">Apri sezione</span>
                </div>
              </Link>
            ))}
            <Link className="area-card area-card-link" href="/sezioni/tracking-setup">
              <div className="area-header">
                <div className="area-title">
                  <h3>Setup Tracking</h3>
                  <span className="status">GA4 e Search Console validati</span>
                </div>
                <div className="area-score">
                  <strong>{activeTrackingItems}/3</strong>
                  <span>Attivi</span>
                </div>
              </div>
              <div className="area-body">
                <p>
                  Tracking, sitemap, indicizzazione e note GSC raccolte in una
                  pagina operativa separata.
                </p>
              </div>
              <div className="priority-row">
                <span className="badge priority-high">Priorita&apos;: Alta</span>
                <span className="badge">Verifica: {baselineAudit.trackingSetup.verifiedAt}</span>
              </div>
            </Link>
            <Link
              className="area-card area-card-link"
              href={`/sezioni/${baselineAudit.geoAiVisibility.id}`}
            >
              <div className="area-header">
                <div className="area-title">
                  <h3>{baselineAudit.geoAiVisibility.title}</h3>
                  <span className="status">{baselineAudit.geoAiVisibility.status}</span>
                </div>
                <div className="area-score">
                  <strong>N/D</strong>
                  <span>Score area</span>
                </div>
              </div>
              <div className="area-body">
                <p>Sezione futura predisposta, senza dati inseriti per ora.</p>
              </div>
              <div className="priority-row">
                <span className="badge">Priorita&apos;: Da definire</span>
                <span className="badge">Data audit: {baselineAudit.auditDate}</span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      <section className="content-section">
        <div className="section-inner">
          <div className="section-heading">
            <h2>Baseline Data</h2>
            <span>Confronti solo tra audit inseriti on demand</span>
          </div>
          <div className="table-scroll">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>Audit</th>
                  <th>SEO globale</th>
                  <th>Tecnico</th>
                  <th>On-Page</th>
                  <th>Off-Page</th>
                  <th>Struttura</th>
                </tr>
              </thead>
              <tbody>
                {audits.map((audit) => (
                  <tr key={audit.id}>
                    <td>{audit.auditDate}</td>
                    <td>
                      {audit.globalScore}/100{" "}
                      <span>{scoreDelta(audit.globalScore, baselineAudit.globalScore)}</span>
                    </td>
                    <td>
                      {audit.scores.technicalSeo}/100{" "}
                      <span>
                        {scoreDelta(
                          audit.scores.technicalSeo,
                          baselineAudit.scores.technicalSeo,
                        )}
                      </span>
                    </td>
                    <td>
                      {audit.scores.onPage}/100{" "}
                      <span>
                        {scoreDelta(audit.scores.onPage, baselineAudit.scores.onPage)}
                      </span>
                    </td>
                    <td>
                      {audit.scores.offPage}/100{" "}
                      <span>
                        {scoreDelta(audit.scores.offPage, baselineAudit.scores.offPage)}
                      </span>
                    </td>
                    <td>
                      {audit.scores.structure}/100{" "}
                      <span>
                        {scoreDelta(audit.scores.structure, baselineAudit.scores.structure)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}
