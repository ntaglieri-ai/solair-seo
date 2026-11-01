import { WeeklyBars } from "../../components/weekly-bars";
import { hasComparableCoverage } from "../../data/home-overview";
import { getConfigurator } from "../../../lib/service-read";
import { AuditScore } from "../../components/audit-score";
import {
  getGa4Totals,
  getGscMonthly,
  getGscTop,
  getGscTotals,
  getGscWeekly,
  getRecentRuns,
  getLatestAttempts,
  type GscTopRow,
  type RunKind,
  type RunSummary,
} from "../../../lib/engine/read";
import { safeRead } from "../../../lib/engine/safe";
import {
  formatDate,
  formatDateTime,
  formatDecimal,
  formatDelta,
  formatInt,
  formatPercent,
  formatShortDate,
  shortPath,
} from "../../../lib/format";
import styles from "./live.module.css";

/** Sezioni che leggono i dati raccolti dal motore (lib/engine). */

const KIND_LABEL: Record<RunKind, string> = {
  baseline: "Baseline",
  gsc: "Search Console",
  ga4: "Analytics 4",
  onpage: "Analisi on-page",
  audit: "Audit live",
  evidence: "Raccolta incrociata",
  technical: "Scansione tecnica sito",
  analysis: "Analisi opportunità",
};

const TRIGGER_LABEL: Record<RunSummary["trigger"], string> = {
  seed: "Import",
  cron: "Automatica",
  manual: "Manuale",
};

const STATUS_LABEL: Record<RunSummary["status"], string> = {
  ok: "Riuscita",
  error: "Fallita",
  running: "In corso",
};

function Unavailable() {
  return (
    <div className={styles.empty}>
      Dati non disponibili: il database non ha risposto. Riprova tra poco.
    </div>
  );
}

function Tile({
  label,
  value,
  previous,
  delta,
  partial = false,
}: {
  label: string;
  value: string;
  previous: string;
  delta: ReturnType<typeof formatDelta>;
  /** Periodo precedente coperto solo in parte: la variazione sarebbe fuorviante. */
  partial?: boolean;
}) {
  return (
    <div className={styles.tile}>
      <span className={styles.tileLabel}>{label}</span>
      <span className={styles.tileValue}>{value}</span>
      <span className={styles.tileCompare}>
        {delta && !partial && (
          <span className={styles.delta} data-trend={delta.trend}>
            {delta.text}
          </span>
        )}
        <span>
          prima: {previous}
          {partial && " (dati parziali)"}
        </span>
      </span>
    </div>
  );
}

