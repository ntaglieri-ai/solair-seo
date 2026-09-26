import { WeeklyBars } from "../../components/weekly-bars";
import {
  getGscMonthly,
  getGscTop,
  getGscTotals,
  getGscWeekly,
  getOnPageHistory,
  getRecentRuns,
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
  onpage: "Analisi on-page",
  audit: "Audit live",
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
}: {
  label: string;
  value: string;
  previous: string;
  delta: ReturnType<typeof formatDelta>;
}) {
  return (
    <div className={styles.tile}>
      <span className={styles.tileLabel}>{label}</span>
      <span className={styles.tileValue}>{value}</span>
      <span className={styles.tileCompare}>
        {delta && (
          <span className={styles.delta} data-trend={delta.trend}>
            {delta.text}
          </span>
        )}
        <span>prima: {previous}</span>
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
          />
          <Tile
            label="Impressioni"
            value={formatInt(current.impressions)}
            previous={formatInt(previous.impressions)}
            delta={formatDelta(current.impressions, previous.impressions)}
          />
          <Tile
            label="CTR medio"
            value={formatPercent(current.ctr)}
            previous={formatPercent(previous.ctr)}
            delta={formatDelta(current.ctr, previous.ctr)}
          />
          <Tile
            label="Posizione media"
            value={formatDecimal(current.position)}
            previous={formatDecimal(previous.position)}
            delta={formatDelta(current.position, previous.position, { lowerIsBetter: true })}
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

/** Storico: andamento mensile, score nel tempo e registro delle rilevazioni. */
export async function HistoryLive({
  siteId,
  baseline,
}: {
  siteId: string;
  baseline: { label: string; date: string; score: number };
}) {
  const data = await safeRead("storico", async () => {
    const [monthly, scans, runs] = await Promise.all([
      getGscMonthly(siteId),
      getOnPageHistory(siteId, 20),
      getRecentRuns(siteId, 20),
    ]);
    return { monthly, scans, runs };
  });

  if (!data) return <Unavailable />;
  const { monthly, scans, runs } = data;

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
          <h2 id="history-score">Score nel tempo</h2>
          <span>Analisi on-page della home e audit live</span>
        </div>
        <div className={`${styles.panel} ${styles.tableWrap}`}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Rilevazione</th>
                <th scope="col">Data</th>
                <th scope="col">Pagina</th>
                <th scope="col">Score</th>
              </tr>
            </thead>
            <tbody>
              {scans.map((scan) => (
                <tr key={scan.runId}>
                  <td>{KIND_LABEL[scan.kind]}</td>
                  <td>{formatDateTime(scan.scannedAt)}</td>
                  <td title={scan.url}>{shortPath(scan.url)}</td>
                  <td>{scan.score}/100</td>
                </tr>
              ))}
              <tr>
                <td>{baseline.label}</td>
                <td>{baseline.date}</td>
                <td>Sito intero</td>
                <td>{baseline.score}/100</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className={styles.note}>
          La baseline è un audit manuale sull&apos;intero sito; gli score successivi sono calcolati in
          automatico sulla singola pagina. Sono confrontabili tra loro solo quelli automatici.
        </p>
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
  const runs = await safeRead("stato raccolta", () => getRecentRuns(siteId, 50));
  if (!runs) return <Unavailable />;

  const latestByKind = (["gsc", "onpage", "audit"] as const)
    .map((kind) => runs.find((run) => run.kind === kind))
    .filter((run): run is RunSummary => Boolean(run));

  return (
    <RunLog
      runs={latestByKind}
      title="Raccolta dati"
      subtitle="Ultimo tentativo per fonte"
      id="collection-status"
    />
  );
}
