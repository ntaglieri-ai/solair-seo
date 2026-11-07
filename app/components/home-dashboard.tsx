import Link from "next/link";
import { baselineAudit } from "../data/audit-baseline";
import { readHomePerformance } from "../data/home-performance";
import { readHomeGemini } from "../data/home-geo";
import { getGscWeekly } from "../../lib/engine/read";
import { safeRead } from "../../lib/engine/safe";
import { readReport } from "../../lib/report-read";
import { rankActions, reportText } from "../../lib/report-presentation";
import { getDocumentArchive } from "../../lib/report-documents/store";
import { KIND_LABEL } from "../../lib/report-documents/windows";
import { formatDate, formatInt, formatShortDate } from "../../lib/format";
import styles from "./dash.module.css";

const addDays = (day: string, n: number) => new Date(new Date(`${day}T12:00:00Z`).getTime() + n * 86_400_000).toISOString().slice(0, 10);
const nextMonthly = (now = new Date()) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + (now.getUTCDate() >= 4 ? 1 : 0), 4, 12));

/** Vista sul servizio: stato, non commento. Nessun confronto con altri periodi (vivono nel report mensile). */
export async function HomeDashboard() {
  const siteId = baselineAudit.domain;
  const [perf, gemini, docs, report] = await Promise.all([
    readHomePerformance(siteId), safeRead("home Gemini", () => readHomeGemini(siteId)),
    safeRead("home report", () => getDocumentArchive(30)), safeRead("home interventi", () => readReport()),
  ]);
  const { gsc, ga4 } = perf;
  let weeks = (await safeRead("home settimane", () => getGscWeekly(siteId, 14))) ?? [];
  while (weeks.length && weeks[0].clicks === 0 && weeks[0].impressions === 0) weeks = weeks.slice(1);
  if (gsc?.lastDate && new Date(`${gsc.lastDate}T12:00:00Z`).getUTCDay() !== 0) weeks = weeks.slice(0, -1);
  weeks = weeks.slice(-12);
  const week = weeks.at(-1), peak = Math.max(1, ...weeks.map(w => w.clicks));
  const summary = gemini?.summary, last = docs?.[0];
  const actions = rankActions((report?.data.opportunities ?? []).filter(a => typeof a.action === "string" && typeof a.page === "string"));
  const high = actions.filter(a => a.priority === "high").length;
  const hasStartup = !!docs?.some(d => d.kind === "startup");
  return (
    <section id="stato" className={styles.dash} aria-label="Stato del servizio">
      <div className={styles.cards}>
        <article className={styles.card}>
          <div className={styles.lab}>Google<span className={styles.pill} data-tone={gsc?.lastDate ? undefined : "grey"}>{gsc?.lastDate ? "Attivo" : "Nessun dato"}</span></div>
          <div className={styles.big}>{week ? formatInt(week.clicks) : "—"}<small>clic</small></div>
          <p className={styles.cap}>{week ? `Persone arrivate da Google nell’ultima settimana completa (${formatShortDate(week.start)} – ${formatShortDate(addDays(week.start, 6))})` : "Servono dati di almeno una settimana completa."}</p>
          {weeks.length >= 4 && <div className={styles.spark} role="img" aria-label="Clic per settimana, ultime settimane">{weeks.map(w => <i key={w.start} style={{ height: `${Math.max(6, (w.clicks / peak) * 100)}%` }} />)}</div>}
        </article>
        <article className={styles.card}>
          <div className={styles.lab}>Risposte AI<span className={styles.pill} data-tone={!summary ? "grey" : summary.nonBrandMentioned === 0 ? "amber" : undefined}>{!summary ? "Non rilevato" : summary.nonBrandMentioned === 0 ? "Da migliorare" : "Presente"}</span></div>
          <div className={styles.big}>{summary ? summary.nonBrandMentioned : "—"}<small>{summary ? `/ ${summary.nonBrandComplete}` : ""}</small></div>
          <p className={styles.cap}>Risposte di Gemini che nominano Solair a un cliente che non la conosce</p>
          <div className={styles.btns}><Link className={styles.btn} href="/visibilita-ai">Vedi le risposte</Link></div>
        </article>
        <article className={styles.card}>
          <div className={styles.lab}>Ultimo report</div>
          <div className={styles.kind}>{last ? KIND_LABEL[last.kind] : "In preparazione"}</div>
          <p className={styles.cap}>{last ? `${formatDate(last.createdAt)} · PDF pronto` : "Il primo report non è ancora disponibile."}<br />Prossimo mensile: {formatDate(nextMonthly())}</p>
          <div className={styles.btns}>{last ? <><Link className={styles.btn} data-primary href="/report/ultimo">Apri</Link><a className={styles.btn} href={`/api/reports/${last.id}/pdf`}>Scarica PDF</a></> : <Link className={styles.btn} href="/report">Vai ai report</Link>}</div>
        </article>
        <article className={styles.card}>
          <div className={styles.lab}>Azioni<span className={styles.pill} data-tone={high ? "amber" : "grey"}>{high ? `${high} prioritari${high === 1 ? "a" : "e"}` : "Nessuna urgente"}</span></div>
          <div className={styles.big}>{actions.length}<small>da fare</small></div>
          <p className={styles.cap}>Interventi proposti dall’ultima analisi, decisi da Solair e applicati da Mostag</p>
          <div className={styles.btns}><Link className={styles.btn} href="/interventi">Vedi le azioni</Link></div>
        </article>
      </div>
      <div className={styles.lower}>
        <section className={styles.panel} aria-labelledby="act-title">
          <div className={styles.panelHead}><h2 id="act-title">Azioni per migliorare</h2><Link className={styles.more} href="/interventi">Tutte →</Link></div>
          {!actions.length ? <p className={styles.empty}>{report ? "L’ultima analisi non indica interventi prioritari. Non dimostra l’assenza di opportunità." : "Gli interventi consigliati compaiono con il primo report."}</p>
            : actions.slice(0, 5).map((a, i) => <div className={styles.act} key={a.id}><span className={styles.n}>{i + 1}</span><div><b>{reportText(a.title)}</b><span className={styles.p}>Pagina: {a.page}</span></div><span className={styles.pill} data-tone={a.priority === "high" ? "red" : "amber"}>{a.priority === "high" ? "Priorità alta" : "Priorità media"}</span></div>)}
        </section>
        <section className={styles.panel} aria-labelledby="how-title">
          <div className={styles.panelHead}><h2 id="how-title">Come funziona il servizio</h2></div>
          <div className={styles.step}><span className={styles.dot} data-off={hasStartup ? undefined : ""} /><div><b>Start-up{hasStartup ? " · fatto" : ""}</b><span>Punto di partenza: Google e Gemini prima degli interventi</span></div></div>
          <div className={styles.step}><span className={styles.dot} data-off="" /><div><b>Report mensile · dal {formatDate(nextMonthly())}</b><span>Automatico, con il confronto sul mese precedente</span></div></div>
          <div className={styles.step}><span className={styles.dot} data-off="" /><div><b>Aggiornamento · quando serve</b><span>Fotografia dall’ultimo report a oggi</span></div></div>
          <div style={{ marginTop: 8 }}>
            {([["Search Console", !!gsc?.lastDate], ["Analytics", !!ga4?.lastDate], ["Gemini", !!gemini?.settings?.enabled]] as const).map(([name, on]) => <div className={styles.src} key={name}><span>{name}</span><b data-off={on ? undefined : ""}>{on ? "Collegato" : "Non attivo"}</b></div>)}
          </div>
        </section>
      </div>
    </section>
  );
}
