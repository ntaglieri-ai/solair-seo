import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Check, Search, ShieldCheck } from "lucide-react";
import { baselineAudit } from "../data/audit-baseline";
import { actionTitle, pageLabel } from "../data/action-plan";
import { readActionPlan } from "../data/read-action-plan";
import { formatDate, formatDayMonth, formatInt, formatPercent } from "../../lib/format";
import { SiteHeader } from "../components/site-header";
import { fontVariables } from "../fonts";
import styles from "./interventi.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Interventi per Solair Group | SolairSEO" };

function issueLabel(issue: string) {
  const images = issue.match(/^(\d+) immagini senza alt/);
  if (images) return `${images[1]} ${images[1] === "1" ? "immagine senza testo alternativo" : "immagini senza testo alternativo"}`;
  return issue.replace(/\s+\(-\d+\)$/, "");
}

function readableText(text: string) {
  return text.replace(/\bpuo'/g, "può").replace(/\bpiu'/g, "più").replace(/\be'/g, "è").replace(/\bgia'/g, "già");
}

export default async function InterventionsPage() {
  const plan = await readActionPlan(baselineAudit.domain);
  return (
    <main className={`${styles.page} ${fontVariables}`}>
      <SiteHeader compact current="/interventi" />
      <div className={styles.content}>
        <Link className={styles.homeLink} href="/"><ArrowLeft size={18} aria-hidden="true" />Home</Link>
        <header className={styles.heading}>
          <div>
            <p className={styles.eyebrow}>Il prossimo passo</p>
            <h1>Le proposte per <span>Solair Group.</span></h1>
            <p className={styles.intro}>{plan.actions.length ? "Dalle evidenze alle possibilità di intervento: cosa proponiamo, perché e quale risultato andremo a verificare." : plan.status === "unavailable" ? "Non è disponibile un piano aggiornato di interventi. Le performance restano consultabili con la loro data di riferimento." : "L'ultima analisi non ha generato proposte di intervento. Questo non equivale a un audit completo né all'assenza di problemi sul sito."}</p>
          </div>
          <Image src="/solair-group.png" alt="Solair Group" width={180} height={72} className={styles.logo} />
        </header>
        {plan.period && <div className={styles.context}><span>Analisi: {formatDayMonth(plan.period.from)} – {formatDate(plan.period.to)}</span><strong>{plan.actions.length} proposte da valutare</strong></div>}
        {plan.status === "partial" && <p className={styles.notice}>Analisi parziale: alcune fonti o verifiche non sono disponibili. Le proposte sotto riportano le evidenze effettivamente raccolte.</p>}
        <div className={styles.proposals}>
          {plan.actions.map((item, index) => {
            const technical = item.kind === "technical";
            const Icon = technical ? ShieldCheck : Search;
            const measuredQuery = typeof item.evidence.impressions === "number" && typeof item.evidence.clicks === "number" && typeof item.evidence.ctr === "number";
            return (
              <article key={item.id} id={`intervento-${index + 1}`} className={styles.proposal}>
                <div className={styles.proposalHeading}>
                  <span className={styles.number}>{String(index + 1).padStart(2, "0")}</span>
                  <span className={technical ? styles.technical : styles.search}><Icon size={18} aria-hidden="true" />{technical ? "Qualità delle pagine" : "Ricerca Google"}</span>
                  <span className={styles.priority}>Priorità {item.priority === "high" ? "alta" : "media"}</span>
                </div>
                <h2>{actionTitle(item)}</h2>
                <p className={styles.target}>{pageLabel(item.page)}{item.query && <> · Ricerca: <strong>{item.query}</strong></>}</p>
                <div className={styles.evidence}>
                  <span className={styles.evidenceLabel}>Da cosa partiamo</span>
                  {measuredQuery ? <div className={styles.queryMetrics}><span><strong>{formatInt(item.evidence.impressions as number)}</strong>impressioni</span><span><strong>{formatInt(item.evidence.clicks as number)}</strong>clic</span><span><strong>{formatPercent(item.evidence.ctr as number)}</strong>CTR</span></div>
                    : Array.isArray(item.evidence.issues) ? <ul>{item.evidence.issues.map((issue) => <li key={String(issue)}><Check size={17} aria-hidden="true" />{issueLabel(String(issue))}</li>)}</ul> : null}
                  <p>{readableText(item.interpretation)}</p>
                </div>
                <div className={styles.proposalBody}>
                  <div><h3>Cosa proponiamo</h3><p>{readableText(item.action)}</p></div>
                  <div className={styles.objective}><h3>Il risultato da verificare</h3><p>{readableText(item.expectedOutcome)}</p></div>
                </div>
              </article>
            );
          })}
        </div>
        {plan.actions.length > 0 && <section className={styles.nextStep}><div><h2>Un piano da definire insieme.</h2><p>Queste proposte non sono ancora approvate o applicate al sito. Priorità, perimetro e incarico vanno concordati prima dell’avvio.</p></div><Link href="/sezioni/performance">Rivedi i risultati <ArrowUpRight size={20} aria-hidden="true" /></Link></section>}
        {plan.status === "unavailable" && <Link className={styles.resultsLink} href="/sezioni/performance">Consulta le performance <ArrowUpRight size={20} aria-hidden="true" /></Link>}
      </div>
    </main>
  );
}
