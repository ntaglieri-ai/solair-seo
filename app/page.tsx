import Link from "next/link";
import { baselineAudit } from "./data/audit-baseline";

const systemItems = [
  {
    label: "Google Analytics",
    value: "Attivo",
    note: "GA4 riceve dati dal sito.",
  },
  {
    label: "Search Console",
    value: "Attivo",
    note: "Sitemap letta e proprieta' verificata.",
  },
  {
    label: "Import automatico dati",
    value: "Non attivo",
    note: "Per ora il controllo resta on demand.",
  },
];

const futureActions = [
  "Attendere la nuova scansione Google per configuratore, FAQ e Lavora con noi.",
  "Validare in GA4 gli eventi che contano davvero come lead.",
  "Decidere il primo pacchetto operativo: contenuti, pagine territoriali o authority.",
];

export default function Home() {
  return (
    <main className="dashboard">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <strong>Solair SEO</strong>
            <span>Cruscotto operativo</span>
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
            <span className="eyebrow">Dashboard</span>
            <h1 id="dashboard-title">Stato e prossime azioni</h1>
            <p className="hero-copy">
              Una lettura semplice: cosa sappiamo oggi, come stanno andando i
              segnali principali, cosa proporre come lavoro successivo.
            </p>
          </div>
        </div>
      </section>

      <section className="content-section">
        <div className="section-inner">
          <div className="decision-stack">
            <details className="decision-block" open>
              <summary>
                <span>
                  <strong>Stato sistema</strong>
                  <small>Setup tecnico attuale</small>
                </span>
                <span className="summary-status">Operativo</span>
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

            <details className="decision-block">
              <summary>
                <span>
                  <strong>Performance a una data</strong>
                  <small>Aggiornato: {baselineAudit.performance.updatedAt}</small>
                </span>
                <span className="summary-status">4 segnali</span>
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

            <details className="decision-block">
              <summary>
                <span>
                  <strong>Suggerimenti per il futuro</strong>
                  <small>Prossime azioni proponibili</small>
                </span>
                <span className="summary-status">Priorit&agrave;</span>
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
            <h2>Dettagli</h2>
            <span>Solo se vuoi approfondire</span>
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
