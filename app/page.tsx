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

function trackingStatusClass(status: string) {
  return `status-pill status-${status.toLowerCase().replaceAll(" ", "-")}`;
}

function scoreDelta(score: number, baseline: number) {
  const delta = score - baseline;

  if (delta === 0) {
    return "Baseline";
  }

  return delta > 0 ? `+${delta}` : `${delta}`;
}

export default function Home() {
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

      <nav className="nav-band" aria-label="Sezioni audit">
        <div className="section-inner">
          {baselineAudit.areas.map((area) => (
            <a href={`#${area.id}`} key={area.id}>
              {area.title}
            </a>
          ))}
          <a href="#tracking-setup">Setup Tracking</a>
          <a href={`#${baselineAudit.geoAiVisibility.id}`}>
            {baselineAudit.geoAiVisibility.title}
          </a>
        </div>
      </nav>

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

      <section className="content-section" aria-label="Aree audit baseline">
        <div className="section-inner">
          <div className="areas-grid">
            {baselineAudit.areas.map((area) => (
              <article className="area-card" id={area.id} key={area.id}>
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
                  <div className="field">
                    <h4>Note</h4>
                    <ul>
                      {area.notes.map((note) => (
                        <li key={note}>{note}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="field">
                    <h4>Criticita&apos;</h4>
                    <ul>
                      {area.criticalIssues.map((issue) => (
                        <li key={issue}>{issue}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="field">
                    <h4>Opportunita&apos;</h4>
                    <ul>
                      {area.opportunities.map((opportunity) => (
                        <li key={opportunity}>{opportunity}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="priority-row">
                  <span className={priorityClass(area.priority)}>
                    Priorita&apos;: {area.priority}
                  </span>
                  <span className="badge">Data audit: {area.auditDate}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        className="content-section"
        id="tracking-setup"
        aria-labelledby="tracking-title"
      >
        <div className="section-inner">
          <div className="section-heading">
            <h2 id="tracking-title">Setup Tracking</h2>
            <span>Verifica tecnica: {baselineAudit.trackingSetup.verifiedAt}</span>
          </div>
          <div className="tracking-grid">
            {baselineAudit.trackingSetup.items.map((item) => (
              <article className="tracking-card" key={item.id}>
                <div className="tracking-card-header">
                  <div>
                    <h3>{item.title}</h3>
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
                    <h4>Azioni richieste</h4>
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

      <section
        className="content-section"
        id={baselineAudit.geoAiVisibility.id}
        aria-labelledby="geo-ai-title"
      >
        <div className="section-inner">
          <div className="section-heading">
            <h2 id="geo-ai-title">{baselineAudit.geoAiVisibility.title}</h2>
            <span>{baselineAudit.geoAiVisibility.status}</span>
          </div>
          <div className="empty-state">
            Sezione predisposta per valutazioni on demand. Nessun dato GEO o AI
            Visibility e&apos; stato inserito nella baseline di maggio 2026.
          </div>
        </div>
      </section>
    </main>
  );
}
