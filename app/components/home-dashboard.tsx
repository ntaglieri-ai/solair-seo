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

type ActionPriority = "alta" | "media" | "bassa";
type ActionCandidate = { priority: ActionPriority; title: string; meta: string; body?: string; href: string };
const PRIORITY_TONE: Record<ActionPriority, "red" | "amber" | "grey"> = { alta: "red", media: "amber", bassa: "grey" };
const PRIORITY_RANK: Record<ActionPriority, number> = { alta: 0, media: 1, bassa: 2 };

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
  const next = nextMonthly();
  const days = daysUntil(next);

  const seoPillar = visibility.pillars.find((p) => p.key === "seo")!;
  const geoPillar = visibility.pillars.find((p) => p.key === "geo")!;
  const techPillar = visibility.pillars.find((p) => p.key === "tech")!;
  const seoDetail = gsc?.lastDate ? `${seoPillar.detail} · ${formatInt(gsc.current.clicks)} clic da Google (28 giorni)` : seoPillar.detail;

  // Un'unica azione "in evidenza" dà l'impressione di aver già fatto la triage, ma con più interventi reali
  // (SEO + eventuale gap sulla Visibilità AI) mostrarne una sola e basta non è onesto sulla quantità di lavoro:
  // qui mescoliamo i due mondi in un'unica classifica per priorità e teniamo visibili anche i prossimi 2.
  const geoTone = toneOf(geoPillar.score);
  const geoAction = visibility.geoAction;
  const seoCandidates: ActionCandidate[] = actions.map((a) => ({
    priority: a.priority === "high" ? "alta" : "media",
    title: reportText(a.title),
    meta: `Pagina: ${a.page}`,
    body: a.expectedOutcome ? reportText(a.expectedOutcome) : undefined,
    href: "/interventi",
  }));
  const geoCandidate: ActionCandidate | null = geoAction
    ? {
        priority: geoTone === "red" ? "alta" : geoTone === "amber" ? "media" : "bassa",
        title: reportText(geoAction.title),
        meta: "Ambito: Visibilità AI",
        body: geoAction.evidence.length ? reportText(geoAction.evidence.join(" ")) : undefined,
        href: "/visibilita-ai",
      }
    : null;
  const candidates = (geoCandidate ? [...seoCandidates, geoCandidate] : seoCandidates).sort(
    (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
  );
  const [spotlight, ...rest] = candidates;
  const nextActions = rest.slice(0, 2);
  const remainingActions = candidates.length - 1 - nextActions.length;

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
          <div className={styles.panelHead}><h2 id="act-title">La prossima azione</h2></div>
          {!spotlight ? (
            <p className={styles.empty}>{report ? "L’ultima analisi non indica interventi prioritari. Non dimostra l’assenza di opportunità." : "L’azione prioritaria comparirà con il primo report."}</p>
          ) : (
            <div className={styles.actionStack}>
              <div className={styles.topAction}>
                <span className={styles.pill} data-tone={PRIORITY_TONE[spotlight.priority]}>Priorità {spotlight.priority}</span>
                <h3>{spotlight.title}</h3>
                <span className={styles.p}>{spotlight.meta}</span>
                {spotlight.body && <p className={styles.impact}>{spotlight.body}</p>}
                <Link className={styles.more} href={spotlight.href}>Dettagli →</Link>
              </div>
              {!!nextActions.length && (
                <ul className={styles.nextList}>
                  {nextActions.map((a, i) => (
                    <li className={styles.nextItem} key={i}>
                      <span className={styles.miniDot} data-tone={PRIORITY_TONE[a.priority]} />
                      <Link href={a.href}>{a.title}</Link>
                    </li>
                  ))}
                  {remainingActions > 0 && (
                    <li className={styles.nextMore}><Link href="/interventi">+{remainingActions} altre nel report →</Link></li>
                  )}
                </ul>
              )}
            </div>
          )}
        </section>
        <section className={styles.panel} aria-labelledby="how-title">
          <div className={styles.panelHead}><h2 id="how-title">Come funziona il servizio</h2></div>
          <div className={styles.step}><span className={styles.dot} /><div><b>Raccogliamo i dati</b><span>Search Console, Analytics e risposte di Gemini, in automatico ogni giorno</span></div></div>
          <div className={styles.step}><span className={styles.dot} data-off={hasStartup ? undefined : ""} /><div><b>Analizziamo e assegniamo un punteggio{hasStartup ? " · fatto" : ""}</b><span>È da qui che nascono il punteggio e l’azione prioritaria qui sopra</span></div></div>
          <div className={styles.step}><span className={styles.dot} data-off="" /><div><b>Tu decidi, MosTag esegue</b><span>Report automatico ogni mese (prossimo: {formatDate(next)}); le azioni approvate le implementiamo noi</span></div></div>
        </section>
      </div>
    </section>
  );
}
