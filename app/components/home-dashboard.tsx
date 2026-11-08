import Link from "next/link";
import { baselineAudit } from "../data/audit-baseline";
import { readHomePerformance } from "../data/home-performance";
import { readHomeVisibility, type Pillar } from "../data/home-visibility";
import { safeRead } from "../../lib/engine/safe";
import { readReport } from "../../lib/report-read";
import { rankActions, reportText } from "../../lib/report-presentation";
import { getDocumentArchive } from "../../lib/report-documents/store";
import { KIND_LABEL } from "../../lib/report-documents/windows";
import { formatDate, formatInt } from "../../lib/format";
import styles from "./dash.module.css";

const nextMonthly = (now = new Date()) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + (now.getUTCDate() >= 4 ? 1 : 0), 4, 12));
const daysUntil = (date: Date, now = new Date()) => Math.max(0, Math.round((date.getTime() - now.getTime()) / 86_400_000));

/** Tono del pallino/percentuale in base al punteggio: verde ≥80, ambra ≥50, rosso sotto, grigio se non misurato. */
function toneOf(score: number | null) {
  if (score === null) return "grey" as const;
  if (score >= 80) return undefined;
  if (score >= 50) return "amber" as const;
  return "red" as const;
}

function PillarCard({ pillar, detail }: { pillar: Pillar; detail?: string }) {
  const tone = toneOf(pillar.score);
  return (
    <article className={styles.card}>
      <div className={styles.lab}>
        {pillar.label}
        <span className={styles.pill} data-tone={tone}>
          {pillar.score === null ? "Non misurato" : pillar.delta === null || pillar.delta === 0 ? "Stabile" : `${pillar.delta > 0 ? "+" : ""}${pillar.delta}`}
        </span>
      </div>
      <div className={styles.big}>{pillar.score ?? "—"}<small>/100</small></div>
      <p className={styles.cap}>{detail ?? pillar.detail}</p>
      <div className={styles.btns}><Link className={styles.btn} href={pillar.href}>Approfondisci</Link></div>
    </article>
  );
}

/** Vista sul servizio: un punteggio unico in cima, i tre pilastri che lo compongono, un'unica azione da fare adesso. */
export async function HomeDashboard() {
  const siteId = baselineAudit.domain;
  const [perf, visibility, docs, report] = await Promise.all([
    readHomePerformance(siteId),
    readHomeVisibility(siteId),
    safeRead("home report", () => getDocumentArchive(30)),
    safeRead("home interventi", () => readReport()),
  ]);
  const { gsc } = perf;
  const last = docs?.[0];
  const hasStartup = !!docs?.some((d) => d.kind === "startup");
  const actions = rankActions((report?.data.opportunities ?? []).filter((a) => typeof a.action === "string" && typeof a.page === "string"));
  const top = actions[0];
  const next = nextMonthly();
  const days = daysUntil(next);

  const seoPillar = visibility.pillars.find((p) => p.key === "seo")!;
  const geoPillar = visibility.pillars.find((p) => p.key === "geo")!;
  const techPillar = visibility.pillars.find((p) => p.key === "tech")!;
  const seoDetail = gsc?.lastDate ? `${seoPillar.detail} · ${formatInt(gsc.current.clicks)} clic da Google (28 giorni)` : seoPillar.detail;

  return (
    <section id="stato" className={styles.dash} aria-label="Stato del servizio">
      <div className={styles.hero}>
        <div className={styles.heroScore}>
          <span className={styles.heroLab}>Punteggio di visibilità{visibility.partial && <span className={styles.pill} data-tone="grey">Parziale</span>}</span>
          <div className={styles.heroBig}>
            {visibility.score ?? "—"}<small>/100</small>
            {visibility.delta !== null && (
              <span className={styles.heroDelta} data-trend={visibility.delta > 0 ? "up" : visibility.delta < 0 ? "down" : "flat"}>
                {visibility.delta > 0 ? "+" : ""}{visibility.delta} rispetto alle rilevazioni precedenti
              </span>
            )}
          </div>
          <p className={styles.heroCap}>
            {visibility.score === null
              ? "Il punteggio comparirà alla prima raccolta completata tra SEO, visibilità AI e salute tecnica."
              : "Media di SEO su Google, visibilità nelle risposte AI e salute tecnica del sito."}
          </p>
        </div>
        <div className={styles.heroMix} role="img" aria-label="Contributo dei tre indicatori al punteggio">
          {visibility.pillars.map((p) => (
            <div className={styles.mixRow} key={p.key}>
              <b>{p.label}</b>
              <div className={styles.mixTrack}><span style={{ width: `${p.score ?? 0}%` }} data-tone={toneOf(p.score)} /></div>
              <i>{p.score ?? "—"}</i>
            </div>
          ))}
        </div>
        <div className={styles.heroNext}>
          <span className={styles.heroLab}>Prossimo report</span>
          <strong>{formatDate(next)}<small>tra {days} {days === 1 ? "giorno" : "giorni"}</small></strong>
          <span className={styles.cap}>{last ? `Ultimo: ${KIND_LABEL[last.kind]} · ${formatDate(last.createdAt)}` : "Il primo report non è ancora disponibile."}</span>
          <div className={styles.btns}>{last ? <Link className={styles.btn} data-primary href="/report/ultimo">Apri l’ultimo</Link> : <Link className={styles.btn} href="/report">Vai ai report</Link>}</div>
        </div>
      </div>

      <div className={styles.cards}>
        <PillarCard pillar={seoPillar} detail={seoDetail} />
        <PillarCard pillar={geoPillar} />
        <PillarCard pillar={techPillar} />
      </div>

      <div className={styles.lower}>
        <section className={styles.panel} aria-labelledby="act-title">
          <div className={styles.panelHead}><h2 id="act-title">La prossima azione</h2>{actions.length > 1 && <Link className={styles.more} href="/interventi">Tutte le {actions.length} →</Link>}</div>
          {!top ? (
            <p className={styles.empty}>{report ? "L’ultima analisi non indica interventi prioritari. Non dimostra l’assenza di opportunità." : "L’azione prioritaria comparirà con il primo report."}</p>
          ) : (
            <div className={styles.topAction}>
              <span className={styles.pill} data-tone={top.priority === "high" ? "red" : "amber"}>{top.priority === "high" ? "Priorità alta" : "Priorità media"}</span>
              <h3>{reportText(top.title)}</h3>
              <span className={styles.p}>Pagina: {top.page}</span>
              {top.expectedOutcome && <p className={styles.impact}>{reportText(top.expectedOutcome)}</p>}
              {actions.length === 1 && <Link className={styles.more} href="/interventi">Dettagli →</Link>}
            </div>
          )}
        </section>
        <section className={styles.panel} aria-labelledby="how-title">
          <div className={styles.panelHead}><h2 id="how-title">Come funziona il servizio</h2></div>
          <div className={styles.step}><span className={styles.dot} data-off={hasStartup ? undefined : ""} /><div><b>Start-up{hasStartup ? " · fatto" : ""}</b><span>Punto di partenza: Google e Gemini prima degli interventi</span></div></div>
          <div className={styles.step}><span className={styles.dot} data-off="" /><div><b>Report mensile · dal {formatDate(next)}</b><span>Automatico, con il confronto sul mese precedente</span></div></div>
          <div className={styles.step}><span className={styles.dot} data-off="" /><div><b>Aggiornamento · quando serve</b><span>Fotografia dall’ultimo report a oggi</span></div></div>
        </section>
      </div>
    </section>
  );
}