function TopTable({
  caption,
  firstColumn,
  rows,
  formatKey,
}: {
  caption: string;
  firstColumn: string;
  rows: GscTopRow[];
  formatKey: (key: string) => string;
}) {
  return (
    <div className={`${styles.panel} ${styles.tableWrap}`}>
      <table className={styles.table}>
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{firstColumn}</th>
            <th scope="col">Clic</th>
            <th scope="col">Impr.</th>
            <th scope="col">CTR</th>
            <th scope="col">Pos.</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <td title={row.key}>{formatKey(row.key)}</td>
              <td>{formatInt(row.clicks)}</td>
              <td>{formatInt(row.impressions)}</td>
              <td>{formatPercent(row.ctr)}</td>
              <td>{formatDecimal(row.position)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Performance: numeri veri di Search Console. */
export async function PerformanceLive({ siteId }: { siteId: string }) {
  const data = await safeRead("performance", async () => {
    const [totals, weekly, queries, pages] = await Promise.all([
      getGscTotals(siteId, 28),
      getGscWeekly(siteId, 26),
      getGscTop(siteId, "query", 10),
      getGscTop(siteId, "page", 10),
    ]);
    return { totals, weekly, queries, pages };
  });

  if (!data) return <Unavailable />;
  const { totals, weekly, queries, pages } = data;
  if (!totals.lastDate) {
    return (
      <div className={styles.empty}>
        Nessun dato Search Console archiviato. La prima raccolta automatica li importerà.
      </div>
    );
  }

  const { current, previous } = totals;

  return (
    <>
      <section className={styles.block} aria-labelledby="gsc-kpi">
        <div className={styles.heading}>
          <h2 id="gsc-kpi">Search Console · ultimi 28 giorni</h2>
          <span>Dati fino al {formatDate(totals.lastDate)}, confronto con i 28 giorni precedenti</span>
        </div>
        <div className={styles.tiles}>
          <Tile
            label="Clic"
            value={formatInt(current.clicks)}
            previous={formatInt(previous.clicks)}
            delta={formatDelta(current.clicks, previous.clicks)}
            partial={!hasComparableCoverage(totals,28)}
          />
          <Tile
            label="Impressioni"
            value={formatInt(current.impressions)}
            previous={formatInt(previous.impressions)}
            delta={formatDelta(current.impressions, previous.impressions)}
            partial={!hasComparableCoverage(totals,28)}
          />
          <Tile
            label="CTR medio"
            value={formatPercent(current.ctr)}
            previous={formatPercent(previous.ctr)}
            delta={formatDelta(current.ctr, previous.ctr)}
            partial={!hasComparableCoverage(totals,28)}
          />
          <Tile
            label="Posizione media"
            value={formatDecimal(current.position)}
            previous={formatDecimal(previous.position)}
            delta={formatDelta(current.position, previous.position, { lowerIsBetter: true })}
            partial={!hasComparableCoverage(totals,28)}
          />
        </div>
        <p className={styles.note}>
          Per la posizione media un valore più basso è migliore: la variazione è verde quando la
          posizione scende.
        </p>
      </section>

      <section className={styles.block} aria-labelledby="gsc-weekly">
        <div className={styles.heading}>
          <h2 id="gsc-weekly">Clic per settimana</h2>
          <span>Ultime 26 settimane</span>
        </div>
        <div className={styles.panel}>
          <WeeklyBars
            valueLabel="clic"
            points={weekly.map((week) => ({
              start: week.start,
              label: `Settimana del ${formatShortDate(week.start)}`,
              value: week.clicks,
              detail: `${formatInt(week.impressions)} impressioni`,
            }))}
          />
        </div>
      </section>

      <section className={styles.block} aria-labelledby="gsc-top">
        <div className={styles.heading}>
          <h2 id="gsc-top">Query e pagine principali</h2>
          <span>
            {queries.periodStart && queries.periodEnd
              ? `Dal ${formatShortDate(queries.periodStart)} al ${formatShortDate(queries.periodEnd)}`
              : "Ultima raccolta"}
          </span>
        </div>
        <div className={styles.tables}>
          <TopTable caption="Query" firstColumn="Query" rows={queries.rows} formatKey={(key) => key} />
          <TopTable caption="Pagine" firstColumn="Pagina" rows={pages.rows} formatKey={shortPath} />
        </div>
      </section>
    </>
  );
}

/** Performance: sessioni e conversioni da Analytics 4. */
export async function AnalyticsLive({ siteId }: { siteId: string }) {
  const data = await safeRead("ga4", async () => {
    const [totals, configurator] = await Promise.all([
      getGa4Totals(siteId, 28),
      getConfigurator(siteId),
    ]);
    return { totals, configurator };
  });
  if (!data) return <Unavailable />;
  const { totals, configurator } = data;
  if (!totals.lastDate) {
    return (
      <section className={styles.block} aria-labelledby="ga4-kpi">
        <div className={styles.heading}>
          <h2 id="ga4-kpi">Analytics 4</h2>
        </div>
        <div className={styles.empty}>
          Nessun dato GA4 archiviato: la raccolta partirà appena la proprietà sarà collegata.
        </div>
      </section>
    );
  }

  const { current, previous } = totals;
  const comparable=hasComparableCoverage(totals,28);
  const configured=configurator?.data;
  const configCurrent=configured?.current, configPrevious=configured?.previous;
  const configComparable=!!configCurrent?.reliable&&!!configPrevious?.reliable;
  const configRows=configCurrent ? [
    {label:"Visualizzazioni delle pagine del configuratore",current:configCurrent.pageViews,previous:configPrevious?.pageViews},
    {label:"Interazioni di avvio",current:configCurrent.events.start_configurator,previous:configPrevious?.events.start_configurator},
    {label:"Conferme di completamento",current:configCurrent.events.complete_configurator,previous:configPrevious?.events.complete_configurator},
    {label:"Richieste inviate",current:configCurrent.events.lead_submit,previous:configPrevious?.events.lead_submit},
  ]:[];

  return (
    <section className={styles.block} aria-labelledby="ga4-kpi">
      <div className={styles.heading}>
        <h2 id="ga4-kpi">Traffico da ricerca organica · ultimi 28 giorni</h2>
        <span>Dati fino al {formatDate(totals.lastDate)}, confronto con i 28 giorni precedenti</span>
      </div>
      <div className={styles.tiles}>
        <Tile
          label="Sessioni da ricerca organica"
          value={formatInt(current.sessions)}
          previous={formatInt(previous.sessions)}
          delta={formatDelta(current.sessions, previous.sessions)}
          partial={!comparable}
        />
        <Tile
          label="Tasso di coinvolgimento"
          value={formatPercent(current.engagementRate)}
          previous={formatPercent(previous.engagementRate)}
          delta={formatDelta(current.engagementRate, previous.engagementRate)}
          partial={!comparable}
        />
      </div>
      <p className={styles.note}>Fonte: Analytics 4, canale Organic Search (tutti i motori di ricerca). Le sessioni includono anche i ritorni; non sono persone uniche. I clic di Search Console e le sessioni Analytics sono misure diverse.</p>
      <div className={styles.heading}><h2>Il configuratore nella ricerca organica</h2><span>{configCurrent?`${formatDate(configCurrent.from)} – ${formatDate(configCurrent.to)}`:"Periodo non disponibile"}</span></div>
      {!configCurrent?<p className={styles.empty}>{configured?.error??"Statistiche del configuratore non ancora raccolte."}</p>:<>
      <div className={`${styles.panel} ${styles.tableWrap}`}>
        <table className={styles.table}>
          <caption>Utilizzo del configuratore · Analytics, Organic Search</caption>
          <thead>
            <tr>
              <th scope="col">Azione</th>
              <th scope="col">Ultimi 28 giorni</th>
              <th scope="col">28 giorni prima</th>
            </tr>
          </thead>
          <tbody>
            {configRows.map((event) => (
              <tr key={event.label}>
                <td>{event.label}</td>
                <td>{configCurrent.reliable?formatInt(event.current??0):"N/D · dati limitati"}</td>
                <td>{configComparable?formatInt(event.previous??0):"N/D"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={styles.note}>
        Sono conteggi di eventi, compresi quelli ripetuti, non utenti unici. Le visualizzazioni possono comprendere la pagina contenitore e quella del configuratore incorporato.
        Le interazioni di avvio possono scattare sia sul link sia all’inizio della compilazione: non misurano avvii unici.
        Completamento e richiesta inviata si riferiscono allo stesso invio riuscito: non vanno sommati. Nessun tasso di conversione viene calcolato da questi eventi.
      </p>
      <details className={styles.panel}><summary>Come vengono misurate queste statistiche</summary><p className={styles.note}>Verifica del codice del sito: start_configurator su link e passaggio iniziale; lead_submit dopo una risposta positiva del servizio di invio; complete_configurator nella schermata di conferma. La ricezione commerciale non è stata verificata con un invio di prova. I conteggi riflettono soltanto gli eventi che Analytics ha potuto registrare.</p><p className={styles.note}>Raccolta: {configurator&&formatDateTime(configurator.collectedAt)} · fuso proprietà: {configCurrent.timeZone??"non disponibile"}.</p>{[...new Set([...configCurrent.limitations,...(configPrevious?.limitations??[])])].map((note)=><p className={styles.note} key={note}>{note}</p>)}</details>
      </>}
    </section>
  );
}

/** Storico: andamento mensile, score nel tempo e registro delle rilevazioni. */
export async function HistoryLive({
  siteId,
}: {
  siteId: string;
}) {
  const data = await safeRead("storico", async () => {
    const [monthly, runs] = await Promise.all([
      getGscMonthly(siteId),
      getRecentRuns(siteId, 20),
    ]);
    return { monthly, runs };
  });

  if (!data) return <Unavailable />;
  const { monthly, runs } = data;

  return (
    <>
      <section className={styles.block} aria-labelledby="history-monthly">
        <div className={styles.heading}>
          <h2 id="history-monthly">Search Console mese per mese</h2>
          <span>Il mese in corso è parziale</span>
        </div>
        {monthly.length === 0 ? (
          <div className={styles.empty}>Nessun dato Search Console archiviato.</div>
        ) : (
          <div className={`${styles.panel} ${styles.tableWrap}`}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Mese</th>
                  <th scope="col">Clic</th>
                  <th scope="col">Impressioni</th>
                  <th scope="col">Posizione media</th>
                </tr>
              </thead>
              <tbody>
                {[...monthly].reverse().map((month) => (
                  <tr key={month.start}>
                    <td>
                      {new Date(`${month.start}T12:00:00Z`).toLocaleDateString("it-IT", {
                        month: "long",
                        year: "numeric",
                      })}
                    </td>
                    <td>{formatInt(month.clicks)}</td>
                    <td>{formatInt(month.impressions)}</td>
                    <td>{month.position === null ? "—" : formatDecimal(month.position)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={styles.block} aria-labelledby="history-score">
        <div className={styles.heading}>
          <h2 id="history-score">Punteggi degli audit SEO</h2>
          <span>Ultimo audit e andamento confrontabile</span>
        </div>
        <AuditScore siteId={siteId} expanded />
      </section>

      <RunLog runs={runs} title="Registro rilevazioni" subtitle={`Ultime ${runs.length}`} id="history-runs" />
    </>
  );
}

function RunLog({
  runs,
  title,
  subtitle,
  id,
}: {
  runs: RunSummary[];
  title: string;
  subtitle: string;
  id: string;
}) {
  return (
    <section className={styles.block} aria-labelledby={id}>
      <div className={styles.heading}>
        <h2 id={id}>{title}</h2>
        <span>{subtitle}</span>
      </div>
      <div className={`${styles.panel} ${styles.tableWrap}`}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Tipo</th>
              <th scope="col">Avvio</th>
              <th scope="col">Origine</th>
              <th scope="col">Esito</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <tr key={run.id}>
                <td>
                  {KIND_LABEL[run.kind]}
                  {run.error && <div className={styles.error}>{run.error}</div>}
                </td>
                <td>{formatDateTime(run.startedAt)}</td>
                <td>{TRIGGER_LABEL[run.trigger]}</td>
                <td>
                  <span className={styles.status} data-status={run.status}>
                    {STATUS_LABEL[run.status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** Tracking: stato della raccolta automatica, ultimo tentativo per tipo. */
export async function CollectionStatus({ siteId }: { siteId: string }) {
  const runs = await safeRead("stato raccolta", () => getLatestAttempts(siteId));
  if (!runs) return <Unavailable />;

  const latestByKind = (["gsc", "ga4", "evidence", "technical", "analysis", "onpage", "audit"] as const)
    .map((kind) => runs.find((run) => run.kind === kind))
    .filter((run) => run !== undefined);

  return (
    <RunLog
      runs={latestByKind}
      title="Raccolta dati"
      subtitle="Ultimo tentativo per fonte"
      id="collection-status"
    />
  );
}
