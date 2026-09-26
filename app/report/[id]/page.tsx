import Link from "next/link";
import { notFound } from "next/navigation";
import { baselineAudit } from "../../data/audit-baseline";
import { clientConfig } from "../../../lib/client-config";
import { ExportButton } from "./export-button";

const reportId = "2026-09-06";

const systemSignals = [
  {
    title: "Misurazione",
    value: "Attiva",
    text: "Google Analytics 4 è collegato e registra traffico reale dal sito.",
  },
  {
    title: "Copertura Google",
    value: "In consolidamento",
    text: "Search Console è attiva, la sitemap è stata letta e 3 URL strategici sono stati inviati a Google.",
  },
  {
    title: "Baseline SEO",
    value: `${baselineAudit.globalScore}/100`,
    text: "Il primo score resta il riferimento per confrontare gli audit successivi.",
  },
];

const recommendations = [
  {
    title: "Controllo indicizzazione",
    text: "Verificare l’esito della richiesta per configuratore, FAQ e Lavora con noi.",
  },
  {
    title: "Lead e conversioni",
    text: "Definire quali eventi GA4 rappresentano un contatto commerciale reale.",
  },
  {
    title: "Proposta operativa",
    text: "Scegliere il primo pacchetto da proporre: contenuti strategici, pagine territoriali o authority.",
  },
];

export function generateStaticParams() {
  return [{ id: reportId }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return {
    title:
      id === reportId
        ? `Report Rilevazione SEO | ${clientConfig.productName}`
        : `Report non trovato | ${clientConfig.productName}`,
    description: `Report operativo SEO ${clientConfig.brandEyebrow}`,
  };
}

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (id !== reportId) {
    notFound();
  }

  return (
    <main className="dashboard report-page">
      <header className="report-header">
        <div className="section-inner report-header-inner">
          <div>
            <Link className="back-link" href="/">
              Torna alla dashboard
            </Link>
            <span className="eyebrow">Rilevazione SEO</span>
            <h1>Report {clientConfig.brandEyebrow}</h1>
            <p className="hero-copy">
              Stato del sito al {baselineAudit.performance.updatedAt}, con dati
              raccolti da Analytics, Search Console e baseline SEO.
            </p>
          </div>
          <div className="report-actions">
            <span>{baselineAudit.domain}</span>
            <ExportButton />
          </div>
        </div>
      </header>

      <section className="content-section">
        <div className="section-inner report-grid">
          <section className="report-panel report-summary">
            <span className="eyebrow">Sintesi</span>
            <h2>Il sistema è pronto per il servizio on demand.</h2>
            <p>
              La misurazione è attiva, Search Console è presidiata e la baseline
              SEO di maggio 2026 è stata trasformata in un punto di confronto.
              Il lavoro successivo non è “guardare dati”, ma decidere quali
              azioni finanziare.
            </p>
          </section>

          <section className="report-panel">
            <span className="eyebrow">Dati rilevati</span>
            <div className="report-signal-list">
              {systemSignals.map((signal) => (
                <article className="report-signal" key={signal.title}>
                  <span>{signal.title}</span>
                  <strong>{signal.value}</strong>
                  <p>{signal.text}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="report-panel">
            <span className="eyebrow">Interpretazione</span>
            <div className="report-table">
              {baselineAudit.performance.items.map((item) => (
                <article className="report-row" key={item.id}>
                  <div>
                    <span>{item.title}</span>
                    <strong>{item.value}</strong>
                  </div>
                  <p>{item.meaning}</p>
                  <em>{item.status}</em>
                </article>
              ))}
            </div>
          </section>

          <section className="report-panel">
            <span className="eyebrow">Prossime priorità operative</span>
            <div className="recommendation-list">
              {recommendations.map((item) => (
                <article className="recommendation" key={item.title}>
                  <h2>{item.title}</h2>
                  <p>{item.text}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
