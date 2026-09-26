"use client";

import { useState } from "react";
import Link from "next/link";

type ScanResult = {
  url: string;
  domain: string;
  gscProperty: string;
  scannedAt: string;
  score: number;
  deductions: string[];
  onpage: {
    title: string;
    titleLength: number;
    metaDescription: string;
    metaDescriptionLength: number;
    canonical: string;
    h1: string[];
    h2: string[];
    imagesWithoutAlt: string[];
    internalLinks: number;
    externalLinks: number;
    schemaTypes: string[];
  };
  gsc: {
    keywords: { keys: string[]; clicks: number; impressions: number; ctr: number; position: number }[];
    pages: { keys: string[]; clicks: number; impressions: number; ctr: number; position: number }[];
    totalsCurrent: { clicks: number; impressions: number; ctr: number };
    totalsPrevious: { clicks: number; impressions: number; ctr: number };
    period: string;
  };
};

export default function AuditPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);

  async function runScan(e: React.FormEvent) {
    e.preventDefault();
    if (!url) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/scan?url=${encodeURIComponent(url)}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Errore durante la scansione.");
      } else {
        setResult(data);
      }
    } catch {
      setError("Impossibile completare la richiesta. Verificare l'URL e riprovare.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="dashboard section-page">
      <section className="detail-hero">
        <div className="section-inner">
          <Link className="back-link" href="/">
            Torna alla panoramica
          </Link>
          <span className="eyebrow">Audit live</span>
          <h1>Nuova scansione SEO</h1>
          <p className="hero-copy">
            Inserisci un URL per una rilevazione on-page e Search Console in tempo reale.
          </p>
        </div>
      </section>

      <section className="content-section">
        <div className="section-inner">
          <form onSubmit={runScan} className="audit-form">
            <input
              type="url"
              required
              placeholder="https://esempio.it"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="audit-form-input"
            />
            <button type="submit" className="export-button" disabled={loading}>
              {loading ? "Scansione in corso..." : "Avvia scansione"}
            </button>
          </form>

          {error && <div className="empty-state" style={{ marginTop: 20, borderColor: "#e08a8a", color: "#a33" }}>{error}</div>}

          {result && (
            <div className="report-grid" style={{ marginTop: 28 }}>
              <section className="report-panel report-summary">
                <span className="eyebrow">{result.domain}</span>
                <h2>Score: {result.score}/100</h2>
                <p>Scansionato il {new Date(result.scannedAt).toLocaleString("it-IT")}</p>
              </section>

              {result.deductions.length > 0 && (
                <section className="report-panel">
                  <span className="eyebrow">Rilievi tecnici</span>
                  <div className="field" style={{ marginTop: 14 }}>
                    <ul>
                      {result.deductions.map((d) => (
                        <li key={d}>{d}</li>
                      ))}
                    </ul>
                  </div>
                </section>
              )}

              <section className="report-panel">
                <span className="eyebrow">On-page</span>
                <div className="field" style={{ marginTop: 14 }}>
                  <ul>
                    <li>Title ({result.onpage.titleLength} char): {result.onpage.title}</li>
                    <li>Meta description ({result.onpage.metaDescriptionLength} char): {result.onpage.metaDescription}</li>
                    <li>Canonical: {result.onpage.canonical || "assente"}</li>
                    <li>H1: {result.onpage.h1.join(", ") || "assente"}</li>
                    <li>Link interni: {result.onpage.internalLinks} · esterni: {result.onpage.externalLinks}</li>
                    <li>Schema.org: {result.onpage.schemaTypes.join(", ") || "assente"}</li>
                  </ul>
                </div>
              </section>

              <section className="report-panel">
                <span className="eyebrow">Search Console — {result.gsc.period}</span>
                <div className="report-signal-list" style={{ marginTop: 14 }}>
                  <article className="report-signal">
                    <span>Click (28gg)</span>
                    <strong>{result.gsc.totalsCurrent.clicks}</strong>
                  </article>
                  <article className="report-signal">
                    <span>Impressioni (28gg)</span>
                    <strong>{result.gsc.totalsCurrent.impressions}</strong>
                  </article>
                  <article className="report-signal">
                    <span>CTR</span>
                    <strong>{result.gsc.totalsCurrent.ctr}%</strong>
                  </article>
                </div>

                {result.gsc.keywords.length > 0 && (
                  <div className="table-scroll" style={{ marginTop: 18 }}>
                    <table className="comparison-table">
                      <thead>
                        <tr>
                          <th>Query</th>
                          <th>Click</th>
                          <th>Impressioni</th>
                          <th>Posizione</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.gsc.keywords.map((k) => (
                          <tr key={k.keys[0]}>
                            <td>{k.keys[0]}</td>
                            <td>{k.clicks}</td>
                            <td>{k.impressions}</td>
                            <td>{k.position.toFixed(1)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {result.gsc.keywords.length === 0 && (
                  <p style={{ marginTop: 14, color: "var(--muted)" }}>
                    Nessun dato Search Console disponibile per questa proprietà (
                    {result.gscProperty}). Verificare che il sito sia verificato sull&apos;account
                    Google collegato.
                  </p>
                )}
              </section>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
