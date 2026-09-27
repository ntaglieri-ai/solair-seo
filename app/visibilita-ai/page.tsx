import type { Metadata } from "next";
import Image from "next/image";
import { SiteHeader } from "../components/site-header";
import { fontVariables } from "../fonts";
import sampleData from "../data/ai-visibility.sample.json";
import { summarizeAiVisibility, type AiVisibilityData, type CellState } from "../../lib/ai-visibility";
import { clientConfig } from "../../lib/client-config";
import { formatDate, formatDecimal } from "../../lib/format";
import styles from "./visibilita.module.css";

export const metadata: Metadata = {
  title: `Visibilità AI · ${clientConfig.productName}`,
};

const CELL: Record<CellState, { label: string; className: string }> = {
  cited: { label: "Citata", className: styles.cellCited },
  competitors: { label: "Concorrenti", className: styles.cellCompetitors },
  none: { label: "—", className: styles.cellNone },
};

function SampleBadge() {
  return <span className={styles.sampleBadge}>Dati di esempio</span>;
}

export default function VisibilitaAi() {
  const summary = summarizeAiVisibility(sampleData as AiVisibilityData);
  if (!summary) return null;

  const engineNames = new Map(summary.engines.map((engine) => [engine.id, engine.name]));
  const { topCompetitor } = summary;
  const maxQuestions = Math.max(1, ...summary.companies.map((company) => company.questions));
  const citedDiff =
    summary.previousCitedQuestions === null ? null : summary.citedQuestions - summary.previousCitedQuestions;

  return (
    <main className={`${styles.page} ${fontVariables}`}>
      <section className={styles.hero} aria-labelledby="page-title">
        {/* Energy Hill, Taipei — foto di Anders J su Unsplash (hxUcl0nUsIY) */}
        <Image
          className={styles.heroPhoto}
          src="https://images.unsplash.com/photo-1594818379496-da1e345b0ded?ixlib=rb-4.1.0&q=80&fm=jpg&cs=srgb"
          alt=""
          fill
          priority
          sizes="100vw"
        />
        <SiteHeader current="/visibilita-ai" />
        <div className={styles.heroBody}>
          <div className={styles.heroText}>
            <span className={styles.eyebrow}>GEO · Generative Engine Optimization</span>
            <div className={styles.titleRow}>
              <h1 id="page-title">Visibilità AI</h1>
              {summary.sample && <SampleBadge />}
            </div>
            <p>Quando un cliente chiede all&apos;intelligenza artificiale, esce {summary.brand}?</p>
          </div>
          <div className={styles.heroMeta}>
            <span>Ultima rilevazione: {formatDate(summary.collectedAt)}</span>
            <span>{summary.engines.map((engine) => engine.name).join(" · ")}</span>
          </div>
        </div>
      </section>

      <ul className={styles.metrics} aria-label="Sintesi">
        <li>
          <span className={styles.metricLabel}>Domande in cui Solair è citata</span>
          <div className={styles.metricValue}>
            <strong>
              {summary.citedQuestions}/{summary.totalQuestions}
            </strong>
            {citedDiff !== null && (
              <span className={citedDiff > 0 ? styles.trendUp : citedDiff < 0 ? styles.trendDown : styles.muted}>
                {citedDiff === 0 ? "invariato" : `${citedDiff > 0 ? "+" : "−"}${Math.abs(citedDiff)}`} vs mese scorso
              </span>
            )}
          </div>
        </li>
        <li>
          <span className={styles.metricLabel}>Posizione media quando citata</span>
          <div className={styles.metricValue}>
            <strong>{summary.averagePosition === null ? "—" : formatDecimal(summary.averagePosition)}</strong>
            <span className={styles.muted}>su una lista di aziende</span>
          </div>
        </li>
        <li>
          <span className={styles.metricLabel}>Concorrente più citato</span>
          <div className={styles.metricValue}>
            <strong>{topCompetitor?.name ?? "—"}</strong>
            {topCompetitor && (
              <span className={styles.muted}>
                {topCompetitor.questions}/{summary.totalQuestions} domande
              </span>
            )}
          </div>
        </li>
      </ul>

      <section className={styles.questions} aria-labelledby="questions-title">
        <div className={styles.sectionHeading}>
          <div className={styles.sectionIntro}>
            <div className={styles.titleRow}>
              <h2 id="questions-title">Domanda per domanda</h2>
              {summary.sample && <SampleBadge />}
            </div>
            <p>Le domande che fanno i clienti di Solair, poste ogni settimana a ciascun motore.</p>
          </div>
          <ul className={styles.legend} aria-label="Legenda">
            <li>
              <span className={`${styles.swatch} ${styles.swatchCited}`} aria-hidden="true" />
              Solair citata
            </li>
            <li>
              <span className={`${styles.swatch} ${styles.swatchCompetitors}`} aria-hidden="true" />
              Solo concorrenti
            </li>
            <li>
              <span className={`${styles.swatch} ${styles.swatchNone}`} aria-hidden="true" />
              Nessuna azienda
            </li>
          </ul>
        </div>

        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Domanda</th>
              {summary.engines.map((engine) => (
                <th scope="col" key={engine.id}>
                  {engine.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {summary.rows.map((row) => (
              <tr key={row.question}>
                <th scope="row">{row.question}</th>
                {row.cells.map((cell) => (
                  <td key={cell.engine} data-engine={engineNames.get(cell.engine)}>
                    <span className={`${styles.cell} ${CELL[cell.state].className}`}>
                      {CELL[cell.state].label}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className={styles.panels}>
        <div className={styles.panel}>
          <div className={styles.panelIntro}>
            <h3>Chi esce al posto di Solair</h3>
            <p>Aziende citate nelle risposte, su {summary.totalQuestions} domande.</p>
          </div>
          <ul className={styles.bars}>
            {summary.companies.map((company) => (
              <li key={company.name}>
                <div className={styles.barLabel}>
                  <span className={company.isBrand ? styles.brandName : undefined}>{company.name}</span>
                  <span className={styles.muted}>{company.questions}</span>
                </div>
                <div className={styles.barTrack}>
                  <div
                    className={company.isBrand ? styles.barBrand : styles.barRival}
                    style={{ width: `${(company.questions / maxQuestions) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.panel}>
          <div className={styles.panelIntro}>
            <h3>Le fonti che le AI usano</h3>
            <p>Siti citati più spesso: è qui che conviene essere presenti.</p>
          </div>
          <ol className={styles.sources}>
            {summary.sources.map((source, index) => (
              <li key={source.domain}>
                <span className={styles.sourceNumber}>{String(index + 1).padStart(2, "0")}</span>
                <span className={styles.sourceDomain}>{source.domain}</span>
                <span className={styles.sourceCount}>
                  citata in {source.answers} {source.answers === 1 ? "risposta" : "risposte"}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </main>
  );
}
