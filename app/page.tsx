import Link from "next/link";
import { baselineAudit } from "./data/audit-baseline";

const systemItems = [
  {
    label: "Analytics 4",
    value: "Tracciamento attivo",
    note: "Analytics è collegato e registra traffico reale.",
  },
  {
    label: "Search Console",
    value: "Proprietà verificata",
    note: "La sitemap è acquisita e la copertura Google è sotto osservazione.",
  },
  {
    label: "Dashboard",
    value: "Aggiornamento on demand",
    note: "I dati vengono consolidati quando viene richiesto un nuovo audit.",
  },
];

const futureActions = [
  "Verificare l’esito dell’indicizzazione richiesta per configuratore, FAQ e Lavora con noi.",
  "Confermare quali eventi GA4 entrano nel servizio come lead commerciali.",
  "Definire il primo livello operativo: contenuti strategici, pagine territoriali o authority.",
];

export default function Home() {
  return (
    <main className="dashboard">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <strong>Solair SEO</strong>
            <span>Audit Hub</span>
          </div>
          <div className="audit-meta" aria-label="Dati progetto">
            <span>{baselineAudit.client}</span>
            <span>{baselineAudit.domain}</span>
          </div>
        </div>
      </header>

      <section className="hero compact-hero" aria-labelledby="dashboard-title">
        <div className="section-inner">
          <div>
            <span className="eyebrow">Solair Group</span>
            <h1 id="dashboard-title">Quadro operativo SEO</h1>
            <p className="hero-copy">
              Stato rilevato, segnali misurabili e proposte di lavoro per far
              crescere la presenza organica nel tempo.
            </p>
          </div>
        </div>
      </section>

      <section className="content-section">
        <div className="section-inner">
          <div className="decision-stack">
            <details className="decision-block decision-block-system" open>
              <summary>
                <span>
                  <strong>Stato sistema</strong>
                  <small>Misurazione, Search Console e dashboard</small>
                </span>
                <span className="summary-status">Presidiato</span>
              </summary>
              <div className="decision-content">
                <div className="simple-grid">
                  {systemItems.map((item) => (
                    <article className="simple-card" key={item.label}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                      <p>{item.note}</p>
                    </article>
                  ))}
                </div>
              </div>
            </details>

            <details className="decision-block decision-block-performance">
              <summary>
                <span>
                  <strong>Performance a una data</strong>
                  <small>Snapshot: {baselineAudit.performance.updatedAt}</small>
                </span>
                <span className="summary-status summary-status-neutral">Baseline</span>
              </summary>
              <div className="decision-content">
                <div className="performance-list">
                  {baselineAudit.performance.items.map((item) => (
                    <div className="performance-row" key={item.id}>
                      <span>{item.title}</span>
                      <strong>{item.value}</strong>
                      <em>{item.status}</em>
                    </div>
                  ))}
                </div>
              </div>
            </details>

            <details className="decision-block decision-block-actions">
              <summary>
                <span>
                  <strong>Suggerimenti per il futuro</strong>
                  <small>Interventi da proporre nel prossimo step</small>
                </span>
                <span className="summary-status summary-status-warning">Da quotare</span>
              </summary>
              <div className="decision-content">
                <ol className="action-list">
                  {futureActions.map((action) => (
                    <li key={action}>{action}</li>
                  ))}
                </ol>
              </div>
            </details>
          </div>
        </div>
      </section>

      <section className="content-section technical-menu" aria-label="Menu dettagli">
        <div className="section-inner">
          <div className="section-heading">
            <h2>Archivio</h2>
            <span>Audit, tracking e storico</span>
          </div>
          <nav className="link-menu">
            <Link href="/sezioni/executive-summary">Audit baseline</Link>
            <Link href="/sezioni/performance">Performance</Link>
            <Link href="/sezioni/tracking-setup">Tracking</Link>
            <Link href="/sezioni/action-plan">Action plan</Link>
            <Link href="/sezioni/historical-comparison">Storico</Link>
          </nav>
        </div>
      </section>
    </main>
  );
}
